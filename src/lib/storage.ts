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

// Borne chaque appel S3 : une réservation de soumission est plus longue que ce délai,
// donc un dépôt abandonné ne peut plus écrire quand une autre exécution reprend.
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
export async function readReceipt(key: string): Promise<Buffer | null> {
  try {
    const result = await getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
      abortSignal: AbortSignal.timeout(OPERATION_TIMEOUT_MS),
    })
    return Buffer.from(await result.Body!.transformToByteArray())
  } catch (error) {
    if ((error as { name?: string }).name === 'NoSuchKey') return null
    throw error
  }
}

export async function getReceiptUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds })
}
