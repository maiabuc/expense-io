import { test, expect, authenticate } from '../support/fixtures'
import { users, notes, absent } from '../support/data'
import { db } from '../support/database'

const statut = async (id: string) => (await db().query('SELECT status FROM expense_notes WHERE id=$1', [id])).rows[0].status as string

test('[AUD-007][DEC-010][reference] répétition séquentielle, identique ou opposée : 409 et décision initiale conservée', async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/reject`)).status()).toBe(200)
  for (const action of ['reject', 'approve']) expect((await request.post(`/api/manager/expense-notes/${notes.employee}/${action}`)).status()).toBe(409)
  expect(await statut(notes.employee)).toBe('rejected')
  await authenticate(request, 'a_hr')
  expect((await request.post(`/api/hr/expense-notes/${notes.root}/approve`)).status()).toBe(200)
  for (const action of ['approve', 'reject']) expect((await request.post(`/api/hr/expense-notes/${notes.root}/${action}`)).status()).toBe(409)
  expect(await statut(notes.root)).toBe('approved')
})

test('[AUD-007][DEC-011][reference] note incomplète : ni le manager ni le RH ne peuvent la décider', async ({ request }) => {
  await db().query("UPDATE expense_notes SET status='incomplete' WHERE id IN ($1, $2)", [notes.employee, notes.root])
  await authenticate(request, 'a_root')
  for (const action of ['approve', 'reject']) expect((await request.post(`/api/manager/expense-notes/${notes.employee}/${action}`)).status()).toBe(409)
  await authenticate(request, 'a_hr')
  for (const action of ['approve', 'reject']) expect((await request.post(`/api/hr/expense-notes/${notes.root}/${action}`)).status()).toBe(409)
  expect(await statut(notes.employee)).toBe('incomplete')
  expect(await statut(notes.root)).toBe('incomplete')
})

test('[AUD-007,AUD-009][DEC-012][reference] les décisions HTTP s’exécutent sous le compte applicatif limité, pas sous le compte de préparation', async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(200)
  const comptes = (await db().query(`SELECT DISTINCT usename FROM pg_stat_activity
    WHERE datname = current_database() AND application_name <> 'arla-tests' AND usename IS NOT NULL`)).rows.map(row => row.usename)
  expect(comptes).toContain('ci_app_login')
  expect(comptes).not.toContain('expense')
})

test('[AUD-007][DEC-013][reference] rattachement modifié avant la décision : autorisation relue à l’écriture, 404 sans mutation', async ({ request }) => {
  await authenticate(request, 'a_root')
  await db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.a_sub.id, users.a_employee.id])
  for (const action of ['approve', 'reject']) expect((await request.post(`/api/manager/expense-notes/${notes.employee}/${action}`)).status()).toBe(404)
  expect(await statut(notes.employee)).toBe('pending')
  await authenticate(request, 'a_hr')
  await db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.a_hr.id, users.a_root.id]) // le manager n'est plus racine
  for (const action of ['approve', 'reject']) expect((await request.post(`/api/hr/expense-notes/${notes.root}/${action}`)).status()).toBe(404)
  expect(await statut(notes.root)).toBe('pending')
})

test('[AUD-007][DEC-014][correction] quatre décisions simultanées (deux approbations, deux rejets) : une seule gagnante, les autres en 409', async ({ request }) => {
  await authenticate(request, 'a_root')
  const responses = await Promise.all(['approve', 'reject', 'approve', 'reject'].map(action => request.post(`/api/manager/expense-notes/${notes.employee}/${action}`)))
  const statuts = responses.map(r => r.status()).sort()
  expect(statuts).toEqual([200, 409, 409, 409])
  const gagnante = responses.find(r => r.status() === 200)!
  expect((await gagnante.json()).status).toBe(await statut(notes.employee))
  await authenticate(request, 'a_hr')
  const rh = await Promise.all(['reject', 'approve', 'reject'].map(action => request.post(`/api/hr/expense-notes/${notes.root}/${action}`)))
  expect(rh.map(r => r.status()).sort()).toEqual([200, 409, 409])
  expect((await rh.find(r => r.status() === 200)!.json()).status).toBe(await statut(notes.root))
})

test('[AUD-007][DEC-015][reference] panne pendant l’écriture : 500, note toujours pending, puis décision possible', async ({ request }) => {
  await authenticate(request, 'a_root')
  await db().query(`CREATE OR REPLACE FUNCTION ci_fail_decision() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'panne CI'; END $$`)
  await db().query('CREATE TRIGGER ci_decision_failure BEFORE UPDATE ON expense_notes FOR EACH ROW EXECUTE FUNCTION ci_fail_decision()')
  try {
    expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(500)
    expect(await statut(notes.employee)).toBe('pending')
  } finally { await db().query('DROP TRIGGER IF EXISTS ci_decision_failure ON expense_notes') }
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(200)
})

test('[AUD-007][DEC-016][correction] identifiant illisible ou note absente : 404 sans révéler d’état, aucune mutation', async ({ request }) => {
  await authenticate(request, 'a_root')
  for (const id of ['pas-un-uuid', absent, notes.b_employee]) {
    expect.soft((await request.post(`/api/manager/expense-notes/${id}/approve`)).status(), id).toBe(404)
  }
  await authenticate(request, 'a_hr')
  for (const id of ['pas-un-uuid', absent, notes.b_root, notes.employee]) {
    expect.soft((await request.post(`/api/hr/expense-notes/${id}/reject`)).status(), id).toBe(404)
  }
  expect(await statut(notes.b_employee)).toBe('pending')
  expect(await statut(notes.b_root)).toBe('pending')
})

test('[AUD-007][DEC-017][reference] mauvais rôle et anonyme : gardes conservées, aucune décision', async ({ request }) => {
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(401)
  expect((await request.post(`/api/hr/expense-notes/${notes.root}/approve`)).status()).toBe(403)
  await authenticate(request, 'a_employee')
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(401)
  expect((await request.post(`/api/hr/expense-notes/${notes.root}/reject`)).status()).toBe(403)
  await authenticate(request, 'a_hr')
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(401)
  await authenticate(request, 'a_root')
  expect((await request.post(`/api/hr/expense-notes/${notes.root}/approve`)).status()).toBe(403)
  expect(await statut(notes.employee)).toBe('pending')
  expect(await statut(notes.root)).toBe('pending')
})
