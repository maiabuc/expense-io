import { beforeEach, test, expect, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  hash: vi.fn(), getPool: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  query: vi.fn(), release: vi.fn(), connect: vi.fn(),
}))
vi.mock('bcryptjs', () => ({ default: { hash: dependencies.hash } }))
vi.mock('next-auth', () => ({ AuthError: class AuthError extends Error {} }))
vi.mock('@/lib/db', () => ({ getPool: dependencies.getPool }))
vi.mock('@/lib/auth', () => ({ signIn: dependencies.signIn, signOut: dependencies.signOut }))
vi.mock('../../src/utils/validators', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/utils/validators')>()
  return { ...original, isValidEmail: vi.fn(original.isValidEmail) }
})

import { signup } from '../../src/app/actions/auth'
import { isValidEmail } from '../../src/utils/validators'

function form(email?: string) {
  const data = new FormData()
  data.set('name', 'Compte CI fictif')
  data.set('password', 'FAKE_CI_PASSWORD_ONLY')
  if (email !== undefined) data.set('email', email)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isValidEmail).mockImplementation((email) => /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.test(email) && email.length <= 4096)
  dependencies.hash.mockResolvedValue('FAKE_HASH')
  dependencies.getPool.mockReturnValue({ connect: dependencies.connect })
  dependencies.connect.mockResolvedValue({ query: dependencies.query, release: dependencies.release })
  dependencies.query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO companies')) return { rows: [{ id: 'company-ci' }] }
    return { rows: [] }
  })
  dependencies.signIn.mockResolvedValue(undefined)
})

test('[AUD-027,AUD-030][EMAIL-001][correction] email trop long refusé avant hachage connexion SQL et authentification', async () => {
  const result = await signup({}, form(`${'a'.repeat(4092)}@b.co`))
  expect(result.error).toContain('email invalide')
  expect(dependencies.hash).not.toHaveBeenCalled()
  expect(dependencies.getPool).not.toHaveBeenCalled()
  expect(dependencies.connect).not.toHaveBeenCalled()
  expect(dependencies.signIn).not.toHaveBeenCalled()
})

test('[AUD-027,AUD-030][EMAIL-007][correction] champ email absent refusé côté action sans effet', async () => {
  const result = await signup({}, form())
  expect(result.error).toContain('email invalide')
  expect(isValidEmail).not.toHaveBeenCalled()
  expect(dependencies.hash).not.toHaveBeenCalled()
  expect(dependencies.getPool).not.toHaveBeenCalled()
})

test('[AUD-030][EMAIL-009][correction] signup respecte le refus du validateur partagé', async () => {
  vi.mocked(isValidEmail).mockReturnValueOnce(false)
  const result = await signup({}, form('valid@ci.invalid'))
  expect(isValidEmail).toHaveBeenCalledWith('valid@ci.invalid')
  expect(result.error).toContain('email invalide')
  expect(dependencies.hash).not.toHaveBeenCalled()
  expect(dependencies.getPool).not.toHaveBeenCalled()
})

test('[AUD-027,AUD-030][EMAIL-010][reference] domaine normalisé et adresse originale transmis sans changer la transaction', async () => {
  for (const email of ['Alice@Sub.CI.Invalid', 'a@c..d']) {
    vi.clearAllMocks()
    const result = await signup({}, form(email))
    expect(result).toEqual({})
    const domain = email.slice(email.indexOf('@') + 1).toLowerCase()
    expect(dependencies.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO companies'), [domain.split('.')[0], domain])
    expect(dependencies.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), ['Compte CI fictif', email, 'FAKE_HASH', 'company-ci', 'hr_admin'])
    const statements = dependencies.query.mock.calls.map(([sql]) => sql)
    expect(statements[0]).toBe('BEGIN')
    expect(statements.at(-1)).toBe('COMMIT')
    expect(dependencies.release).toHaveBeenCalledOnce()
    expect(dependencies.signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ email }))
  }
})
