import { currentSession } from '@/lib/current-session'
import { withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await currentSession()
    if (!session?.user || session.user.role !== 'hr_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    if (!UUID.test(id)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return withUserScope(session.user.id, async (client) => {
      // Une seule écriture porte à la fois l'autorisation actuelle (manager racine de même entreprise) et
      // l'état pending : deux décisions simultanées ne peuvent pas toutes deux réussir (AUD-007).
      const updated = await client.query(
        `UPDATE expense_notes en SET status = 'approved'
         FROM users u, users hr
         WHERE en.id = $1 AND en.status = 'pending' AND u.id = en.user_id
           AND hr.id = $2 AND hr.role = 'hr_admin'
           AND u.role = 'manager' AND u.manager_id IS NULL AND u.company_id = hr.company_id
         RETURNING en.*`,
        [id, session.user.id]
      )
      const note = updated.rows[0]
      if (!note) {
        // Zéro ligne modifiée : note hors périmètre ou absente (404, sans révéler son état),
        // ou dans le périmètre mais non pending (409).
        const inScope = await client.query(
          `SELECT en.id FROM expense_notes en
           JOIN users u ON u.id = en.user_id
           JOIN users hr ON hr.id = $2 AND hr.role = 'hr_admin'
           WHERE en.id = $1 AND u.role = 'manager' AND u.manager_id IS NULL AND u.company_id = hr.company_id`,
          [id, session.user.id]
        )
        return inScope.rows[0]
          ? Response.json({ error: 'Already decided' }, { status: 409 })
          : Response.json({ error: 'Not found' }, { status: 404 })
      }
      return Response.json({
        id: note.id,
        userId: note.user_id,
        amount: Number.parseFloat(note.amount),
        expenseDate: note.expense_date,
        description: note.description,
        receiptKey: note.receipt_key,
        status: note.status,
        createdAt: new Date(note.created_at).toISOString(),
      })
    })
  } catch (error) {
    return respondError(error, 'hr/expense-notes/[id]/approve:POST')
  }
}
