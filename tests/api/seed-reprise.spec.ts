import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { test, expect } from '../support/fixtures'
import { db } from '../support/database'
import { testEnvironment } from '../support/environment'
import { storage } from '../support/storage'

// Exécute le vrai scripts/seed.mjs sur la base et le bucket de test isolés.
function seed(bucket = testEnvironment().bucket) {
  const env = testEnvironment()
  return new Promise<{ code: number; sortie: string }>(resolve => execFile(process.execPath, ['scripts/seed.mjs'], { env: {
    ...process.env, DATABASE_URL: env.databaseURL, S3_ENDPOINT: env.endpoint, S3_BUCKET: bucket,
    S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test',
    SEED_HR_EMAIL: 'rh@ci-seed.invalid', SEED_MANAGER_EMAIL: 'manager@ci-seed.invalid', SEED_EMPLOYEE_EMAIL: 'employe@ci-seed.invalid',
    SEED_HR_PASSWORD: 'mot-de-passe-ci-fictif', SEED_MANAGER_PASSWORD: 'mot-de-passe-ci-fictif', SEED_EMPLOYEE_PASSWORD: 'mot-de-passe-ci-fictif',
  } }, (error, stdout, stderr) => resolve({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, sortie: stdout + stderr })))
}
// Même PNG 1x1 que scripts/seed.mjs.
const RECEIPT_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const NOTES = "SELECT en.id, en.status, en.receipt_key FROM expense_notes en JOIN users u ON u.id = en.user_id WHERE u.email LIKE '%@ci-seed.invalid' ORDER BY en.created_at, en.id"
const employe = "SELECT en.id, en.status, en.receipt_key FROM expense_notes en JOIN users u ON u.id = en.user_id WHERE u.email = 'employe@ci-seed.invalid'"

async function objet(cle: string) {
  const client = storage()
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: testEnvironment().bucket, Key: cle }))
    return Buffer.from(await result.Body!.transformToByteArray())
  } catch (error) { if ((error as { name?: string }).name === 'NoSuchKey') return null; throw error }
  finally { client.destroy() }
}
async function modifierObjet(cle: string, corps: Buffer | null) {
  const client = storage()
  try {
    await client.send(corps
      ? new PutObjectCommand({ Bucket: testEnvironment().bucket, Key: cle, Body: corps, ContentType: 'image/png' })
      : new DeleteObjectCommand({ Bucket: testEnvironment().bucket, Key: cle }))
  } finally { client.destroy() }
}
async function seedComplet() {
  expect((await seed()).code).toBe(0)
  const lignes = (await db().query(NOTES)).rows
  expect(lignes).toHaveLength(2)
  return lignes
}

test('[AUD-018][SEED-004][correction] objet présent et référence absente : la même note retrouve sa référence, son état est conservé', async () => {
  const [avant] = (await seedComplet()).filter(note => note.receipt_key)
  const cle = avant.receipt_key as string
  await db().query("UPDATE expense_notes SET receipt_key = '' WHERE id = $1", [avant.id])
  expect((await seed()).code).toBe(0)
  const apres = (await db().query(NOTES)).rows
  expect(apres).toHaveLength(2)
  expect(apres.find(note => note.id === avant.id)).toEqual(avant)
  expect(cle).toMatch(/^receipts\/\d+\.png$/)
})

test('[AUD-018][SEED-005][correction] référence présente et objet absent : l’objet est redéposé sur la même note', async () => {
  const lignes = await seedComplet()
  const cible = (await db().query(employe)).rows[0]
  await modifierObjet(cible.receipt_key, null)
  expect(await objet(cible.receipt_key)).toBeNull()
  expect((await seed()).code).toBe(0)
  expect(((await db().query(NOTES)).rows).map(note => note.id)).toEqual(lignes.map(note => note.id))
  expect((await objet(cible.receipt_key))?.equals(RECEIPT_PNG)).toBe(true)
})

test('[AUD-018][SEED-006][correction] décision conservée même quand le reçu manque : approved reste approved, reçu réparé', async () => {
  await seedComplet()
  const cible = (await db().query(employe)).rows[0]
  await db().query("UPDATE expense_notes SET status = 'approved', receipt_key = '' WHERE id = $1", [cible.id])
  await modifierObjet(cible.receipt_key, null)
  expect((await seed()).code).toBe(0)
  const apres = (await db().query(employe)).rows
  expect(apres).toHaveLength(1)
  expect(apres[0]).toMatchObject({ id: cible.id, status: 'approved' })
  expect(apres[0].receipt_key).toBeTruthy()
  expect(await objet(apres[0].receipt_key)).not.toBeNull()
})

test('[AUD-018][SEED-007][correction] réparation impossible : échec explicite, aucune note ajoutée, puis relance réussie', async () => {
  await seedComplet()
  const cible = (await db().query(employe)).rows[0]
  await modifierObjet(cible.receipt_key, null)
  const echec = await seed('ci-bucket-volontairement-absent')
  expect(echec.code).toBe(1)
  expect(echec.sortie).toContain('Seed incomplet')
  expect(echec.sortie).not.toContain('Comptes de démonstration prêts')
  expect((await db().query(NOTES)).rows).toHaveLength(2)
  expect((await seed()).code).toBe(0)
  expect(await objet(cible.receipt_key)).not.toBeNull()
})

test('[AUD-018][SEED-008][correction] objet différent à la clé du reçu : remplacé par le reçu de démonstration', async () => {
  await seedComplet()
  const cible = (await db().query(employe)).rows[0]
  await modifierObjet(cible.receipt_key, await readFile('tests/fixtures/corrupt.png'))
  expect((await seed()).code).toBe(0)
  expect((await objet(cible.receipt_key))?.equals(RECEIPT_PNG)).toBe(true)
  expect((await db().query(employe)).rows).toEqual([cible])
})

test('[AUD-018][SEED-009][correction] note incomplete du nouveau schéma : finalisée sur la même note sans doublon', async () => {
  await seedComplet()
  const cible = (await db().query(employe)).rows[0]
  await db().query("UPDATE expense_notes SET status = 'incomplete' WHERE id = $1", [cible.id])
  await modifierObjet(cible.receipt_key, null)
  expect((await seed()).code).toBe(0)
  expect((await db().query(employe)).rows).toEqual([{ id: cible.id, status: 'pending', receipt_key: cible.receipt_key }])
  expect(await objet(cible.receipt_key)).not.toBeNull()
})

test('[AUD-018][SEED-010][reference] deuxième lancement sur des données complètes : aucune écriture ni nouvel objet', async () => {
  const avant = await seedComplet()
  const second = await seed()
  expect(second.code).toBe(0)
  expect(second.sortie).not.toMatch(/créée|rétablie|finalisée/)
  expect((await db().query(NOTES)).rows).toEqual(avant)
})
