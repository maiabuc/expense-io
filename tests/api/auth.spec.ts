import { test, expect, authenticate } from '../support/fixtures'
import { users, password } from '../support/data'

test('[AUD-011][AUTH-004][reference] toutes les routes métier refusent les appels anonymes', async ({ request }) => {
  const id = '10000000-0000-4000-8000-000000000301'
  const endpoints: [string, string, number][] = [
    ['GET', '/api/expense-notes', 401], ['POST', '/api/expense-notes', 401],
    ['POST', '/api/expense-notes/receipt-suggestion', 401], ['GET', `/api/expense-notes/${id}/receipt-url`, 401],
    ['GET', '/api/manager/expense-notes', 401], ['GET', `/api/manager/expense-notes/${id}/receipt-url`, 401],
    ['POST', `/api/manager/expense-notes/${id}/approve`, 401], ['POST', `/api/manager/expense-notes/${id}/reject`, 401],
    ['GET', '/api/hr/expense-notes', 403], ['GET', '/api/hr/users', 403],
    ['GET', `/api/hr/expense-notes/${id}/receipt-url`, 403], ['POST', `/api/hr/expense-notes/${id}/approve`, 403],
    ['POST', `/api/hr/expense-notes/${id}/reject`, 403], ['PUT', `/api/hr/users/${users.a_employee.id}/manager`, 403],
  ]
  for (const [method, path, expected] of endpoints) {
    const response = await request.fetch(path, { method })
    expect.soft(response.status(), `${method} ${path}`).toBe(expected)
    expect.soft(typeof (await response.json()).error).toBe('string')
  }
})
test('[AUD-011][AUTH-005][reference] méthodes non déclarées refusées', async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.put('/api/expense-notes', { data: {} })).status()).toBe(405)
  expect((await request.get('/api/manager/expense-notes/10000000-0000-4000-8000-000000000301/approve')).status()).toBe(405)
})

test('[AUD-011][AUTH-001][reference] connexion réelle Credentials et session', async ({ request }) => {
  const session = await authenticate(request, 'a_employee')
  expect(session.user.id).toBe(users.a_employee.id)
  expect(session.user.role).toBe('employee')
})
test('[AUD-011][AUTH-002][reference] mot de passe incorrect sans session', async ({ request }) => {
  const session = await authenticate(request, 'a_employee', `${password}-incorrect`)
  expect(session?.user).toBeUndefined()
})
test('[AUD-011][AUTH-003][reference] lecture propriétaire interdite sans session', async ({ request }) => {
  expect((await request.get('/api/expense-notes')).status()).toBe(401)
})
