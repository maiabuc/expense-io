import { test, expect, authenticate, submit } from '../support/fixtures'
import { users, notes, companies } from '../support/data'
import { db } from '../support/database'
import { withUnreachableDatabase } from '../support/failure-server'

const ids = (rows: { id: string }[]) => rows.map(row => row.id).sort()

test('[G10][DROIT-022][correction] employé promu manager : le nouveau rôle est effectif sans reconnexion', async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.get('/api/manager/expense-notes')).status()).toBe(401)
  await db().query("UPDATE users SET role='manager' WHERE id=$1", [users.a_employee.id])
  expect((await request.get('/api/manager/expense-notes')).status()).toBe(200)
})

test('[G10][DROIT-023][correction] manager passé dans une autre entreprise : plus de liste ni de reçu, session conservée', async ({ request }) => {
  await authenticate(request, 'a_root')
  await db().query('UPDATE users SET company_id=$1 WHERE id=$2', [companies.b, users.a_root.id])
  const list = await request.get('/api/manager/expense-notes')
  expect(list.status()).toBe(200)
  expect(await list.json()).toEqual([])
  expect((await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(404)
})

test('[G10,AUD-006][DROIT-024][correction] rattachement changé avec session conservée : l’ancien manager perd le reçu, le nouveau le gagne', async ({ request }) => {
  await authenticate(request, 'a_root')
  await db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.a_sub.id, users.a_employee.id])
  const list = await request.get('/api/manager/expense-notes')
  expect(ids(await list.json())).toEqual([notes.sub])
  expect((await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(404)
  await authenticate(request, 'a_sub')
  expect((await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(200)
  expect(ids(await (await request.get('/api/manager/expense-notes')).json())).toEqual([notes.employee, notes.unrelated].sort())
})

test('[G10][DROIT-025][correction] compte manager supprimé : accès manager refusé', async ({ request }) => {
  await authenticate(request, 'a_root')
  await db().query('UPDATE users SET manager_id=NULL WHERE manager_id=$1', [users.a_root.id])
  await db().query('DELETE FROM expense_notes WHERE user_id=$1', [users.a_root.id])
  await db().query('DELETE FROM users WHERE id=$1', [users.a_root.id])
  expect((await request.get('/api/manager/expense-notes')).status()).toBe(401)
  expect((await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(401)
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(401)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.employee])).rows[0].status).toBe('pending')
})

test('[G10][DROIT-026][correction] compte RH supprimé : accès RH refusé', async ({ request }) => {
  await authenticate(request, 'a_hr')
  await db().query('DELETE FROM users WHERE id=$1', [users.a_hr.id])
  expect((await request.get('/api/hr/users')).status()).toBe(403)
  expect((await request.get('/api/hr/expense-notes')).status()).toBe(403)
  expect((await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { data: { managerId: null } })).status()).toBe(403)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test('[G10][DROIT-027][correction] compte employé supprimé : reçu, suggestion et soumission refusés sans écriture', async ({ request }) => {
  await authenticate(request, 'a_employee')
  await db().query('DELETE FROM expense_notes WHERE user_id=$1', [users.a_employee.id])
  await db().query('DELETE FROM users WHERE id=$1', [users.a_employee.id])
  expect((await request.get(`/api/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(401)
  expect((await request.post('/api/expense-notes/receipt-suggestion')).status()).toBe(401)
  expect((await submit(request, { description: 'Compte supprimé CI' })).status()).toBe(401)
  expect((await db().query("SELECT id FROM expense_notes WHERE description='Compte supprimé CI'")).rowCount).toBe(0)
})

test('[AUD-006][DROIT-029][correction] reçu manager : note déjà décidée d’un employé hors rattachement refusée sans URL', async ({ request }) => {
  await authenticate(request, 'a_root')
  await db().query("UPDATE expense_notes SET status='approved' WHERE id=$1", [notes.unrelated])
  const response = await request.get(`/api/manager/expense-notes/${notes.unrelated}/receipt-url`)
  expect(response.status()).toBe(404)
  expect(await response.json()).not.toHaveProperty('url')
})

test('[AUD-006][DROIT-030][reference] reçu manager : note rejetée d’un collaborateur direct reste lisible', async ({ request }) => {
  await authenticate(request, 'a_root')
  const response = await request.get(`/api/manager/expense-notes/${notes.rejected}/receipt-url`)
  expect(response.status()).toBe(200)
  expect(typeof (await response.json()).url).toBe('string')
})

test('[AUD-006][DROIT-032][correction] relation manager interentreprises : ni liste, ni reçu, ni décision', async ({ request }) => {
  await db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.b_root.id, users.a_employee.id])
  await authenticate(request, 'b_root')
  expect(ids(await (await request.get('/api/manager/expense-notes')).json())).not.toContain(notes.employee)
  expect((await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(404)
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(404)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.employee])).rows[0].status).toBe('pending')
})

test('[AUD-006][DROIT-033][reference] reçu manager : employé, RH et anonyme refusés sans URL', async ({ request }) => {
  const anonymous = await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)
  expect(anonymous.status()).toBe(401)
  expect(await anonymous.json()).not.toHaveProperty('url')
  for (const key of ['a_employee', 'a_hr'] as const) {
    await authenticate(request, key)
    const response = await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)
    expect(response.status()).toBe(401)
    expect(await response.json()).not.toHaveProperty('url')
  }
})

test('[G10][DROIT-034][reference] RH passé dans l’entreprise B : annuaire et liste suivent l’entreprise actuelle', async ({ request }) => {
  await authenticate(request, 'a_hr')
  await db().query('UPDATE users SET company_id=$1 WHERE id=$2', [companies.b, users.a_hr.id])
  expect(ids(await (await request.get('/api/hr/users')).json())).toEqual([users.b_root.id, users.b_sub.id, users.b_employee.id, users.b_unrelated.id].sort())
  expect(ids(await (await request.get('/api/hr/expense-notes')).json())).toEqual([notes.b_root])
  expect((await request.get(`/api/hr/expense-notes/${notes.root}/receipt-url`)).status()).toBe(404)
})

test('[G10][DROIT-035][reference] panne DB pendant la relecture d’identité : refus fermé, aucun accès ni URL', async ({ request }) => {
  await authenticate(request, 'a_root')
  await withUnreachableDatabase(async base => {
    const receipt = await request.get(`${base}/api/manager/expense-notes/${notes.employee}/receipt-url`)
    expect(receipt.status()).toBe(500)
    expect(await receipt.json()).not.toHaveProperty('url')
    expect((await request.get(`${base}/api/manager/expense-notes`)).status()).toBe(500)
  })
})

test('[AUD-006][DROIT-036][reference] employé sans manager : ni manager ni RH ne peuvent décider sa note', async ({ request }) => {
  await db().query('UPDATE users SET manager_id=NULL WHERE id=$1', [users.a_employee.id])
  for (const [key, path] of [['a_root', 'manager'], ['a_hr', 'hr']] as const) {
    await authenticate(request, key)
    expect((await request.post(`/api/${path}/expense-notes/${notes.employee}/approve`)).status()).toBe(404)
  }
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.employee])).rows[0].status).toBe('pending')
})
