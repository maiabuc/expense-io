import { readFile } from 'node:fs/promises'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import type { APIRequestContext } from '@playwright/test'
import { test, expect, authenticate } from '../support/fixtures'
import { users, notes } from '../support/data'
import { db } from '../support/database'
import { withMissingBucket } from '../support/failure-server'
import { objectCount, storage, viderRecus } from '../support/storage'
import { testEnvironment } from '../support/environment'
import { empreinteContenu, empreinteRecu } from '../../src/modules/soumission/empreinte'

const CLE = 'aaaaaaaa-0000-4000-8000-000000000001'
const CLE_2 = 'aaaaaaaa-0000-4000-8000-000000000002'
const CHAMPS = { amount: '15.50', expenseDate: '2026-10-01', description: 'Soumission reprise CI' }

interface OptionsEnvoi { base?: string; cle?: string | null; champs?: Record<string, string>; fichier?: string | null; mime?: string }
async function envoyer(request: APIRequestContext, options: OptionsEnvoi = {}) {
  const { base = '', cle = CLE, champs = {}, fichier = 'receipt.png', mime = 'image/png' } = options
  return request.post(`${base}/api/expense-notes`, {
    headers: cle ? { 'Idempotency-Key': cle } : {},
    multipart: { ...CHAMPS, ...champs, ...(fichier ? { receipt: { name: fichier, mimeType: mime, buffer: await readFile(`tests/fixtures/${fichier}`) } } : {}) },
  })
}
const lignes = async (cle = CLE) => (await db().query('SELECT * FROM expense_notes WHERE request_key=$1', [cle])).rows

// Note incomplete préparée en base, comme après une panne : clé prévue, empreintes, réservation facultative.
async function prepareIncomplete(options: { reservation?: 'active' | 'expiree'; objet?: Buffer | null } = {}) {
  await viderRecus()
  const fichier = await readFile('tests/fixtures/receipt.png')
  const cle = 'receipts/9001.png'
  const inserted = await db().query(`INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key, status,
      request_key, request_fingerprint, receipt_sha256, receipt_size, claim_token, claim_expires_at)
    VALUES ($1, 15.5, '2026-10-01', $2, $3, 'incomplete', $4, $5, $6, $7, $8, $9) RETURNING id`,
  [users.a_employee.id, CHAMPS.description, cle, CLE, empreinteContenu({ montant: '15.50', date: CHAMPS.expenseDate, description: CHAMPS.description }),
    empreinteRecu(fichier), fichier.byteLength,
    options.reservation ? 'bbbbbbbb-0000-4000-8000-000000000001' : null,
    options.reservation === 'active' ? new Date(Date.now() + 600_000) : options.reservation === 'expiree' ? new Date(Date.now() - 1000) : null])
  if (options.objet !== null) {
    const client = storage()
    await client.send(new PutObjectCommand({ Bucket: testEnvironment().bucket, Key: cle, Body: options.objet ?? fichier, ContentType: 'image/png' }))
    client.destroy()
  }
  return { id: inserted.rows[0].id as string, cle }
}

test('[AUD-003][SOUM-100][correction] même clé répétée : 201 puis 200 sur la même note, sans doublon ni nouvel objet', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const premiere = await envoyer(request)
  expect(premiere.status()).toBe(201)
  const note = await premiere.json()
  expect(note).toMatchObject({ userId: users.a_employee.id, amount: 15.5, status: 'pending', description: CHAMPS.description })
  expect(note).not.toHaveProperty('requestId')
  const objets = await objectCount()
  const repetition = await envoyer(request)
  expect(repetition.status()).toBe(200)
  expect(await repetition.json()).toEqual(note)
  expect((await lignes()).length).toBe(1)
  expect(await objectCount()).toBe(objets)
})

test('[AUD-003][SOUM-101][reference] client historique sans clé : chaque envoi reste une demande distincte en 201', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const a = await envoyer(request, { cle: null }); const b = await envoyer(request, { cle: null })
  expect([a.status(), b.status()]).toEqual([201, 201])
  expect((await a.json()).id).not.toBe((await b.json()).id)
})

test('[AUD-003][SOUM-102][correction] nouvelle clé avec le même contenu : seconde dépense distincte', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const a = await envoyer(request); const b = await envoyer(request, { cle: CLE_2 })
  expect([a.status(), b.status()]).toEqual([201, 201])
  expect((await a.json()).id).not.toBe((await b.json()).id)
})

test('[AUD-003][SOUM-103][correction] même clé avec montant, description ou reçu différent : 409 sans modification', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const note = await (await envoyer(request)).json()
  const objets = await objectCount()
  const variantes: OptionsEnvoi[] = [{ champs: { amount: '15.51' } }, { champs: { description: 'Autre dépense' } }, { champs: { amount: '15,5' }, fichier: 'receipt.jpg', mime: 'image/jpeg' }]
  for (const variante of variantes) {
    const response = await envoyer(request, variante)
    expect.soft(response.status(), JSON.stringify(variante)).toBe(409)
    expect((await response.json()).error).toBe('Cette demande existe déjà avec un contenu différent.')
  }
  expect((await lignes()).map(l => ({ id: l.id, status: l.status, amount: l.amount }))).toEqual([{ id: note.id, status: 'pending', amount: '15.50' }])
  expect(await objectCount()).toBe(objets)
  // Contrôle positif : la même valeur écrite autrement (15,5 = 15.50) reste la même demande.
  expect((await envoyer(request, { champs: { amount: '15,5' } })).status()).toBe(200)
})

test('[AUD-003][SOUM-104][correction] clé de demande invalide : 400 sans écriture', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await envoyer(request, { cle: 'pas-un-uuid' })
  expect(response.status()).toBe(400)
  expect((await response.json()).error).toBe("L'en-tête Idempotency-Key doit être un UUID.")
  expect((await db().query("SELECT id FROM expense_notes WHERE description=$1", [CHAMPS.description])).rowCount).toBe(0)
})

test('[AUD-003][SOUM-105][correction] panne de stockage : note incomplete conservée, non décidable, reprise sur la même note', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const objets = await objectCount()
  let incomplete!: { id: string; receipt_key: string }
  await withMissingBucket(async (base) => {
    const response = await envoyer(request, { base })
    expect(response.status()).toBe(500)
    expect((await response.json()).error).toBe("La soumission n'a pas pu être terminée. Veuillez la reprendre.")
    const rows = await lignes()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'incomplete', claim_token: null })
    expect(rows[0].receipt_key).toMatch(/^receipts\/\d+\.png$/)
    incomplete = rows[0]
  })
  expect(await objectCount()).toBe(objets)
  // L'historique du propriétaire expose la clé de reprise, et lui seul.
  const list = await (await request.get('/api/expense-notes')).json()
  expect(list.find((n: { id: string }) => n.id === incomplete.id)).toMatchObject({ status: 'incomplete', requestId: CLE })
  expect(list.filter((n: { status: string; requestId?: string }) => n.status !== 'incomplete' && 'requestId' in n)).toEqual([])
  expect((await request.get(`/api/expense-notes/${incomplete.id}/receipt-url`)).status()).toBe(404)
  // Une soumission incomplète n'est ni listée ni décidable par le manager.
  await db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.a_root.id, users.a_employee.id])
  await authenticate(request, 'a_root')
  expect((await (await request.get('/api/manager/expense-notes')).json()).map((n: { id: string }) => n.id)).not.toContain(incomplete.id)
  expect((await request.post(`/api/manager/expense-notes/${incomplete.id}/approve`)).status()).toBe(409)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [incomplete.id])).rows[0].status).toBe('incomplete')
  // Reprise explicite avec la même clé : même note, finalisée, reçu lisible.
  await authenticate(request, 'a_employee')
  const reprise = await envoyer(request)
  expect(reprise.status()).toBe(201)
  expect((await reprise.json()).id).toBe(incomplete.id)
  expect((await lignes())).toHaveLength(1)
  const recu = await request.get(`/api/expense-notes/${incomplete.id}/receipt-url`)
  expect(recu.status()).toBe(200)
  expect((await request.get((await recu.json()).url)).status()).toBe(200)
})

test('[AUD-003][SOUM-106][correction] objet déjà stocké et vérifié, finalisation manquante : reprise sans fichier en 201', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const { id } = await prepareIncomplete()
  const response = await envoyer(request, { fichier: null })
  expect(response.status()).toBe(201)
  expect((await response.json())).toMatchObject({ id, status: 'pending' })
  expect((await lignes())[0]).toMatchObject({ status: 'pending', claim_token: null })
})

test('[AUD-003][SOUM-107][correction] reçu absent ou différent sans fichier : 400 et note conservée ; avec fichier : objet remplacé', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const { id } = await prepareIncomplete({ objet: null })
  const sansObjet = await envoyer(request, { fichier: null })
  expect(sansObjet.status()).toBe(400)
  expect((await sansObjet.json()).error).toBe('Le reçu est requis : fournissez le fichier à nouveau.')
  await prepareIncompleteObject('receipts/9001.png', await readFile('tests/fixtures/corrupt.png'))
  expect((await envoyer(request, { fichier: null })).status()).toBe(400)
  expect((await lignes())[0]).toMatchObject({ id, status: 'incomplete', claim_token: null })
  const avecFichier = await envoyer(request)
  expect(avecFichier.status()).toBe(201)
  expect((await lignes())[0].status).toBe('pending')
})
async function prepareIncompleteObject(cle: string, corps: Buffer) {
  const client = storage()
  await client.send(new PutObjectCommand({ Bucket: testEnvironment().bucket, Key: cle, Body: corps, ContentType: 'image/png' }))
  client.destroy()
}

test('[AUD-003][SOUM-108][correction] réservation active : 409 sans envoi ; réservation expirée : reprise réussie', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const { id } = await prepareIncomplete({ reservation: 'active', objet: null })
  const objets = await objectCount()
  const refus = await envoyer(request)
  expect(refus.status()).toBe(409)
  expect((await refus.json()).error).toBe('Cette demande est en cours de traitement. Veuillez réessayer.')
  expect(await objectCount()).toBe(objets)
  expect((await lignes())[0]).toMatchObject({ id, status: 'incomplete', claim_token: 'bbbbbbbb-0000-4000-8000-000000000001' })
  await db().query("UPDATE expense_notes SET claim_expires_at = now() - interval '1 second' WHERE id=$1", [id])
  const reprise = await envoyer(request)
  expect(reprise.status()).toBe(201)
  expect((await lignes())[0]).toMatchObject({ status: 'pending', claim_token: null })
})

test('[AUD-003][SOUM-109][correction] deux envois simultanés de la même demande : une seule finalisation, une seule note', async ({ request }) => {
  await authenticate(request, 'a_employee')
  await viderRecus()
  const objets = await objectCount()
  const responses = await Promise.all([envoyer(request), envoyer(request)])
  const statuts = responses.map(r => r.status()).sort()
  expect(statuts.filter(s => s === 201)).toHaveLength(1)
  expect([[201, 200], [201, 409]].some(attendu => JSON.stringify(attendu.slice().sort()) === JSON.stringify(statuts))).toBe(true)
  const rows = await lignes()
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ status: 'pending', claim_token: null })
  expect(await objectCount()).toBe(objets + 1)
})

test('[AUD-003][SOUM-110][correction] note déjà approuvée : la répétition rend 200 avec la décision, sans remise en pending', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const note = await (await envoyer(request)).json()
  await db().query("UPDATE expense_notes SET status='approved' WHERE id=$1", [note.id])
  const repetition = await envoyer(request)
  expect(repetition.status()).toBe(200)
  expect((await repetition.json()).status).toBe('approved')
  expect((await lignes())[0].status).toBe('approved')
})

test('[AUD-003][SOUM-111][correction] la clé seule ne donne aucun droit : un autre compte avec la même clé crée sa propre note', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const a = await (await envoyer(request)).json()
  await authenticate(request, 'b_employee')
  const reponse = await envoyer(request)
  expect(reponse.status()).toBe(201)
  const b = await reponse.json()
  expect(b.id).not.toBe(a.id)
  expect(b.userId).toBe(users.b_employee.id)
  expect((await lignes())).toHaveLength(2)
})

test('[AUD-003][SOUM-112][reference] contrôle des entrées conservé avec une clé : reçu absent d’une demande inconnue, montant, date, format', async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await envoyer(request, { fichier: null })).status()).toBe(400)
  expect((await lignes())).toHaveLength(0)
  expect((await envoyer(request, { champs: { amount: '12abc' } })).status()).toBe(400)
  expect((await envoyer(request, { champs: { expenseDate: '2999-01-01' } })).status()).toBe(400)
  expect((await envoyer(request, { cle: null, fichier: null })).status()).toBe(400)
  expect(notes.employee).toBeTruthy()
})
