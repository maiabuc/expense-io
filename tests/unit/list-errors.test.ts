import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  currentSession: vi.fn(),
  withUserScope: vi.fn(),
  query: vi.fn(),
}))

vi.mock('@/lib/current-session', () => ({ currentSession: dependencies.currentSession }))
vi.mock('@/lib/db', () => ({ withUserScope: dependencies.withUserScope }))

import { GET as managerList } from '../../src/app/api/manager/expense-notes/route'
import { GET as hrList } from '../../src/app/api/hr/expense-notes/route'

const actor = { id: 'manager-a-ci', role: 'manager', companyId: 'company-a-ci' }
const marker = 'FAKE_LIST_PRIVATE_MARKER'

beforeEach(() => {
  vi.resetAllMocks()
  dependencies.currentSession.mockResolvedValue({ user: actor })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks() })

async function assertSafeFailure(get: () => Promise<Response>, operation: string) {
  const response = await get()
  expect(response.status).toBe(500)
  const body = await response.json()
  expect(body).toEqual({ error: 'Une erreur inattendue est survenue. Réessaie plus tard.' })
  expect(JSON.stringify(body)).not.toContain(marker)
  expect(console.error).toHaveBeenCalledTimes(1)
  const log = String(vi.mocked(console.error).mock.calls[0][0])
  expect(log).not.toContain(marker)
  expect(JSON.parse(log)).toMatchObject({ operation, status: 500 })
}

// Le rejet survient après une frontière asynchrone : un simple return laisse
// échapper la promesse rejetée alors que return await la ramène dans le catch.
function delayedFailure() {
  return new Promise<never>((_resolve, reject) => {
    setImmediate(() => reject(new Error(`connexion indisponible password=${marker}`)))
  })
}

test('[AUD-005][LIST-PANNE-001][correction] manager transforme le rejet différé du contexte en réponse sûre', async () => {
  dependencies.withUserScope.mockImplementation(delayedFailure)
  await assertSafeFailure(managerList, 'manager/expense-notes:GET')
})

test('[AUD-005][LIST-PANNE-002][correction] RH transforme le rejet différé du contexte en réponse sûre', async () => {
  dependencies.currentSession.mockResolvedValue({ user: { ...actor, role: 'hr_admin' } })
  dependencies.withUserScope.mockImplementation(delayedFailure)
  await assertSafeFailure(hrList, 'hr/expense-notes:GET')
})

test('[AUD-005][LIST-PANNE-003][correction] manager intercepte aussi le rejet asynchrone de la requête', async () => {
  dependencies.query.mockImplementation(delayedFailure)
  dependencies.withUserScope.mockImplementation(async (_id: string, callback: (client: { query: typeof dependencies.query }) => Promise<Response>) => callback({ query: dependencies.query }))
  await assertSafeFailure(managerList, 'manager/expense-notes:GET')
  expect(dependencies.query).toHaveBeenCalledTimes(1)
})

test('[AUD-005][LIST-PANNE-004][correction] RH intercepte aussi le rejet asynchrone de la requête', async () => {
  dependencies.currentSession.mockResolvedValue({ user: { ...actor, role: 'hr_admin' } })
  dependencies.query.mockImplementation(delayedFailure)
  dependencies.withUserScope.mockImplementation(async (_id: string, callback: (client: { query: typeof dependencies.query }) => Promise<Response>) => callback({ query: dependencies.query }))
  await assertSafeFailure(hrList, 'hr/expense-notes:GET')
  expect(dependencies.query).toHaveBeenCalledTimes(1)
})

test('[AUD-005][LIST-PANNE-005][reference] garde manager conserve 401 sans ouvrir de contexte', async () => {
  for (const user of [null, { ...actor, role: 'employee' }, { ...actor, role: 'hr_admin' }]) {
    dependencies.currentSession.mockResolvedValue(user ? { user } : null)
    const response = await managerList()
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  }
  expect(dependencies.withUserScope).not.toHaveBeenCalled()
})

test('[AUD-005][LIST-PANNE-006][reference] garde RH conserve 403 sans ouvrir de contexte', async () => {
  for (const user of [null, { ...actor, role: 'employee' }, actor]) {
    dependencies.currentSession.mockResolvedValue(user ? { user } : null)
    const response = await hrList()
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  }
  expect(dependencies.withUserScope).not.toHaveBeenCalled()
})

const row = {
  id: 'note-a-ci', user_id: 'employee-a-ci', amount: '12.34', expense_date: '2026-10-01',
  description: 'Taxi CI', receipt_key: 'ci/receipt.png', status: 'pending', created_at: '2026-10-02T08:00:00.000Z',
}
const expectedNote = {
  id: row.id, userId: row.user_id, amount: 12.34, expenseDate: row.expense_date,
  description: row.description, receiptKey: row.receipt_key, status: row.status, createdAt: row.created_at,
}

function successfulScope() {
  dependencies.query.mockResolvedValue({ rows: [row] })
  dependencies.withUserScope.mockImplementation(async (_id: string, callback: (client: { query: typeof dependencies.query }) => Promise<Response>) => callback({ query: dependencies.query }))
}

test('[AUD-005][LIST-PANNE-007][reference] succès manager conserve le tableau et ses champs', async () => {
  successfulScope()
  const response = await managerList()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual([expectedNote])
  expect(dependencies.withUserScope.mock.calls[0][0]).toBe(actor.id)
  expect(console.error).not.toHaveBeenCalled()
})

test('[AUD-005][LIST-PANNE-008][reference] succès RH conserve le tableau et ses champs', async () => {
  dependencies.currentSession.mockResolvedValue({ user: { ...actor, role: 'hr_admin' } })
  successfulScope()
  const response = await hrList()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual([expectedNote])
  expect(dependencies.withUserScope.mock.calls[0][0]).toBe(actor.id)
  expect(console.error).not.toHaveBeenCalled()
})
