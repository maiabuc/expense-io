import { test, expect, authenticate } from '../support/fixtures'
import { users, notes, absent } from '../support/data'
import { db, overlapping } from '../support/database'
import { withMissingBucket, withRestrictedDatabase, withParisMidnight } from '../support/failure-server'
import { readFile } from 'node:fs/promises'

test('[AUD-003][PANNE-001][correction] une panne upload ne laisse pas une note pending sans reçu', async ({ request }) => {
  await authenticate(request, 'a_employee')
  await withMissingBucket(async base => {
    const response = await request.post(`${base}/api/expense-notes`, { multipart: { amount: '12', expenseDate: '2026-10-01', description: 'Panne CI',
      receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
    expect(response.status()).toBe(500)
    const rows = (await db().query("SELECT status,receipt_key FROM expense_notes WHERE description='Panne CI'")).rows
    expect(rows.some(row => row.status === 'pending' && !row.receipt_key)).toBe(false)
  })
})
test('[AUD-005][PANNE-002][correction] erreur de stockage sans détail technique public', async ({ request }) => {
  await authenticate(request, 'a_employee')
  await withMissingBucket(async base => {
    const response = await request.post(`${base}/api/expense-notes`, { multipart: { amount: '12', expenseDate: '2026-10-01', description: 'Panne contrôlée CI',
      receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
    const body = await response.json()
    expect(response.status()).toBe(500)
    expect(body).not.toHaveProperty('stack')
    expect(/NoSuchBucket|S3ServiceException/i.test(body.error)).toBe(false)
  })
})
test('[AUD-009][RLS-001][correction] le compte applicatif applique réellement RLS', async () => {
  const role = (await db().query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0]
  expect.soft(role.rolsuper || role.rolbypassrls).toBe(false)
  const tables = await db().query("SELECT relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner)=current_user AS owner FROM pg_class WHERE oid='expense_notes'::regclass")
  expect(tables.rows[0].relrowsecurity).toBe(true)
  expect(tables.rows[0].owner && !tables.rows[0].relforcerowsecurity).toBe(false)
})
test('[AUD-009][RLS-002][correction] une politique RH ne donne pas accès à une autre entreprise', async () => {
  await db().query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ci_enforced') THEN CREATE ROLE ci_enforced NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$`)
  await db().query('GRANT USAGE ON SCHEMA public TO ci_enforced; GRANT SELECT,INSERT,UPDATE ON users,companies,expense_notes TO ci_enforced; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ci_enforced')
  const client = await db().connect()
  try {
    await client.query('BEGIN'); await client.query('SET LOCAL ROLE ci_enforced')
    await client.query("SELECT set_config('app.current_user_id',$1,true)", [users.a_hr.id])
    const allowed = await client.query('SELECT id FROM expense_notes WHERE id=$1', [notes.root])
    const denied = await client.query('SELECT id FROM expense_notes WHERE id=$1', [notes.b_root])
    expect(allowed.rowCount).toBe(1)
    expect(denied.rowCount).toBe(0)
  } finally { await client.query('ROLLBACK'); client.release() }
})

test('[AUD-007][DEC-001][reference] approbation manager persistée puis répétition refusée', async ({ request }) => {
  await authenticate(request, 'a_root')
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(200)
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/approve`)).status()).toBe(409)
  expect((await request.post(`/api/manager/expense-notes/${notes.employee}/reject`)).status()).toBe(409)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.employee])).rows[0].status).toBe('approved')
})
test('[AUD-007][DEC-002][reference] rejet RH persisté puis répétition refusée', async ({ request }) => {
  await authenticate(request, 'a_hr')
  expect((await request.post(`/api/hr/expense-notes/${notes.root}/reject`)).status()).toBe(200)
  expect((await request.post(`/api/hr/expense-notes/${notes.root}/approve`)).status()).toBe(409)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.root])).rows[0].status).toBe('rejected')
})
test('[AUD-006][DEC-003][reference] manager ne décide pas une note étrangère ou absente', async ({ request }) => {
  await authenticate(request, 'a_root')
  for (const id of [notes.unrelated, notes.b_employee, absent]) {
    expect((await request.post(`/api/manager/expense-notes/${id}/approve`)).status()).toBe(404)
    expect((await request.post(`/api/manager/expense-notes/${id}/reject`)).status()).toBe(404)
  }
})
test('[AUD-006][DEC-004][reference] RH ne décide pas une note hors périmètre', async ({ request }) => {
  await authenticate(request, 'a_hr')
  for (const id of [notes.employee, notes.b_root, absent]) {
    expect((await request.post(`/api/hr/expense-notes/${id}/approve`)).status()).toBe(404)
    expect((await request.post(`/api/hr/expense-notes/${id}/reject`)).status()).toBe(404)
  }
})
test('[AUD-007][DEC-005][correction] deux décisions HTTP manager opposées ne s’écrasent pas', async ({ request }) => {
  await authenticate(request, 'a_root')
  const responses = await overlapping('expense_notes', () => Promise.all([
    request.post(`/api/manager/expense-notes/${notes.employee}/approve`), request.post(`/api/manager/expense-notes/${notes.employee}/reject`),
  ]))
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409])
})
test('[AUD-007][DEC-006][correction] deux décisions HTTP RH opposées ne s’écrasent pas', async ({ request }) => {
  await authenticate(request, 'a_hr')
  const responses = await overlapping('expense_notes', () => Promise.all([
    request.post(`/api/hr/expense-notes/${notes.root}/approve`), request.post(`/api/hr/expense-notes/${notes.root}/reject`),
  ]))
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409])
})
test('[AUD-007][DEC-007][correction] deux décisions HTTP identiques ont une seule gagnante', async ({ request }) => {
  await authenticate(request, 'a_root')
  const responses = await overlapping('expense_notes', () => Promise.all([
    request.post(`/api/manager/expense-notes/${notes.employee}/approve`), request.post(`/api/manager/expense-notes/${notes.employee}/approve`),
  ]))
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409])
})

test('[AUD-005][PANNE-003][correction] la panne produit un diagnostic interne structuré sans secret', async ({ request }) => {
  await authenticate(request, 'a_employee')
  await withMissingBucket(async (base, logs) => {
    const response = await request.post(`${base}/api/expense-notes`, { multipart: { amount: '12', expenseDate: '2026-10-01', description: 'Diagnostic CI',
      receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
    expect(response.status()).toBe(500)
    const records = logs().split('\n').flatMap(line => { try { return [JSON.parse(line)] } catch { return [] } })
    const diagnostic = records.find(row => typeof row.code === 'string' && typeof row.operation === 'string')
    expect(diagnostic, 'Code technique et opération attendus dans le journal interne.').toBeDefined()
    expect(JSON.stringify(diagnostic)).not.toMatch(/postgres:\/\/|X-Amz-Signature|session-token|authorization|password/i)
  })
})

async function restrictedClient() {
  await db().query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ci_enforced') THEN CREATE ROLE ci_enforced NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$`)
  await db().query('GRANT USAGE ON SCHEMA public TO ci_enforced; GRANT SELECT,INSERT,UPDATE ON users,companies,expense_notes TO ci_enforced; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ci_enforced')
  return db().connect()
}

test('[AUD-009][RLS-003][reference] contexte absent puis connexion réutilisée sans fuite du propriétaire', async () => {
  const client = await restrictedClient()
  try {
    await client.query('BEGIN'); await client.query('SET LOCAL ROLE ci_enforced')
    await client.query("SELECT set_config('app.current_user_id',$1,true)", [users.a_employee.id])
    expect((await client.query('SELECT id FROM expense_notes WHERE id=$1', [notes.employee])).rowCount).toBe(1)
    await client.query('COMMIT')
    await client.query('BEGIN'); await client.query('SET LOCAL ROLE ci_enforced')
    expect((await client.query('SELECT id FROM expense_notes')).rowCount).toBe(0)
    await client.query("SELECT set_config('app.current_user_id',$1,true)", [users.b_employee.id])
    expect((await client.query('SELECT id FROM expense_notes WHERE id=$1', [notes.employee])).rowCount).toBe(0)
    expect((await client.query('SELECT id FROM expense_notes WHERE id=$1', [notes.b_employee])).rowCount).toBe(1)
  } finally { await client.query('ROLLBACK'); client.release() }
})

test('[AUD-009][RLS-004][reference] propriétaire ne peut ni approuver sa note ni modifier librement son montant', async () => {
  const client = await restrictedClient()
  try {
    await client.query('BEGIN'); await client.query('SET LOCAL ROLE ci_enforced')
    await client.query("SELECT set_config('app.current_user_id',$1,true)", [users.a_employee.id])
    for (const sql of ["UPDATE expense_notes SET status='approved' WHERE id=$1", 'UPDATE expense_notes SET amount=1 WHERE id=$1']) {
      await client.query('SAVEPOINT denied_update')
      try { expect((await client.query(sql, [notes.employee])).rowCount).toBe(0) }
      catch (error) {
        // Le refus peut venir de RLS (zéro ligne) ou des privilèges de colonne.
        expect((error as { code?: string }).code).toBe('42501')
        await client.query('ROLLBACK TO SAVEPOINT denied_update')
      }
      await client.query('RELEASE SAVEPOINT denied_update')
    }
    const row = (await client.query('SELECT amount,status FROM expense_notes WHERE id=$1', [notes.employee])).rows[0]
    expect(row.status).toBe('pending')
    expect(Number(row.amount)).toBe(12.34)
  } finally { await client.query('ROLLBACK'); client.release() }
})

test('[AUD-009][RLS-005][correction] création et finalisation réussissent sans contourner RLS', async ({ request }) => {
  const client = await restrictedClient(); client.release()
  await db().query("ALTER ROLE ci_enforced LOGIN PASSWORD 'ci-restricted-only'")
  await authenticate(request, 'a_employee')
  await withRestrictedDatabase(async base => {
    const response = await request.post(`${base}/api/expense-notes`, { multipart: { amount: '12', expenseDate: '2026-10-01', description: 'Finalisation RLS CI',
      receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
    expect(response.status()).toBe(201)
    const note = await response.json()
    expect(note.status).toBe('pending')
    expect(note.receiptKey).toBeTruthy()
    const saved = (await db().query('SELECT receipt_key,status FROM expense_notes WHERE id=$1', [note.id])).rows[0]
    expect(saved.receipt_key).toBe(note.receiptKey)
    expect(saved.status).toBe('pending')
  })
})

test('[AUD-015][DATE-001][correction] à minuit Paris le serveur accepte aujourd’hui et refuse demain', async ({ request }) => {
  await authenticate(request, 'a_employee')
  await withParisMidnight(async (base, logs) => {
    expect(logs()).toContain('CI_CLOCK=2026-10-14T22:00:01.000Z')
    for (const [date, status] of [['2026-10-15', 201], ['2026-10-16', 400]] as const) {
      const response = await request.post(`${base}/api/expense-notes`, { multipart: { amount: '12', expenseDate: date, description: 'Minuit Paris CI',
        receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
      expect.soft(response.status()).toBe(status)
    }
    expect((await db().query("SELECT count(*)::int AS count FROM expense_notes WHERE description='Minuit Paris CI'")).rows[0].count).toBe(1)
  })
})
