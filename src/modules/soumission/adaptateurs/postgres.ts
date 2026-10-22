import type { PoolClient } from 'pg'
import { getPool, withUserScope, withClientUserScope } from '../../../lib/db'
import { ErreurSoumission } from '../ports'
import { montantCanonique } from '../empreinte'
import type { DemandeStore, NoteSoumise, StatutNote } from '../ports'

type Ligne = Record<string, unknown>

function enNote(ligne: Ligne): NoteSoumise {
  return {
    id: ligne.id as string,
    userId: ligne.user_id as string,
    amount: ligne.amount as string,
    expenseDate: ligne.expense_date as string,
    description: ligne.description as string,
    receiptKey: ligne.receipt_key as string,
    status: ligne.status as StatutNote,
    createdAt: new Date(ligne.created_at as string).toISOString(),
    requestKey: ligne.request_key as string,
    empreinte: ligne.request_fingerprint as string,
    recuSha256: ligne.receipt_sha256 as string,
    recuTaille: ligne.receipt_size as number,
  }
}

/**
 * Adaptateur PostgreSQL : chaque opération est une transaction courte posée sous
 * l'identité du propriétaire (RLS) ; aucune transaction ne reste ouverte pendant
 * un envoi vers le stockage.
 */
export function creerDemandeStorePostgres(connexion?: PoolClient): DemandeStore {
  const scope = <T>(acteur: string, fn: (client: PoolClient) => Promise<T>) =>
    connexion ? withClientUserScope(acteur, connexion, fn) : withUserScope(acteur, fn)
  return {
    async executer(acteurId, cle, operation) {
      const client = await getPool().connect()
      const verrou = `${acteurId}:${cle}`
      let pris = false
      try {
        const result = await client.query('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS pris', [verrou])
        pris = result.rows[0].pris
        if (!pris) throw new ErreurSoumission('DEMANDE_EN_COURS')
        return await operation(creerDemandeStorePostgres(client))
      } finally {
        // Une connexion qui ne peut confirmer le déverrouillage est détruite,
        // jamais rendue au pool avec un verrou de session encore actif.
        let detruire = false
        if (pris) {
          try { await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [verrou]) }
          catch { detruire = true }
        }
        client.release(detruire)
      }
    },
    async reserver(demande) {
      return scope(demande.acteurId, async (client) => {
        const existante = await client.query(
          'SELECT * FROM expense_notes WHERE user_id = $1 AND request_key = $2',
          [demande.acteurId, demande.cle]
        )
        if (existante.rows[0]) return { note: enNote(existante.rows[0]), creee: false }
        if (!demande.recu) return null

        const inseree = await client.query(
          `INSERT INTO expense_notes
             (user_id, amount, expense_date, description, receipt_key, status,
              request_key, request_fingerprint, receipt_sha256, receipt_size, request_amount)
           VALUES ($1, $2, $3, $4, '', 'incomplete', $5, $6, $7, $8, $9)
           ON CONFLICT (user_id, request_key) DO NOTHING
           RETURNING *`,
          [
            demande.acteurId,
            demande.champs.montant,
            demande.champs.date,
            demande.champs.description,
            demande.cle,
            demande.empreinte,
            demande.recu.sha256,
            demande.recu.taille,
            montantCanonique(demande.champs.montant),
          ]
        )
        if (!inseree.rows[0]) {
          // Une réservation concurrente de la même demande a gagné : on la relit.
          const gagnante = await client.query(
            'SELECT * FROM expense_notes WHERE user_id = $1 AND request_key = $2',
            [demande.acteurId, demande.cle]
          )
          return { note: enNote(gagnante.rows[0]), creee: false }
        }

        const cle = demande.clePrevue(inseree.rows[0].receipt_seq, demande.recu.extension)
        const mise = await client.query(
          'UPDATE expense_notes SET receipt_key = $1 WHERE id = $2 RETURNING *',
          [cle, inseree.rows[0].id]
        )
        return { note: enNote(mise.rows[0]), creee: true }
      })
    },

    async prendre(note, jeton, dureeSecondes) {
      return scope(note.userId, async (client) => {
        const result = await client.query(
          `UPDATE expense_notes
              SET claim_token = $3, claim_expires_at = now() + make_interval(secs => $4)
            WHERE id = $1 AND user_id = $2 AND status = 'incomplete'
              AND (claim_token IS NULL OR claim_expires_at < now())
            RETURNING id`,
          [note.id, note.userId, jeton, dureeSecondes]
        )
        return result.rowCount === 1
      })
    },

    async finaliser(note, jeton) {
      return scope(note.userId, async (client) => {
        const result = await client.query(
          `UPDATE expense_notes
              SET status = 'pending', claim_token = NULL, claim_expires_at = NULL
            WHERE id = $1 AND user_id = $2 AND status = 'incomplete' AND claim_token = $3
            RETURNING *`,
          [note.id, note.userId, jeton]
        )
        return result.rows[0] ? enNote(result.rows[0]) : null
      })
    },

    async liberer(note, jeton) {
      await scope(note.userId, async (client) => {
        await client.query(
          `UPDATE expense_notes SET claim_token = NULL, claim_expires_at = NULL
            WHERE id = $1 AND user_id = $2 AND status = 'incomplete' AND claim_token = $3`,
          [note.id, note.userId, jeton]
        )
      })
    },

    async relire(acteurId, cle) {
      return scope(acteurId, async (client) => {
        const result = await client.query(
          'SELECT * FROM expense_notes WHERE user_id = $1 AND request_key = $2',
          [acteurId, cle]
        )
        return result.rows[0] ? enNote(result.rows[0]) : null
      })
    },
  }
}
