import { readFile } from 'node:fs/promises'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { test, expect, authenticate } from '../support/fixtures'
import { users } from '../support/data'
import { db } from '../support/database'
import { objectCount, storage } from '../support/storage'
import { testEnvironment } from '../support/environment'
import { empreinteRecu } from '../../src/modules/soumission/empreinte'

test('[AUD-029][CANON-005][reference] une empreinte historique retrouve la même note sans nouvel objet ni écrasement', async ({ request }) => {
  await authenticate(request, 'a_employee')
  const fichier = await readFile('tests/fixtures/receipt.png')
  const cle = 'cccccccc-0000-4000-8000-000000000029'
  const cleRecu = 'receipts/canonical-history-ci.png'
  // Empreinte fixe antérieure à la correction pour ["12.5","2026-10-01","Taxi"].
  // Elle ne doit pas être recalculée par le nouveau code pour préparer ce cas.
  const empreinteHistorique = 'a72547348a074cd4c352f826c1d8e54545435e8829733e1aa0fe5fbcf0d4828c'
  const inserted = await db().query(
    `INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key, status,
       request_key, request_fingerprint, receipt_sha256, receipt_size, request_amount)
     VALUES ($1, 12.50, '2026-10-01', 'Taxi', $2, 'pending', $3, $4, $5, $6, '12.5') RETURNING id`,
    [users.a_employee.id, cleRecu, cle, empreinteHistorique, empreinteRecu(fichier), fichier.byteLength]
  )
  const client = storage()
  try {
    await client.send(new PutObjectCommand({ Bucket: testEnvironment().bucket, Key: cleRecu,
      Body: fichier, ContentType: 'image/png' }))
  } finally { client.destroy() }
  const avant = await db().query('SELECT * FROM expense_notes WHERE request_key=$1', [cle])
  const objets = await objectCount()
  const envoyer = (amount: string) => request.post('/api/expense-notes', {
    headers: { 'Idempotency-Key': cle },
    multipart: { amount, expenseDate: '2026-10-01', description: 'Taxi',
      receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: fichier } },
  })

  const reprise = await envoyer('012.5000')
  expect(reprise.status()).toBe(200)
  expect(await reprise.json()).toMatchObject({ id: inserted.rows[0].id, amount: 12.5, status: 'pending' })
  const conflit = await envoyer('12.5001')
  expect(conflit.status()).toBe(409)
  expect((await db().query('SELECT * FROM expense_notes WHERE request_key=$1', [cle])).rows).toEqual(avant.rows)
  expect(await objectCount()).toBe(objets)
})
