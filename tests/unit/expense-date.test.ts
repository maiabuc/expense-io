import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { parseStrictExpenseDate } from '../../src/utils/validators'
import type { NextRequest } from 'next/server'

const dependencies = vi.hoisted(() => ({
  currentSession: vi.fn(),
  withUserScope: vi.fn(),
  dependancesReelles: vi.fn(),
  soumettre: vi.fn(),
}))
vi.mock('@/lib/current-session', () => ({ currentSession: dependencies.currentSession }))
vi.mock('@/lib/db', () => ({ withUserScope: dependencies.withUserScope }))
vi.mock('@/modules/soumission/assemblage', () => ({ dependancesReelles: dependencies.dependancesReelles }))
vi.mock('@/modules/soumission/soumettre', () => ({ soumettre: dependencies.soumettre }))

import { POST } from '../../src/app/api/expense-notes/route'

const today = '2026-10-29'
beforeEach(() => {
  vi.resetAllMocks()
  dependencies.currentSession.mockResolvedValue({ user: { id: 'employee-a-ci', role: 'employee', companyId: 'company-a-ci' } })
})
afterEach(() => { vi.restoreAllMocks() })

test('[AUD-015][DATE-ZERO-001][correction] année zéro refusée au début et à la fin de son année', () => {
  expect(parseStrictExpenseDate('0000-01-01', today)).toBeNull()
  expect(parseStrictExpenseDate('0000-12-31', today)).toBeNull()
})

test('[AUD-015][DATE-ZERO-002][reference] première année positive conservée sans seuil ancienneté', () => {
  expect(parseStrictExpenseDate('0001-01-01', today)).toBe('0001-01-01')
  expect(parseStrictExpenseDate('0001-12-31', today)).toBe('0001-12-31')
})

test('[AUD-015][DATE-ZERO-003][reference] dates réelles et bissextiles conservent les refus existants', () => {
  expect(parseStrictExpenseDate('2024-02-29', today)).toBe('2024-02-29')
  for (const date of ['2023-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '2026-1-01', '']) {
    expect(parseStrictExpenseDate(date, today), date).toBeNull()
  }
  expect(parseStrictExpenseDate(today, today)).toBe(today)
  expect(parseStrictExpenseDate('2026-10-30', today)).toBeNull()
})

test('[AUD-015][DATE-ZERO-004][reference] date du jour suit minuit Paris indépendamment du fuseau serveur', () => {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2026-10-28T22:59:59Z'))
    expect(parseStrictExpenseDate('2026-10-29')).toBeNull()
    vi.setSystemTime(new Date('2026-10-28T23:00:00Z'))
    expect(parseStrictExpenseDate('2026-10-29')).toBe('2026-10-29')
    expect(parseStrictExpenseDate('2026-10-30')).toBeNull()
  } finally { vi.useRealTimers() }
})

function requestFor(date: string): NextRequest {
  const data = new FormData()
  data.set('amount', '12.34')
  data.set('expenseDate', date)
  data.set('description', 'Taxi CI')
  data.set('receipt', new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'receipt.png', { type: 'image/png' }))
  return new Request('http://ci.invalid/api/expense-notes', {
    method: 'POST', body: data,
    headers: { 'Idempotency-Key': 'c56a4180-65aa-42ec-a945-5fd21dec0538' },
  }) as NextRequest
}

test('[AUD-015][DATE-ZERO-005][correction] POST refuse année zéro avant assemblage ou soumission', async () => {
  const response = await POST(requestFor('0000-01-01'))
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'Date invalide' })
  expect(dependencies.dependancesReelles).not.toHaveBeenCalled()
  expect(dependencies.soumettre).not.toHaveBeenCalled()
  expect(dependencies.withUserScope).not.toHaveBeenCalled()
})

test('[AUD-015][DATE-ZERO-006][reference] POST transmet année 0001 inchangée au module de soumission', async () => {
  const created = {
    id: 'note-a-ci', userId: 'employee-a-ci', amount: '12.34', expenseDate: '0001-01-01',
    description: 'Taxi CI', receiptKey: 'ci/receipt.png', status: 'pending', createdAt: '2026-10-29T08:00:00.000Z',
  }
  dependencies.soumettre.mockResolvedValue({ type: 'creee', note: created })
  const response = await POST(requestFor('0001-01-01'))
  expect(response.status).toBe(201)
  expect(await response.json()).toMatchObject({ expenseDate: '0001-01-01', amount: 12.34 })
  expect(dependencies.soumettre.mock.calls[0][1].champs).toMatchObject({ date: '0001-01-01' })
})
