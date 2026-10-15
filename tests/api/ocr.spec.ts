import { test, expect, authenticate } from '../support/fixtures'
import { readFile } from 'node:fs/promises'

test('[AUD-008][OCR-001][reference] un reçu lisible est réellement reconnu', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.post('/api/expense-notes/receipt-suggestion', { multipart: {
    receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({ amount: 42.5, expenseDate: '2026-10-14' })
})
test('[AUD-008][OCR-002][reference] une analyse réussie sans champ retourne un objet vide', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.post('/api/expense-notes/receipt-suggestion', { multipart: {
    receipt: { name: 'blank.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/blank.png') } } })
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({})
})
test('[AUD-008][OCR-003][correction] une image corrompue est une erreur et pas un succès vide', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.post('/api/expense-notes/receipt-suggestion', { multipart: {
    receipt: { name: 'corrupt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/corrupt.png') } } })
  expect(response.status()).toBe(500)
  expect(typeof (await response.json()).error).toBe('string')
})
test('[AUD-008][OCR-004][correction] PDF n’est pas ajouté aux formats OCR acceptés', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await request.post('/api/expense-notes/receipt-suggestion', { multipart: {
    receipt: { name: 'receipt.pdf', mimeType: 'application/pdf', buffer: await readFile('tests/fixtures/receipt.pdf') } } })
  expect(response.status()).toBe(400)
})
test('[AUD-008][OCR-005][reference] reçu absent refusé', async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.post('/api/expense-notes/receipt-suggestion', { multipart: { vide: 'oui' } })).status()).toBe(400)
})
test('[AUD-008][OCR-006][reference] OCR interdit sans session', async ({ request }) => {
  expect((await request.post('/api/expense-notes/receipt-suggestion', { multipart: {
    receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })).status()).toBe(401)
})
