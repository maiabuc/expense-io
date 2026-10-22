import { test, expect, authenticate } from '../support/fixtures'
import { users, notes, absent } from '../support/data'
import { db, overlapping } from '../support/database'

test("[AUD-006][DROIT-001][reference] liste manager limitée aux collaborateurs directs pending", async ({ request }) => {
  await authenticate(request, 'a_root')
  const response = await request.get('/api/manager/expense-notes')
  expect(response.status()).toBe(200)
  expect((await response.json()).map((n: { id: string }) => n.id).sort()).toEqual([notes.employee, notes.sub].sort())
})

test("[AUD-006][DROIT-002][reference] liste RH limitée aux managers racines de son entreprise", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.get('/api/hr/expense-notes')
  expect(response.status()).toBe(200)
  expect((await response.json()).map((n: { id: string }) => n.id)).toEqual([notes.root])
})

test("[AUD-006][DROIT-003][reference] annuaire RH de la même entreprise sans les RH", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.get('/api/hr/users')
  expect(response.status()).toBe(200)
  expect((await response.json()).map((u: { id: string }) => u.id).sort()).toEqual([users.a_root.id, users.a_sub.id, users.a_employee.id, users.a_unrelated.id].sort())
})

test("[AUD-011][DROIT-004][reference] rôle a_employee refusé sur /api/manager/expense-notes", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.get('/api/manager/expense-notes')).status()).toBe(401)
})

test("[AUD-011][DROIT-005][reference] rôle a_employee refusé sur /api/hr/expense-notes", async ({ request }) => {
  await authenticate(request, 'a_employee')
  expect((await request.get('/api/hr/expense-notes')).status()).toBe(403)
})

test("[AUD-011][DROIT-006][reference] rôle a_root refusé sur /api/hr/users", async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.get('/api/hr/users')).status()).toBe(403)
})

test("[AUD-011][DROIT-007][reference] rôle a_hr refusé sur /api/manager/expense-notes", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.get('/api/manager/expense-notes')).status()).toBe(401)
})

test("[AUD-011][DROIT-008][reference] appel anonyme /api/manager/expense-notes refusé", async ({ request }) => {
  expect((await request.get('/api/manager/expense-notes')).status()).toBe(401)
})

test("[AUD-011][DROIT-009][reference] appel anonyme /api/hr/expense-notes refusé", async ({ request }) => {
  expect((await request.get('/api/hr/expense-notes')).status()).toBe(403)
})

test("[AUD-011][DROIT-010][reference] appel anonyme /api/hr/users refusé", async ({ request }) => {
  expect((await request.get('/api/hr/users')).status()).toBe(403)
})

test("[AUD-006][DROIT-011][reference] périmètre du reçu manager : notes.employee", async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.get(`/api/manager/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(200)
})

test("[AUD-006][DROIT-012][reference] périmètre du reçu manager : notes.approved", async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.get(`/api/manager/expense-notes/${notes.approved}/receipt-url`)).status()).toBe(200)
})

test("[AUD-006][DROIT-013][correction] périmètre du reçu manager : notes.unrelated", async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.get(`/api/manager/expense-notes/${notes.unrelated}/receipt-url`)).status()).toBe(404)
})

test("[AUD-006][DROIT-014][correction] périmètre du reçu manager : notes.b_employee", async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.get(`/api/manager/expense-notes/${notes.b_employee}/receipt-url`)).status()).toBe(404)
})

test("[AUD-006][DROIT-015][reference] périmètre du reçu manager : absent", async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.get(`/api/manager/expense-notes/${absent}/receipt-url`)).status()).toBe(404)
})

test("[AUD-006][DROIT-016][reference] périmètre du reçu RH : notes.root", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.get(`/api/hr/expense-notes/${notes.root}/receipt-url`)).status()).toBe(200)
})

test("[AUD-006][DROIT-017][reference] périmètre du reçu RH : notes.b_root", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.get(`/api/hr/expense-notes/${notes.b_root}/receipt-url`)).status()).toBe(404)
})

test("[AUD-006][DROIT-018][reference] périmètre du reçu RH : notes.employee", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.get(`/api/hr/expense-notes/${notes.employee}/receipt-url`)).status()).toBe(404)
})

test("[G10][DROIT-019][correction] rôle manager rétrogradé pris en compte sans reconnexion", async ({ request }) => {
  await authenticate(request, 'a_root')
  await db().query("UPDATE users SET role='employee' WHERE id=$1", [users.a_root.id])
  expect((await request.get('/api/manager/expense-notes')).status()).toBe(401)
})

test("[G10][DROIT-020][correction] rôle RH rétrogradé pris en compte sans reconnexion", async ({ request }) => {
  await authenticate(request, 'a_hr')
  await db().query("UPDATE users SET role='employee' WHERE id=$1", [users.a_hr.id])
  expect((await request.get('/api/hr/users')).status()).toBe(403)
})

test("[G10][DROIT-021][correction] compte supprimé ne garde pas son accès propriétaire", async ({ request }) => {
  await authenticate(request, 'a_employee')
  await db().query('DELETE FROM expense_notes WHERE user_id=$1', [users.a_employee.id])
  await db().query('DELETE FROM users WHERE id=$1', [users.a_employee.id])
  expect((await request.get('/api/expense-notes')).status()).toBe(401)
})

test("[AUD-020][AFF-001][correction] corps invalide sans changement : {", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("{") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-002][correction] corps invalide sans changement : null", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("null") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-003][correction] corps invalide sans changement : []", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("[]") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-004][correction] corps invalide sans changement : 42", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("42") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-005][correction] corps invalide sans changement : \"texte\"", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("\"texte\"") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-006][correction] corps invalide sans changement : {}", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("{}") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-007][correction] corps invalide sans changement : {\"managerId\":42}", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("{\"managerId\":42}") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-008][correction] corps invalide sans changement : {\"managerId\":\"invalide\"}", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from("{\"managerId\":\"invalide\"}") })
  expect.soft(response.status()).toBe(400)
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
})

test("[AUD-020][AFF-009][reference] null explicite retire le manager", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { data: { managerId: null } })
  expect(response.status()).toBe(200)
  expect((await response.json()).managerId).toBeNull()
})

test("[AUD-006][AFF-010][reference] affectation à un manager autorisé", async ({ request }) => {
  await authenticate(request, 'a_hr')
  const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { data: { managerId: users.a_sub.id } })
  expect(response.status()).toBe(200)
  expect((await response.json()).managerId).toBe(users.a_sub.id)
})

test("[AUD-006][AFF-011][correction] affectation hors périmètre ou manager invalide", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { data: { managerId: users.b_root.id } })).status()).toBe(409)
})

test("[AUD-006][AFF-012][reference] affectation hors périmètre ou manager invalide", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { data: { managerId: users.a_unrelated.id } })).status()).toBe(409)
})

test("[AUD-006][AFF-013][reference] affectation hors périmètre ou manager invalide", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.put(`/api/hr/users/${users.b_employee.id}/manager`, { data: { managerId: users.a_root.id } })).status()).toBe(404)
})

test("[AUD-006][AFF-014][reference] affectation hors périmètre ou manager invalide", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.put(`/api/hr/users/${absent}/manager`, { data: { managerId: users.a_root.id } })).status()).toBe(404)
})

test("[AUD-021][AFF-015][reference] auto-affectation refusée", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.put(`/api/hr/users/${users.a_root.id}/manager`, { data: { managerId: users.a_root.id } })).status()).toBe(409)
})

test("[AUD-021][AFF-016][correction] boucle à deux managers refusée", async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.put(`/api/hr/users/${users.a_root.id}/manager`, { data: { managerId: users.a_sub.id } })).status()).toBe(409)
})

test("[AUD-021][AFF-017][correction] boucle longue refusée", async ({ request }) => {
  await authenticate(request, 'a_hr')
  await db().query("UPDATE users SET role='manager' WHERE id=$1", [users.a_unrelated.id])
  expect((await request.put(`/api/hr/users/${users.a_root.id}/manager`, { data: { managerId: users.a_unrelated.id } })).status()).toBe(409)
})

test("[AUD-021][AFF-018][correction] deux affectations simultanées ne créent pas de boucle", async ({ request }) => {
  await authenticate(request, 'a_hr')
  await db().query('UPDATE users SET manager_id=NULL WHERE id=$1', [users.a_sub.id])
  const responses = await overlapping('users', () => Promise.all([
    request.put(`/api/hr/users/${users.a_root.id}/manager`, { data: { managerId: users.a_sub.id } }),
    request.put(`/api/hr/users/${users.a_sub.id}/manager`, { data: { managerId: users.a_root.id } }),
  ]))
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409])
})

test('[AUD-020][AFF-019][correction] erreurs JSON, structure, champ absent et identifiant sont différenciées', async ({ request }) => {
  await authenticate(request, 'a_hr')
  const errors: string[] = []
  for (const data of ['{', '[]', '{}', '{"managerId":"invalide"}']) {
    const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from(data) })
    expect.soft(response.status()).toBe(400)
    const body = await response.json()
    expect(typeof body.error).toBe('string')
    errors.push(body.code ?? body.error)
    expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBe(users.a_root.id)
  }
  expect(new Set(errors).size).toBe(4)
})
