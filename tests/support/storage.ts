import { readFile } from 'node:fs/promises'
import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { testEnvironment } from './environment'

export function storage() {
  const env = testEnvironment()
  return new S3Client({ endpoint: env.endpoint, region: 'us-east-1', forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, maxAttempts: 1 })
}
export async function prepareStorage() {
  const client = storage(); const { bucket } = testEnvironment()
  try { await client.send(new HeadBucketCommand({ Bucket: bucket })) }
  catch { await client.send(new CreateBucketCommand({ Bucket: bucket })) }
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: 'ci-fixtures/receipt.png',
    Body: await readFile('tests/fixtures/receipt.png'), ContentType: 'image/png' }))
  client.destroy()
}
export async function objectCount() {
  const client = storage()
  try { return (await client.send(new ListObjectsV2Command({ Bucket: testEnvironment().bucket }))).KeyCount ?? 0 }
  finally { client.destroy() }
}
// Les fixtures de base ne réinitialisent pas le stockage : les essais qui comptent les objets de reçu
// repartent d'un préfixe vide (le compteur de reçu est remis à zéro avec la base, les clés se réutilisent).
export async function viderRecus() {
  const client = storage(); const { bucket } = testEnvironment()
  try {
    const listing = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'receipts/' }))
    const objets = (listing.Contents ?? []).map(objet => ({ Key: objet.Key! }))
    if (objets.length) await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objets } }))
  } finally { client.destroy() }
}
