import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let client: S3Client | undefined

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    })
  }
  return client
}

const BUCKET = process.env.S3_BUCKET ?? 'receipts'

// Borne les appels côté client ; ce délai ne prouve pas l'arrêt d'une écriture
// côté S3. La soumission utilise également des écritures conditionnelles.
const OPERATION_TIMEOUT_MS = 30_000

// Nom de fichier lisible, dérivé du compteur de reçu de la note plutôt que
// d'un identifiant opaque.
export function receiptKeyFor(receiptSeq: number, extension: string): string {
  return `receipts/${receiptSeq}${extension}`
}

export async function uploadReceipt(key: string, body: Buffer, contentType: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
    { abortSignal: AbortSignal.timeout(OPERATION_TIMEOUT_MS) }
  )
}

/** Octets d'un reçu stocké, ou null si l'objet n'existe pas. Toute autre panne est propagée. */
export async function readReceiptVersion(key: string): Promise<{ body: Buffer; etag: string } | null> {
  try {
    const result = await getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
      abortSignal: AbortSignal.timeout(OPERATION_TIMEOUT_MS),
    })
    if (!result.ETag) throw new Error('Version du reçu indisponible.')
    return { body: Buffer.from(await result.Body!.transformToByteArray()), etag: result.ETag }
  } catch (error) {
    if ((error as { name?: string }).name === 'NoSuchKey') return null
    throw error
  }
}

export async function readReceipt(key: string): Promise<Buffer | null> {
  return (await readReceiptVersion(key))?.body ?? null
}

/** Remplace seulement la version observée ; null signifie une création si l'objet est absent. */
export async function uploadReceiptVersion(key: string, body: Buffer, contentType: string, etag: string | null): Promise<void> {
  await getClient().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType,
    ...(etag === null ? { IfNoneMatch: '*' } : { IfMatch: etag }) }),
    { abortSignal: AbortSignal.timeout(OPERATION_TIMEOUT_MS) })
}

export async function getReceiptUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds })
}
