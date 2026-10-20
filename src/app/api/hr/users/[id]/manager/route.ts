import { currentSession } from '@/lib/current-session'
import { withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Refus d'une requête d'affectation : le message est public, le code
// technique reste dans les logs internes (AUD-005, AUD-020).
function refuser(code: string, message: string, status: number) {
  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      code,
      operation: 'hr/users/[id]/manager:PUT',
      status,
    })
  )
  return Response.json({ error: message }, { status })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await currentSession()
    if (!session?.user || session.user.role !== 'hr_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params

    // Seul un managerId explicitement null retire l'affectation : toute
    // requête illisible ou incomplète est refusée avant la moindre écriture.
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return refuser('REQUETE_JSON_INVALIDE', "Le contenu de la requête n'est pas un JSON valide.", 400)
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return refuser('REQUETE_STRUCTURE_INVALIDE', 'Le contenu de la requête doit être un objet.', 400)
    }
    if (!Object.hasOwn(body, 'managerId')) {
      return refuser('MANAGER_CHAMP_ABSENT', 'Le champ managerId est requis.', 400)
    }
    const managerId = (body as { managerId: unknown }).managerId
    if (managerId !== null && !(typeof managerId === 'string' && UUID.test(managerId))) {
      return refuser('MANAGER_VALEUR_INVALIDE', "L'identifiant du manager est invalide.", 400)
    }
    if (!UUID.test(id)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { companyId } = session.user
    return await withUserScope(session.user.id, async (client) => {
      // Toutes les affectations d'une entreprise sont sérialisées par le
      // verrou de sa ligne companies, pris avant toute lecture de la
      // hiérarchie : deux affectations simultanées ne peuvent pas former une
      // boucle. Ordre de verrous unique : companies, puis users.
      await client.query('SELECT id FROM companies WHERE id = $1 FOR UPDATE', [companyId])

      const target = await client.query(
        `SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role IN ('employee', 'manager')`,
        [id, companyId]
      )
      if (!target.rows[0]) {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }

      if (managerId !== null) {
        // Le manager choisi doit être un manager actuel de la même entreprise.
        const manager =
          managerId === id
            ? null
            : (
                await client.query(
                  `SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
                  [managerId, companyId]
                )
              ).rows[0]
        if (!manager) {
          return refuser('MANAGER_AFFECTATION_INTERDITE', 'Invalid manager', 409)
        }

        // Boucle : la chaîne des supérieurs du manager atteint la cible.
        // UNION (et non UNION ALL) déduplique les lignes, donc le parcours
        // s'arrête même sur une boucle historique déjà présente en base.
        const loop = await client.query(
          `WITH RECURSIVE chaine(id, manager_id) AS (
             SELECT id, manager_id FROM users WHERE id = $1
             UNION
             SELECT u.id, u.manager_id FROM users u JOIN chaine c ON u.id = c.manager_id
           )
           SELECT 1 FROM chaine WHERE id = $2 LIMIT 1`,
          [managerId, id]
        )
        if (loop.rowCount) {
          return refuser('MANAGER_CYCLE', 'Cette affectation créerait une boucle entre managers.', 409)
        }
      }

      const updated = await client.query(
        `UPDATE users SET manager_id = $1 WHERE id = $2
         RETURNING id, name, email, role, manager_id`,
        [managerId, id]
      )
      const user = updated.rows[0]
      return Response.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.manager_id,
      })
    })
  } catch (error) {
    return respondError(error, 'hr/users/[id]/manager:PUT')
  }
}
