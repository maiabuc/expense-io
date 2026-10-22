// Adaptateurs de test du module de soumission : mêmes contrats que PostgreSQL et S3,
// avec injection de pannes. Ils ne remplacent pas les essais d'intégration réels.
import { empreinteRecu } from '../../src/modules/soumission/empreinte'
import { ErreurSoumission } from '../../src/modules/soumission/ports'
import type {
  DemandeStore, EtatRecuStocke, NoteSoumise, RecuStore, TypeRecu,
} from '../../src/modules/soumission/ports'

interface Ligne { note: NoteSoumise; jeton: string | null; expire: number }

export function creerMemoire() {
  const lignes = new Map<string, Ligne>()
  const objets = new Map<string, { octets: Uint8Array; type: TypeRecu }>()
  const etat = {
    maintenant: 0, compteur: 0, depots: 0, ecritures: 0,
    panneDepot: 0, panneDepotApresEcriture: 0, panneFinalisation: 0, panneFinalisationApresCommit: 0,
    attenteDepot: null as null | Promise<void>, depotCommence: null as null | (() => void),
  }
  const cle = (acteur: string, demande: string) => `${acteur}:${demande}`

  const actifs = new Set<string>()
  const demandes: DemandeStore = {
    async executer(acteur, demande, operation) {
      const id = cle(acteur, demande)
      if (actifs.has(id)) throw new ErreurSoumission('DEMANDE_EN_COURS')
      actifs.add(id)
      try { return await operation(demandes) } finally { actifs.delete(id) }
    },
    async reserver(demande) {
      const existante = lignes.get(cle(demande.acteurId, demande.cle))
      if (existante) return { note: { ...existante.note }, creee: false }
      if (!demande.recu) return null
      const compteur = ++etat.compteur
      const note: NoteSoumise = {
        id: `note-${compteur}`, userId: demande.acteurId, amount: demande.champs.montant,
        expenseDate: demande.champs.date, description: demande.champs.description,
        receiptKey: demande.clePrevue(compteur, demande.recu.extension), status: 'incomplete',
        createdAt: new Date(0).toISOString(), requestKey: demande.cle, empreinte: demande.empreinte,
        recuSha256: demande.recu.sha256, recuTaille: demande.recu.taille,
      }
      lignes.set(cle(demande.acteurId, demande.cle), { note, jeton: null, expire: 0 })
      return { note: { ...note }, creee: true }
    },
    async prendre(note, jeton, duree) {
      const ligne = lignes.get(cle(note.userId, note.requestKey))!
      if (ligne.note.status !== 'incomplete' || (ligne.jeton !== null && ligne.expire >= etat.maintenant)) return false
      ligne.jeton = jeton; ligne.expire = etat.maintenant + duree
      return true
    },
    async finaliser(note, jeton) {
      if (etat.panneFinalisation > 0) { etat.panneFinalisation--; throw new Error('panne base avant écriture') }
      const ligne = lignes.get(cle(note.userId, note.requestKey))!
      if (ligne.note.status !== 'incomplete' || ligne.jeton !== jeton) return null
      ligne.note = { ...ligne.note, status: 'pending' }; ligne.jeton = null; etat.ecritures++
      if (etat.panneFinalisationApresCommit > 0) { etat.panneFinalisationApresCommit--; throw new Error('connexion perdue après commit') }
      return { ...ligne.note }
    },
    async liberer(note, jeton) {
      const ligne = lignes.get(cle(note.userId, note.requestKey))!
      if (ligne.jeton === jeton) ligne.jeton = null
    },
    async relire(acteur, demande) {
      const ligne = lignes.get(cle(acteur, demande))
      return ligne ? { ...ligne.note } : null
    },
  }

  const recus: RecuStore = {
    async verifier(cleObjet, attendu): Promise<EtatRecuStocke> {
      const objet = objets.get(cleObjet)
      if (!objet) return 'absent'
      return objet.octets.byteLength === attendu.taille && empreinteRecu(objet.octets) === attendu.sha256 ? 'conforme' : 'different'
    },
    async deposer(cleObjet, octets, type) {
      etat.depots++
      etat.depotCommence?.()
      if (etat.attenteDepot) await etat.attenteDepot
      if (etat.panneDepot > 0) { etat.panneDepot--; throw new Error('panne stockage avant écriture') }
      objets.set(cleObjet, { octets, type })
      if (etat.panneDepotApresEcriture > 0) { etat.panneDepotApresEcriture--; throw new Error('délai dépassé après écriture') }
    },
  }

  return { lignes, objets, etat, demandes, recus,
    deps: { demandes, recus, clePrevue: (c: number, e: string) => `receipts/${c}${e}` } }
}
