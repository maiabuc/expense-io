import { test, expect, authenticate } from '../support/fixtures'
import { users, absent } from '../support/data'
import { db, overlapping } from '../support/database'
import { respondRefusal } from '../../src/lib/errors'

const managerOf = async (id: string) =>
  (await db().query('SELECT manager_id FROM users WHERE id=$1', [id])).rows[0].manager_id
const assign = (request: Parameters<typeof authenticate>[0], id: string, data: unknown, raw = false) =>
  request.put(`/api/hr/users/${id}/manager`, raw
    ? { headers: { 'Content-Type': 'application/json' }, data: data as string }
    : { data })

test('[AUD-020][AFF-020][correction] chaîne vide, booléen et objet comme managerId : 400 sans mutation', async ({ request }) => {
  await authenticate(request, 'a_hr')
  for (const data of ['{"managerId":""}', '{"managerId":true}', '{"managerId":{}}', '{"managerId":["x"]}']) {
    const response = await assign(request, users.a_employee.id, data, true)
    expect.soft(response.status(), data).toBe(400)
    expect((await response.json()).error).toBe("L'identifiant du manager est invalide.")
    expect(await managerOf(users.a_employee.id)).toBe(users.a_root.id)
  }
})

test('[AUD-020][AFF-021][correction] après une requête refusée, null explicite retire puis un manager valide réaffecte', async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await assign(request, users.a_employee.id, '{}', true)).status()).toBe(400)
  expect(await managerOf(users.a_employee.id)).toBe(users.a_root.id)
  const removed = await assign(request, users.a_employee.id, { managerId: null })
  expect(removed.status()).toBe(200)
  expect(await managerOf(users.a_employee.id)).toBeNull()
  expect((await assign(request, users.a_employee.id, { managerId: users.a_sub.id })).status()).toBe(200)
  expect(await managerOf(users.a_employee.id)).toBe(users.a_sub.id)
})

test('[AUD-006][AFF-022][correction] cible ou manager hors périmètre : refus sans mutation', async ({ request }) => {
  await authenticate(request, 'a_hr')
  const cases: [string, string | null, number][] = [
    [users.a_employee.id, users.b_root.id, 409], // manager d'une autre entreprise
    [users.a_employee.id, users.a_hr.id, 409], // manager qui n'a pas le rôle manager
    [users.a_employee.id, absent, 409], // manager inexistant
    [users.b_employee.id, users.a_root.id, 404], // cible d'une autre entreprise
    [users.a_hr.id, users.a_root.id, 404], // cible RH
    ['pas-un-uuid', users.a_root.id, 404], // identifiant de cible illisible
  ]
  for (const [target, managerId, status] of cases) {
    const before = (await db().query('SELECT id, manager_id FROM users ORDER BY id')).rows
    expect.soft((await assign(request, target, { managerId })).status(), `${target} -> ${managerId}`).toBe(status)
    expect((await db().query('SELECT id, manager_id FROM users ORDER BY id')).rows).toEqual(before)
  }
})

test('[AUD-021][AFF-023][correction] boucle refusée avec message dédié, liens valides conservés puis nouvelle affectation possible', async ({ request }) => {
  await authenticate(request, 'a_hr')
  const loop = await assign(request, users.a_root.id, { managerId: users.a_sub.id })
  expect(loop.status()).toBe(409)
  expect((await loop.json()).error).toBe('Cette affectation créerait une boucle entre managers.')
  expect(await managerOf(users.a_root.id)).toBeNull()
  expect(await managerOf(users.a_sub.id)).toBe(users.a_root.id)
  expect(await managerOf(users.a_employee.id)).toBe(users.a_root.id)
  expect((await assign(request, users.a_employee.id, { managerId: users.a_sub.id })).status()).toBe(200)
})

test('[AUD-021][AFF-024][reference] boucle historique déjà en base : le contrôle se termine et une affectation valide réussit', async ({ request }) => {
  await authenticate(request, 'a_hr')
  await db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.a_sub.id, users.a_root.id])
  const response = await assign(request, users.a_employee.id, { managerId: users.a_root.id })
  expect(response.status()).toBe(200)
  const selfAssignment = await assign(request, users.a_unrelated.id, { managerId: users.a_unrelated.id })
  expect(selfAssignment.status()).toBe(409)
})

test('[AUD-021][AFF-025][reference] deux affectations indépendantes simultanées réussissent toutes les deux', async ({ request }) => {
  await authenticate(request, 'a_hr')
  const responses = await overlapping('users', () => Promise.all([
    assign(request, users.a_employee.id, { managerId: users.a_sub.id }),
    assign(request, users.a_unrelated.id, { managerId: users.a_root.id }),
  ]))
  expect(responses.map(r => r.status())).toEqual([200, 200])
  expect(await managerOf(users.a_employee.id)).toBe(users.a_sub.id)
  expect(await managerOf(users.a_unrelated.id)).toBe(users.a_root.id)
})

test('[AUD-006][AFF-026][correction] la base refuse un manager d’une autre entreprise et l’auto-affectation, quel que soit le chemin', async () => {
  await expect(db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.b_root.id, users.a_employee.id])).rejects.toMatchObject({ code: '23503' })
  await expect(db().query('UPDATE users SET manager_id=$1 WHERE id=$1', [users.a_unrelated.id])).rejects.toMatchObject({ code: '23514' })
  await db().query('UPDATE users SET manager_id=NULL WHERE id=$1', [users.a_employee.id])
  await db().query('UPDATE users SET manager_id=$1 WHERE id=$2', [users.a_sub.id, users.a_employee.id])
  expect(await managerOf(users.a_employee.id)).toBe(users.a_sub.id)
})

test('[AUD-006][AFF-027][correction] la base refuse de changer l’entreprise d’un manager qui a des collaborateurs', async () => {
  await expect(db().query('UPDATE users SET company_id=$1 WHERE id=$2', [users.b_hr.company, users.a_root.id])).rejects.toMatchObject({ code: '23503' })
  expect((await db().query('SELECT company_id FROM users WHERE id=$1', [users.a_root.id])).rows[0].company_id).toBe(users.a_root.company)
})

test('[AUD-020][AFF-028][reference] panne pendant l’écriture : 500, aucune mutation, puis réessai réussi', async ({ request }) => {
  await authenticate(request, 'a_hr')
  await db().query(`CREATE OR REPLACE FUNCTION ci_fail_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'panne CI'; END $$`)
  await db().query('CREATE TRIGGER ci_assignment_failure BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION ci_fail_assignment()')
  try {
    const failed = await assign(request, users.a_employee.id, { managerId: users.a_sub.id })
    expect(failed.status()).toBe(500)
    expect(await managerOf(users.a_employee.id)).toBe(users.a_root.id)
  } finally {
    await db().query('DROP TRIGGER IF EXISTS ci_assignment_failure ON users')
  }
  expect((await assign(request, users.a_employee.id, { managerId: users.a_sub.id })).status()).toBe(200)
  expect(await managerOf(users.a_employee.id)).toBe(users.a_sub.id)
})

// Playwright sérialise en chaîne JSON toute donnée textuelle non analysable (« { » devient "{") :
// pour tester un JSON réellement illisible, les octets sont envoyés bruts.
test('[AUD-020][AFF-029][correction] JSON réellement illisible, corps non objet, champ absent et valeur invalide ont quatre messages distincts', async ({ request }) => {
  await authenticate(request, 'a_hr')
  const raw = async (body: string) => {
    const response = await request.put(`/api/hr/users/${users.a_employee.id}/manager`, { headers: { 'Content-Type': 'application/json' }, data: Buffer.from(body) })
    expect.soft(response.status(), body).toBe(400)
    return (await response.json()).error as string
  }
  const json = await raw('{')
  expect(await raw('')).toBe(json)
  expect(json).toBe("Le contenu de la requête n'est pas un JSON valide.")
  const structure = await raw('[]')
  for (const body of ['null', '42', '"texte"']) expect(await raw(body)).toBe(structure)
  const absent = await raw('{}')
  const invalid = await raw('{"managerId":"invalide"}')
  expect(new Set([json, structure, absent, invalid]).size).toBe(4)
  expect(await managerOf(users.a_employee.id)).toBe(users.a_root.id)
})

test('[AUD-020][AFF-030][correction] refus journalisé avec code, opération et statut, sans message public ni secret', async () => {
  const marker = 'FAKE_CI_PRIVATE_MARKER'
  const logged: string[] = []
  const original = console.warn
  console.warn = (line: unknown) => { logged.push(String(line)) }
  try {
    const response = respondRefusal(`MANAGER_TEST authorization: Bearer ${marker}`, 'Message public.', 409, 'hr/users/[id]/manager:PUT')
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Message public.' })
    expect(logged).toHaveLength(1)
    expect(logged[0]).not.toContain(marker)
    const record = JSON.parse(logged[0])
    expect(record).toMatchObject({ operation: 'hr/users/[id]/manager:PUT', status: 409 })
    expect(record.code).toContain('MANAGER_TEST')
    expect(record).not.toHaveProperty('message')
  } finally {
    console.warn = original
  }
})
