import { test, expect, authenticate, submit, ownNotes } from '../support/fixtures'
import { notes, users, absent } from '../support/data'
import { readFile } from 'node:fs/promises'
import { db } from '../support/database'
import { objectCount } from '../support/storage'

test("[AUD-003][NOTE-001][reference] création persistée et visible dans la liste", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await submit(request)
  expect(response.status()).toBe(201)
  const body = await response.json()
  expect(body).toMatchObject({ userId: users.a_employee.id, amount: 15.5, expenseDate: '2026-10-01', description: 'Soumission CI', status: 'pending' })
  expect(typeof body.createdAt).toBe('string')
  expect((await ownNotes(request)).find(n => n.id === body.id)).toMatchObject(body)
  const receipt = await request.get(`/api/expense-notes/${body.id}/receipt-url`)
  expect(receipt.status()).toBe(200)
  const object = await request.get((await receipt.json()).url)
  expect(object.status()).toBe(200)
  expect((await object.body()).length).toBeGreaterThan(0)
})

test("[G14][NOTE-002][reference] dépôt légitime image/png", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await submit(request, {}, 'receipt.png', 'image/png')).status()).toBe(201)
})

test("[G14][NOTE-003][reference] dépôt légitime image/jpeg", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await submit(request, {}, 'receipt.jpg', 'image/jpeg')).status()).toBe(201)
})

test("[G14][NOTE-004][reference] dépôt légitime image/webp", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await submit(request, {}, 'receipt.webp', 'image/webp')).status()).toBe(201)
})

test("[G14][NOTE-005][reference] dépôt légitime application/pdf", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await submit(request, {}, 'receipt.pdf', 'application/pdf')).status()).toBe(201)
})

test("[AUD-014][NOTE-006][reference] montant zéro refusé sans note", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect((await submit(request, { amount: '0' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-007][correction] montant invalide 12abc refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: '12abc' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-008][correction] montant invalide 1.2.3 refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: '1.2.3' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-009][correction] montant invalide 1,2,3 refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: '1,2,3' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-010][correction] montant invalide 1,2.3 refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: '1,2.3' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-011][correction] montant invalide NaN refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: 'NaN' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-012][correction] montant invalide Infinity refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: 'Infinity' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-013][correction] montant invalide -1 refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: '-1' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-014][NOTE-014][correction] virgule décimale équivalente au point", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await submit(request, { amount: '1,2' })
  expect(response.status()).toBe(201)
  expect((await response.json()).amount).toBe(1.2)
})

test("[AUD-014][NOTE-015][reference] arrondi PostgreSQL des décimales supplémentaires conservé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await submit(request, { amount: '1.235' })
  expect(response.status()).toBe(201)
  expect((await response.json()).amount).toBe(1.24)
})

test("[AUD-015][NOTE-016][correction] date invalide ou interdite ''", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { expenseDate: '' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-015][NOTE-017][correction] date invalide ou interdite '2026-02-30'", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { expenseDate: '2026-02-30' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-015][NOTE-018][correction] date invalide ou interdite '2023-02-29'", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { expenseDate: '2023-02-29' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-015][NOTE-019][correction] date invalide ou interdite '2099-01-01'", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { expenseDate: '2099-01-01' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-015][NOTE-020][correction] date invalide ou interdite '01/10/2026'", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { expenseDate: '01/10/2026' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})

test("[AUD-015][NOTE-021][reference] date bissextile réelle acceptée", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await submit(request, { expenseDate: '2024-02-29' })).status()).toBe(201)
})

test("[AUD-005][NOTE-022][correction] erreur de date sans stack publique ni message SQL brut", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await submit(request, { expenseDate: '2026-02-30' })
  const body = await response.json()
  expect(body).not.toHaveProperty('stack')
  expect(typeof body.error).toBe('string')
  expect(/Postgres|date\/time field|out of range|INSERT INTO/i.test(body.error)).toBe(false)
})

test("[G14][NOTE-023][correction] texte déguisé en PNG refusé avant toute écriture", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  const objects = await objectCount()
  expect.soft((await submit(request, {}, 'corrupt.png', 'image/png')).status()).toBe(400)
  expect.soft((await ownNotes(request)).length).toBe(before)
  expect(await objectCount()).toBe(objects)
})

test("[G14][NOTE-024][reference] type de reçu non supporté refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await submit(request, {}, 'corrupt.png', 'text/plain')).status()).toBe(400)
})

test("[G14][NOTE-025][reference] borne de taille 10485760 octets", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const bytes = Buffer.alloc(10485760); (await readFile('tests/fixtures/blank.png')).copy(bytes)
  const response = await request.post('/api/expense-notes', { multipart: { amount: '1', expenseDate: '2026-10-01', description: 'Borne de taille CI', receipt: { name: 'audit.png', mimeType: 'image/png', buffer: bytes } } })
  expect(response.status()).toBe(201)
})

test("[G14][NOTE-026][reference] borne de taille 10485761 octets", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const bytes = Buffer.alloc(10485761); (await readFile('tests/fixtures/blank.png')).copy(bytes)
  const response = await request.post('/api/expense-notes', { multipart: { amount: '1', expenseDate: '2026-10-01', description: 'Borne de taille CI', receipt: { name: 'audit.png', mimeType: 'image/png', buffer: bytes } } })
  expect(response.status()).toBe(400)
})

test("[AUD-011][NOTE-027][reference] description vide refusée", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await submit(request, { description: '  ' })).status()).toBe(400)
})

test("[G14][NOTE-028][reference] reçu absent refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.post('/api/expense-notes', { multipart: { amount: '12', expenseDate: '2026-10-01', description: 'Sans reçu' } })).status()).toBe(400)
})

test("[AUD-004][LIST-001][reference] liste propriétaire et tri par défaut conservés", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const rows = await ownNotes(request)
  expect(rows.map(n => n.id)).toEqual([notes.rejected, notes.approved, notes.employee])
  expect(rows.every(n => n.userId === users.a_employee.id)).toBe(true)
})

test("[AUD-004][LIST-002][correction] option nommée newest", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.get('/api/expense-notes?sort=newest')
  expect(response.status()).toBe(200)
  expect((await response.json()).map((n: { id: string }) => n.id)).toEqual([notes.rejected, notes.approved, notes.employee])
})

test("[AUD-004][LIST-003][correction] option nommée amount_asc", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.get('/api/expense-notes?sort=amount_asc')
  expect(response.status()).toBe(200)
  expect((await response.json()).map((n: { id: string }) => n.id)).toEqual([notes.rejected, notes.employee, notes.approved])
})

test("[AUD-004][LIST-004][correction] option nommée AMOUNT_DESC", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.get('/api/expense-notes?sort=AMOUNT_DESC')
  expect(response.status()).toBe(200)
  expect((await response.json()).map((n: { id: string }) => n.id)).toEqual([notes.approved, notes.employee, notes.rejected])
})

test("[AUD-004][LIST-005][correction] tri inconnu rejeté avant exécution SQL", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.get('/api/expense-notes?sort=colonne_inconnue')).status()).toBe(400)
})

test("[AUD-004][LIST-006][correction] expression SQL libre refusée", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.get('/api/expense-notes?sort=' + encodeURIComponent('created_at DESC, (SELECT 1)'))).status()).toBe(400)
})

test("[AUD-006][RECU-001][reference] reçu du propriétaire réellement accessible", async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.get(`/api/expense-notes/${notes.employee}/receipt-url`)
  expect(response.status()).toBe(200)
  expect((await request.get((await response.json()).url)).status()).toBe(200)
})

test("[AUD-006][RECU-002][reference] reçu propriétaire étranger ou absent refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.get(`/api/expense-notes/${notes.b_employee}/receipt-url`)).status()).toBe(404)
})

test("[AUD-006][RECU-003][reference] reçu propriétaire étranger ou absent refusé", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.get(`/api/expense-notes/${absent}/receipt-url`)).status()).toBe(404)
})

test("[AUD-011][LIST-007][reference] liste vide pour un compte sans note", async ({ request }) => {
  await db().query('DELETE FROM expense_notes WHERE user_id=$1', [users.a_unrelated.id])
  await authenticate(request, 'a_unrelated')
  expect(await ownNotes(request)).toEqual([])
})

test('[AUD-014][NOTE-029][reference] montant maximal numeric dix chiffres dont deux décimales accepté', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await submit(request, { amount: '99999999.99' })
  expect(response.status()).toBe(201)
  expect((await response.json()).amount).toBe(99999999.99)
})
test('[AUD-014][NOTE-030][correction] dépassement de borne monétaire refusé sans écriture', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length
  expect.soft((await submit(request, { amount: '100000000' })).status()).toBe(400)
  expect((await ownNotes(request)).length).toBe(before)
})
test('[G14][NOTE-031][correction] faux PDF refusé avant écriture et upload', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length; const objects = await objectCount()
  const response = await request.post('/api/expense-notes', { multipart: { amount: '12', expenseDate: '2026-10-01', description: 'Faux PDF CI',
    receipt: { name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('Ceci est du texte sans structure PDF.') } } })
  expect.soft(response.status()).toBe(400)
  expect.soft((await ownNotes(request)).length).toBe(before)
  expect(await objectCount()).toBe(objects)
})
test('[G14][NOTE-032][correction] contenu PNG déclaré PDF refusé avant écriture et upload', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await ownNotes(request)).length; const objects = await objectCount()
  expect.soft((await submit(request, {}, 'receipt.png', 'application/pdf')).status()).toBe(400)
  expect.soft((await ownNotes(request)).length).toBe(before)
  expect(await objectCount()).toBe(objects)
})
