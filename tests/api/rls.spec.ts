import type { PoolClient } from 'pg'
import { test, expect } from '../support/fixtures'
import { users, notes } from '../support/data'
import { db, appDb } from '../support/database'

// Toutes les assertions de ce fichier s'exécutent avec le compte applicatif limité (RLS réellement appliquée) ;
// db() ne sert qu'à préparer les fixtures.
async function sousIdentite<T>(userId: string | null, operation: (client: PoolClient) => Promise<T>) {
  const client = await appDb().connect()
  try {
    await client.query('BEGIN')
    if (userId) await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId])
    return await operation(client)
  } finally { await client.query('ROLLBACK'); client.release() }
}
// Exécute une instruction et rend le nombre de lignes ou le code d'erreur PostgreSQL.
async function essai(client: PoolClient, sql: string, params: unknown[] = []) {
  await client.query('SAVEPOINT essai')
  try { return { lignes: (await client.query(sql, params)).rowCount } }
  catch (error) { await client.query('ROLLBACK TO SAVEPOINT essai'); return { code: (error as { code?: string }).code } }
}
// Donnée historique que d'éventuelles contraintes de hiérarchie refusent : clés étrangères suspendues le temps de la transaction.
async function historique(sql: string, params: unknown[]) {
  const client = await db().connect()
  try {
    await client.query('BEGIN'); await client.query('SET LOCAL session_replication_role = replica')
    await client.query(sql, params); await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}
async function incompleteDe(userId: string, statut = 'incomplete') {
  const id = '20000000-0000-4000-8000-000000000001'
  await db().query(`INSERT INTO expense_notes (id, user_id, amount, expense_date, description, receipt_key, status)
    VALUES ($1, $2, 9.9, '2026-10-01', 'Brouillon CI', 'receipts/9100.png', $3)`, [id, userId, statut])
  return id
}

test('[AUD-009][RLS-006][correction] le compte applicatif n’a de droits que sur les colonnes de finalisation', async () => {
  const role = (await appDb().query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user')).rows[0]
  expect(role).toEqual({ rolsuper: false, rolbypassrls: false })
  const privilege = async (colonne: string) => (await appDb().query("SELECT has_column_privilege(current_user, 'expense_notes', $1, 'UPDATE') AS ok", [colonne])).rows[0].ok
  for (const colonne of ['amount', 'user_id', 'expense_date', 'description', 'created_at', 'receipt_seq', 'request_key', 'request_fingerprint', 'receipt_sha256', 'receipt_size']) {
    expect(await privilege(colonne), colonne).toBe(false)
  }
  for (const colonne of ['receipt_key', 'status', 'claim_token', 'claim_expires_at']) expect(await privilege(colonne), colonne).toBe(true)
  expect((await appDb().query("SELECT has_table_privilege(current_user, 'expense_notes', 'DELETE') AS ok")).rows[0].ok).toBe(false)
})

test('[AUD-009][RLS-007][correction] propriétaire : finalisation de sa note incomplète permise, auto-approbation et colonnes protégées refusées', async () => {
  const id = await incompleteDe(users.a_employee.id)
  await sousIdentite(users.a_employee.id, async (client) => {
    for (const sql of ['UPDATE expense_notes SET amount = 1 WHERE id = $1', "UPDATE expense_notes SET user_id = '" + users.b_employee.id + "' WHERE id = $1",
      "UPDATE expense_notes SET description = 'x' WHERE id = $1", 'DELETE FROM expense_notes WHERE id = $1']) {
      expect((await essai(client, sql, [id])).code, sql).toBe('42501')
    }
    expect((await essai(client, "UPDATE expense_notes SET status = 'approved' WHERE id = $1", [id])).code).toBe('42501')
    expect((await essai(client, "UPDATE expense_notes SET status = 'rejected' WHERE id = $1", [id])).code).toBe('42501')
    expect((await essai(client, "UPDATE expense_notes SET status = 'pending', receipt_key = 'receipts/9100.png' WHERE id = $1", [id])).lignes).toBe(1)
    // Une fois finalisée, la note n'est plus modifiable par son propriétaire.
    expect((await essai(client, "UPDATE expense_notes SET status = 'pending' WHERE id = $1", [id])).lignes).toBe(0)
    expect((await essai(client, "UPDATE expense_notes SET receipt_key = 'receipts/x.png' WHERE id = $1", [id])).lignes).toBe(0)
  })
})

test('[AUD-009][RLS-008][correction] création : seulement une soumission incomplète à son nom', async () => {
  await sousIdentite(users.a_employee.id, async (client) => {
    const colonnes = '(user_id, amount, expense_date, description, receipt_key, status)'
    expect((await essai(client, `INSERT INTO expense_notes ${colonnes} VALUES ($1, 5, '2026-10-01', 'CI', '', 'pending')`, [users.a_employee.id])).code).toBe('42501')
    expect((await essai(client, `INSERT INTO expense_notes ${colonnes} VALUES ($1, 5, '2026-10-01', 'CI', '', 'incomplete')`, [users.b_employee.id])).code).toBe('42501')
    expect((await essai(client, `INSERT INTO expense_notes ${colonnes} VALUES ($1, 5, '2026-10-01', 'CI', '', 'incomplete')`, [users.a_employee.id])).lignes).toBe(1)
  })
})

test('[AUD-009][RLS-009][correction] autre propriétaire : ni lecture ni finalisation de la note incomplète d’autrui', async () => {
  const id = await incompleteDe(users.a_employee.id)
  await sousIdentite(users.b_employee.id, async (client) => {
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [id])).rowCount).toBe(0)
    expect((await essai(client, "UPDATE expense_notes SET status = 'pending' WHERE id = $1", [id])).lignes).toBe(0)
  })
})

test('[AUD-009][RLS-010][correction] manager et RH : décision seulement sur une note pending de leur périmètre, jamais sur une incomplète', async () => {
  const incomplete = await incompleteDe(users.a_employee.id)
  await sousIdentite(users.a_root.id, async (client) => {
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [incomplete])).rowCount).toBe(1)
    expect((await essai(client, "UPDATE expense_notes SET status = 'approved' WHERE id = $1", [incomplete])).lignes).toBe(0)
    expect((await essai(client, "UPDATE expense_notes SET status = 'pending' WHERE id = $1", [notes.employee])).code).toBe('42501')
    expect((await essai(client, "UPDATE expense_notes SET status = 'approved' WHERE id = $1", [notes.unrelated])).lignes).toBe(0)
    expect((await essai(client, 'UPDATE expense_notes SET amount = 1 WHERE id = $1', [notes.employee])).code).toBe('42501')
    expect((await essai(client, "UPDATE expense_notes SET status = 'approved' WHERE id = $1", [notes.employee])).lignes).toBe(1)
  })
  await sousIdentite(users.a_hr.id, async (client) => {
    expect((await essai(client, "UPDATE expense_notes SET status = 'rejected' WHERE id = $1", [notes.b_root])).lignes).toBe(0)
    expect((await essai(client, "UPDATE expense_notes SET status = 'pending' WHERE id = $1", [notes.root])).code).toBe('42501')
    expect((await essai(client, "UPDATE expense_notes SET status = 'rejected' WHERE id = $1", [notes.root])).lignes).toBe(1)
    expect((await essai(client, "UPDATE expense_notes SET status = 'rejected' WHERE id = $1", [notes.employee])).lignes).toBe(0)
  })
})

test('[AUD-009][RLS-011][correction] relation manager interentreprises ou rôle retiré : plus aucun droit sur les notes', async () => {
  await historique('UPDATE users SET manager_id = $1 WHERE id = $2', [users.b_root.id, users.a_employee.id])
  await sousIdentite(users.b_root.id, async (client) => {
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [notes.employee])).rowCount).toBe(0)
    expect((await essai(client, "UPDATE expense_notes SET status = 'approved' WHERE id = $1", [notes.employee])).lignes).toBe(0)
  })
  await db().query("UPDATE users SET role = 'employee' WHERE id = $1", [users.a_root.id])
  await sousIdentite(users.a_root.id, async (client) => {
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [notes.sub])).rowCount).toBe(0)
  })
  await db().query("UPDATE users SET role = 'employee' WHERE id = $1", [users.a_hr.id])
  await sousIdentite(users.a_hr.id, async (client) => {
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [notes.root])).rowCount).toBe(0)
  })
})

test('[AUD-009][RLS-012][correction] contexte absent ou connexion réutilisée : aucune ligne, aucun propriétaire hérité', async () => {
  await sousIdentite(users.a_employee.id, async (client) => {
    expect((await client.query('SELECT id FROM expense_notes')).rowCount).toBeGreaterThan(0)
  })
  const client = await appDb().connect()
  try {
    // Même connexion physique après un COMMIT : le contexte local à la transaction a disparu.
    await client.query('BEGIN'); await client.query("SELECT set_config('app.current_user_id', $1, true)", [users.a_employee.id])
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [notes.employee])).rowCount).toBe(1)
    await client.query('COMMIT')
    expect((await client.query('SELECT id FROM expense_notes')).rowCount).toBe(0)
    expect((await client.query("SELECT current_setting('app.current_user_id', true) AS valeur")).rows[0].valeur ?? '').toBe('')
  } finally { client.release() }
})

test('[AUD-009][RLS-013][correction] une politique par action, aucune politique permissive parallèle', async () => {
  const policies = (await db().query("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'expense_notes' ORDER BY policyname")).rows
  expect(policies.map(p => `${p.policyname}:${p.cmd}`)).toEqual([
    'expense_notes_hr_root_manager_select:SELECT', 'expense_notes_hr_root_manager_update:UPDATE',
    'expense_notes_manager_select:SELECT', 'expense_notes_manager_update:UPDATE',
    'expense_notes_owner_finalize:UPDATE', 'expense_notes_owner_insert:INSERT', 'expense_notes_owner_select:SELECT',
  ])
  for (const p of policies) expect(`${p.qual ?? ''}${p.with_check ?? ''}`, p.policyname).not.toMatch(/^\(?true\)?$/i)
  for (const p of policies.filter(p => p.cmd === 'UPDATE')) expect(p.with_check, p.policyname).toBeTruthy()
  for (const p of policies.filter(p => p.policyname.includes('hr_root') || p.policyname.includes('manager_'))) {
    expect(`${p.qual}${p.with_check}`, p.policyname).toContain('company_id')
  }
})
