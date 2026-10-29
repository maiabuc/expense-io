import { test, expect, authenticate, submit } from '../support/fixtures'
import { db } from '../support/database'
import { objectCount } from '../support/storage'

test('[AUD-015][DATE-ZERO-007][correction] année zéro refusée par HTTP sans réservation ou objet S3', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const before = (await db().query('SELECT count(*) AS total FROM expense_notes')).rows[0].total
  const storedObjects = await objectCount()
  for (const expenseDate of ['0000-01-01', '0000-12-31']) {
    const response = await submit(request, { expenseDate })
    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({ error: 'Date invalide' })
  }
  expect((await db().query('SELECT count(*) AS total FROM expense_notes')).rows[0].total).toBe(before)
  expect(await objectCount()).toBe(storedObjects)
})

test('[AUD-015][DATE-ZERO-008][reference] année 0001 transmise et persistée comme date PostgreSQL inchangée', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const response = await submit(request, { expenseDate: '0001-01-01' })
  expect(response.status()).toBe(201)
  const note = await response.json()
  expect(note.expenseDate).toBe('0001-01-01')
  const persisted = await db().query('SELECT expense_date::text AS date, status, receipt_key FROM expense_notes WHERE id=$1', [note.id])
  expect(persisted.rows).toEqual([{ date: '0001-01-01', status: 'pending', receipt_key: note.receiptKey }])
  expect(note.receiptKey).toBeTruthy()
})
