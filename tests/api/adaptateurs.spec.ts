import { test, expect } from '../support/fixtures'
import { users } from '../support/data'
import { db } from '../support/database'
import { testEnvironment } from '../support/environment'
import { viderRecus } from '../support/storage'
import { empreinteContenu, empreinteRecu } from '../../src/modules/soumission/empreinte'
import type { ReservationDemande } from '../../src/modules/soumission/ports'

// Contrat des adaptateurs réels (PostgreSQL sous le compte applicatif limité, S3 LocalStack), chargés
// directement : les mêmes garanties que les adaptateurs en mémoire des essais unitaires.
async function reels() {
  const avant = process.env.DATABASE_URL
  process.env.DATABASE_URL = testEnvironment().appDatabaseURL
  try {
    const { getPool } = await import('../../src/lib/db')
    getPool() // le pool est créé ici, avec le compte applicatif
    const { creerDemandeStorePostgres } = await import('../../src/modules/soumission/adaptateurs/postgres')
    const { creerRecuStoreS3 } = await import('../../src/modules/soumission/adaptateurs/s3')
    return { demandes: creerDemandeStorePostgres(), recus: creerRecuStoreS3() }
  } finally { process.env.DATABASE_URL = avant }
}
const OCTETS = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const champs = { montant: '15.5', date: '2026-10-01', description: 'Contrat adaptateur CI' }
const reservation = (cle: string): ReservationDemande => ({
  acteurId: users.a_employee.id, cle, champs, empreinte: empreinteContenu(champs),
  recu: { sha256: empreinteRecu(OCTETS), taille: OCTETS.byteLength, type: 'image/png', extension: '.png' },
  clePrevue: (compteur, extension) => `receipts/${compteur}${extension}`,
})
const CLE = 'dddddddd-0000-4000-8000-000000000001'

test('[AUD-003][SOUM-120][correction] adaptateur PostgreSQL : réservation unique, exécution exclusive, finalisation par jeton', async () => {
  const { demandes } = await reels()
  expect(await demandes.reserver({ ...reservation(CLE), recu: null })).toBeNull()
  const creee = (await demandes.reserver(reservation(CLE)))!
  expect(creee.creee).toBe(true)
  expect(creee.note).toMatchObject({ status: 'incomplete', userId: users.a_employee.id, requestKey: CLE, amount: '15.50' })
  expect(creee.note.receiptKey).toMatch(/^receipts\/\d+\.png$/)
  const relue = (await demandes.reserver({ ...reservation(CLE), recu: null }))!
  expect(relue).toMatchObject({ creee: false, note: { id: creee.note.id } })
  const prises = await Promise.all(['jeton-a', 'jeton-b', 'jeton-c'].map(j => demandes.prendre(creee.note, j.replace('jeton-', '00000000-0000-4000-8000-00000000000'), 60)))
  expect(prises.filter(Boolean)).toHaveLength(1)
  const gagnant = (await db().query('SELECT claim_token FROM expense_notes WHERE id=$1', [creee.note.id])).rows[0].claim_token as string
  expect(await demandes.finaliser(creee.note, '99999999-0000-4000-8000-000000000009')).toBeNull()
  expect((await demandes.relire(users.a_employee.id, CLE))!.status).toBe('incomplete')
  expect((await demandes.finaliser(creee.note, gagnant))!.status).toBe('pending')
  expect(await demandes.prendre(creee.note, gagnant, 60)).toBe(false)
  await demandes.liberer(creee.note, gagnant) // sans effet sur une note finalisée
  expect((await demandes.relire(users.a_employee.id, CLE))!.status).toBe('pending')
})

test('[AUD-003][SOUM-121][correction] adaptateur PostgreSQL : huit réservations simultanées de la même demande donnent une seule note', async () => {
  const { demandes } = await reels()
  const resultats = await Promise.all(Array.from({ length: 8 }, () => demandes.reserver(reservation(CLE))))
  expect(resultats.filter(r => r!.creee)).toHaveLength(1)
  expect(new Set(resultats.map(r => r!.note.id)).size).toBe(1)
  expect((await db().query('SELECT id FROM expense_notes WHERE request_key=$1', [CLE])).rowCount).toBe(1)
})

test('[AUD-003][SOUM-122][correction] adaptateur PostgreSQL : un autre propriétaire ne peut ni prendre ni finaliser la demande', async () => {
  const { demandes } = await reels()
  const note = (await demandes.reserver(reservation(CLE)))!.note
  const etrangere = { ...note, userId: users.b_employee.id }
  expect(await demandes.prendre(etrangere, '00000000-0000-4000-8000-000000000001', 60)).toBe(false)
  expect(await demandes.finaliser(etrangere, '00000000-0000-4000-8000-000000000001')).toBeNull()
  expect(await demandes.relire(users.b_employee.id, CLE)).toBeNull()
  expect((await db().query('SELECT status, claim_token FROM expense_notes WHERE id=$1', [note.id])).rows[0]).toEqual({ status: 'incomplete', claim_token: null })
})

test('[AUD-003][SOUM-123][correction] adaptateur S3 : absent, conforme, taille ou empreinte différente', async () => {
  const { recus } = await reels()
  await viderRecus()
  const attendu = { sha256: empreinteRecu(OCTETS), taille: OCTETS.byteLength }
  expect(await recus.verifier('receipts/777.png', attendu)).toBe('absent')
  await recus.deposer('receipts/777.png', OCTETS, 'image/png')
  expect(await recus.verifier('receipts/777.png', attendu)).toBe('conforme')
  expect(await recus.verifier('receipts/777.png', { ...attendu, taille: attendu.taille + 1 })).toBe('different')
  expect(await recus.verifier('receipts/777.png', { ...attendu, sha256: empreinteRecu(new Uint8Array([1])) })).toBe('different')
  await recus.deposer('receipts/777.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9]), 'image/png')
  expect(await recus.verifier('receipts/777.png', attendu)).toBe('different')
})

test('[AUD-003][SOUM-124][correction] exclusion PostgreSQL conservée pendant un dépôt, sans transaction longue', async () => {
  const { demandes } = await reels()
  let fin!: () => void
  const attente = new Promise<void>(resolve => { fin = resolve })
  let signal!: () => void
  const debut = new Promise<void>(resolve => { signal = resolve })
  const premiere = demandes.executer(users.a_employee.id, CLE, async store => {
    const note = (await store.reserver(reservation(CLE)))!.note
    await store.prendre(note, '00000000-0000-4000-8000-000000000001', 1)
    signal()
    await attente
  })
  try {
    await debut
    await db().query("UPDATE expense_notes SET claim_expires_at=now()-interval '1 second' WHERE request_key=$1", [CLE])
    await expect(demandes.executer(users.a_employee.id, CLE, async () => 'interdit')).rejects.toMatchObject({ code: 'DEMANDE_EN_COURS' })
    const activite = await db().query("SELECT state FROM pg_stat_activity WHERE query LIKE 'SELECT pg_try_advisory_lock(hashtextextended%' AND pid <> pg_backend_pid()")
    expect(activite.rows.some(row => row.state === 'idle in transaction')).toBe(false)
  } finally { fin(); await premiere }
  await expect(demandes.executer(users.a_employee.id, CLE, async () => 'reprise')).resolves.toBe('reprise')
})

test('[AUD-003][SOUM-125][correction] une ancienne version S3 ne peut écraser le reçu d’un traitement plus récent', async () => {
  const { creerRecuStoreS3 } = await import('../../src/modules/soumission/adaptateurs/s3')
  const ancien = creerRecuStoreS3(), recent = creerRecuStoreS3()
  const cle = 'receipts/778.png'
  const attendu = { sha256: empreinteRecu(OCTETS), taille: OCTETS.byteLength }
  expect(await ancien.verifier(cle, attendu)).toBe('absent')
  await recent.deposer(cle, OCTETS, 'image/png')
  await expect(ancien.deposer(cle, new Uint8Array([9]), 'image/png'), 'Création conditionnelle').rejects.toMatchObject({ $metadata: { httpStatusCode: 412 } })
  expect(await recent.verifier(cle, attendu)).toBe('conforme')
  // Réparation d'une version différente, puis autre réparation concurrente : comparaison d'ETag.
  await recent.deposer(cle, new Uint8Array([1, 2]), 'image/png')
  expect(await ancien.verifier(cle, attendu)).toBe('different')
  await recent.deposer(cle, OCTETS, 'image/png')
  await expect(ancien.deposer(cle, new Uint8Array([3]), 'image/png'), 'Remplacement conditionnel').rejects.toMatchObject({ $metadata: { httpStatusCode: 412 } })
  expect(await recent.verifier(cle, attendu)).toBe('conforme')
})
