import { test, expect, authenticate } from '../support/fixtures'
import { db } from '../support/database'
import { withCapturedDiagnostics } from '../support/failure-server'
import type { APIRequestContext } from '@playwright/test'

// Le harnais vérifie que db() cible exclusivement sa base CI jetable. Le retrait
// temporaire de SELECT laisse currentSession fonctionner et force bien le SELECT
// de la liste à échouer ; finally rétablit les privilèges avant le test suivant.
async function queryFailure(request: APIRequestContext, path: string, operation: string) {
  const allowed = await request.get(path)
  expect(allowed.status()).toBe(200)
  await withCapturedDiagnostics(async (base, logs) => {
    await db().query('REVOKE SELECT ON expense_notes FROM expense_app')
    try {
      const response = await request.get(`${base}${path}`)
      expect(response.status()).toBe(500)
      expect(await response.json()).toEqual({ error: 'Une erreur inattendue est survenue. Réessaie plus tard.' })
      await expect.poll(() => logs(), { message: 'Diagnostic structuré émis par le catch de la route.' }).toContain(`"operation":"${operation}"`)
      expect(logs()).toContain('"status":500')
    } finally {
      await db().query('GRANT SELECT ON expense_notes TO expense_app')
    }
  })
  expect((await request.get(path)).status()).toBe(200)
}

test('[AUD-005][LIST-PANNE-009][correction] panne SQL réelle de liste manager conserve le contrat erreur', async ({ request }) => {
  await authenticate(request, 'a_root')
  await queryFailure(request, '/api/manager/expense-notes', 'manager/expense-notes:GET')
})

test('[AUD-005][LIST-PANNE-010][correction] panne SQL réelle de liste RH conserve le contrat erreur', async ({ request }) => {
  await authenticate(request, 'a_hr')
  await queryFailure(request, '/api/hr/expense-notes', 'hr/expense-notes:GET')
})
