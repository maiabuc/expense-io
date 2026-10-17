import { execFile } from 'node:child_process'
import { test, expect } from '../support/fixtures'
import { db } from '../support/database'
import { testEnvironment } from '../support/environment'

async function seed(bucket: string) {
  const env = testEnvironment()
  return new Promise<number>(resolve => execFile(process.execPath, ['scripts/seed.mjs'], { env: {
    ...process.env, DATABASE_URL: env.databaseURL, S3_ENDPOINT: env.endpoint, S3_BUCKET: bucket,
    S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test',
    SEED_HR_EMAIL: 'rh@ci-seed.invalid', SEED_MANAGER_EMAIL: 'manager@ci-seed.invalid', SEED_EMPLOYEE_EMAIL: 'employe@ci-seed.invalid',
    SEED_HR_PASSWORD: 'mot-de-passe-ci-fictif', SEED_MANAGER_PASSWORD: 'mot-de-passe-ci-fictif', SEED_EMPLOYEE_PASSWORD: 'mot-de-passe-ci-fictif',
  } }, error => resolve(error ? (typeof error.code === 'number' ? error.code : 1) : 0)))
}

test('[AUD-018][SEED-001][reference] seed complet relançable sans doublon', async () => {
  expect(await seed(testEnvironment().bucket)).toBe(0)
  expect(await seed(testEnvironment().bucket)).toBe(0)
  const rows = (await db().query("SELECT en.id,en.receipt_key FROM expense_notes en JOIN users u ON u.id=en.user_id WHERE u.email LIKE '%@ci-seed.invalid'")).rows
  expect(rows).toHaveLength(2)
  expect(rows.every(row => Boolean(row.receipt_key))).toBe(true)
})
test('[AUD-018][SEED-002][correction] reprise du seed répare la note après panne du reçu', async () => {
  expect(await seed('ci-bucket-volontairement-absent')).toBe(1)
  expect(await seed(testEnvironment().bucket)).toBe(0)
  const rows = (await db().query("SELECT en.id,en.receipt_key FROM expense_notes en JOIN users u ON u.id=en.user_id WHERE u.email='employe@ci-seed.invalid'")).rows
  expect(rows).toHaveLength(1)
  expect(Boolean(rows[0].receipt_key)).toBe(true)
})
test('[AUD-018][SEED-003][reference] relance du seed conserve une décision existante', async () => {
  expect(await seed(testEnvironment().bucket)).toBe(0)
  await db().query("UPDATE expense_notes SET status='approved' WHERE user_id=(SELECT id FROM users WHERE email='employe@ci-seed.invalid')")
  expect(await seed(testEnvironment().bucket)).toBe(0)
  const rows = (await db().query("SELECT status FROM expense_notes WHERE user_id=(SELECT id FROM users WHERE email='employe@ci-seed.invalid')")).rows
  expect(rows).toEqual([{ status: 'approved' }])
})
