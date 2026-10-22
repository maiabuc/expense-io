import { currentSession } from '@/lib/current-session'
import { withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'
import { getReceiptUrl } from '@/lib/storage'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await currentSession()
    if (!session?.user || session.user.role !== 'manager') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    // Le périmètre est établi avant de générer l'URL signée (AUD-006) :
    // collaborateur direct du manager actuel, même entreprise. Aucun filtre
    // d'état : un reçu déjà approuvé ou rejeté reste consultable.
    const note = await withUserScope(session.user.id, async (client) => {
      const result = await client.query(
        `SELECT en.receipt_key FROM expense_notes en
         JOIN users u ON u.id = en.user_id
         WHERE en.id = $1 AND u.manager_id = $2 AND u.company_id = $3`,
        [id, session.user.id, session.user.companyId]
      )
      return result.rows[0]
    })
    if (!note) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const url = await getReceiptUrl(note.receipt_key)
    return Response.json({ url })
  } catch (error) {
    return respondError(error, 'manager/expense-notes/[id]/receipt-url:GET')
  }
}
