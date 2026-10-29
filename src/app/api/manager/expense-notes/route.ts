import { currentSession } from '@/lib/current-session'
import { withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'

function toExpenseNote(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number.parseFloat(row.amount as string),
    expenseDate: row.expense_date,
    description: row.description,
    receiptKey: row.receipt_key,
    status: row.status,
    createdAt: new Date(row.created_at as string).toISOString(),
  }
}

export async function GET() {
  try {
    const session = await currentSession()
    if (!session?.user || session.user.role !== 'manager') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // return await (et non return) : withUserScope renvoie une promesse dont
    // le rejet survient après une frontière asynchrone. Sans await ici, le
    // rejet s'échappe du try sans passer par le catch ; avec await, toute
    // panne de contexte ou de requête rejoint respondError (AUD-005).
    return await withUserScope(session.user.id, async (client) => {
      const result = await client.query(
        `SELECT en.* FROM expense_notes en
         JOIN users u ON u.id = en.user_id
         WHERE u.manager_id = $1 AND u.company_id = $2 AND en.status = 'pending'
         ORDER BY en.created_at ASC`,
        [session.user.id, session.user.companyId]
      )
      return Response.json(result.rows.map(toExpenseNote))
    })
  } catch (error) {
    return respondError(error, 'manager/expense-notes:GET')
  }
}
