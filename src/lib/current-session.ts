import { auth } from '@/lib/auth'
import { getPool } from '@/lib/db'

export type CurrentSession = {
  user: {
    id: string
    role: 'employee' | 'manager' | 'hr_admin'
    companyId: string
  }
}

/**
 * Remplace `auth()` dans les gardes serveur (G10). La session ne fournit que
 * l'identité ; le rôle et l'entreprise sont relus en base à chaque requête
 * protégée, donc un changement de rôle ou de rattachement est effectif dès la
 * requête suivante, sans reconnexion. Rend `null` sans session ou si le compte
 * a été supprimé. Les liens de reçu déjà émis et les requêtes déjà engagées
 * ne sont pas révoqués par ce contrôle.
 */
export async function currentSession(): Promise<CurrentSession | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null

  const result = await getPool().query<{
    id: string
    role: CurrentSession['user']['role']
    company_id: string
  }>('SELECT id, role, company_id FROM users WHERE id = $1', [id])
  const row = result.rows[0]
  if (!row) return null

  return { user: { id: row.id, role: row.role, companyId: row.company_id } }
}
