import { auth } from '@/lib/auth'
import { respondError } from '@/lib/errors'
import { EngineBusyError, RecognitionTimeoutError, SUPPORTED_MIME_TYPES, suggestFields } from '@/lib/ocr'

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const receipt = formData.get('receipt')
    if (!(receipt instanceof File)) {
      return Response.json({ error: 'Champs invalides' }, { status: 400 })
    }
    // Formats formellement acceptés par l'OCR uniquement (PDF reste accepté
    // au dépôt via l'autre route, sans OCR PDF ajouté — AUD-008).
    if (!SUPPORTED_MIME_TYPES.includes(receipt.type)) {
      return Response.json({ error: 'Format non pris en charge pour l’analyse' }, { status: 400 })
    }
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return Response.json({ error: 'Fichier trop volumineux' }, { status: 400 })
    }

    const buffer = Buffer.from(await receipt.arrayBuffer())
    try {
      const suggestion = await suggestFields({ data: buffer, mimeType: receipt.type })
      return Response.json(suggestion)
    } catch (error) {
      if (error instanceof EngineBusyError) {
        return Response.json(
          { error: 'Service temporairement occupé, veuillez réessayer' },
          { status: 503 }
        )
      }
      if (error instanceof RecognitionTimeoutError) {
        return Response.json({ error: 'Délai d’analyse dépassé, veuillez réessayer' }, { status: 504 })
      }
      throw error
    }
  } catch (error) {
    return respondError(error, 'expense-notes/receipt-suggestion:POST')
  }
}
