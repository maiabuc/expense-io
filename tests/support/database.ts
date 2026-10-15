import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { companies, users, notes, password } from './data'
import { testEnvironment } from './environment'

let pool: Pool | undefined
export function db() {
  if (!pool) pool = new Pool({ connectionString: testEnvironment().databaseURL, application_name: 'arla-tests', max: 5 })
  return pool
}
const hash = bcrypt.hashSync(password, 4) // Coût réduit des seules fixtures fictives ; authentification réelle conservée.

export async function resetDatabase() {
  const client = await db().connect()
  try {
    await client.query('DROP TRIGGER IF EXISTS ci_signup_failure ON users; DROP TRIGGER IF EXISTS ci_decision_barrier ON expense_notes; DROP TRIGGER IF EXISTS ci_manager_barrier ON users')
    await client.query('BEGIN')
    await client.query('TRUNCATE expense_notes, users, companies RESTART IDENTITY CASCADE')
    for (const [key, id] of Object.entries(companies)) {
      await client.query('INSERT INTO companies(id,name,email_domain) VALUES($1,$2,$3)', [id, `Entreprise ${key}`, `ci-${key}.invalid`])
    }
    for (const user of Object.values(users)) {
      await client.query('INSERT INTO users(id,company_id,name,email,password_hash,role,manager_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [user.id, user.company, user.name, user.email, hash, user.role, user.manager])
    }
    const rows = [
      [notes.employee, users.a_employee.id, 12.34, 'Taxi employé A', 'pending'],
      [notes.approved, users.a_employee.id, 20, 'Repas approuvé A', 'approved'],
      [notes.rejected, users.a_employee.id, 5, 'Dépense rejetée A', 'rejected'],
      [notes.root, users.a_root.id, 8, 'Taxi manager racine A', 'pending'],
      [notes.sub, users.a_sub.id, 7, 'Taxi manager subordonné A', 'pending'],
      [notes.unrelated, users.a_unrelated.id, 11, 'Taxi autre employé A', 'pending'],
      [notes.b_employee, users.b_employee.id, 13, 'Taxi employé B', 'pending'],
      [notes.b_root, users.b_root.id, 14, 'Taxi manager racine B', 'pending'],
    ]
    for (const [index, row] of rows.entries()) {
      await client.query(`INSERT INTO expense_notes(id,user_id,amount,description,status,expense_date,receipt_key,created_at)
        VALUES($1,$2,$3,$4,$5,'2026-10-01','ci-fixtures/receipt.png',$6)`, [...row, new Date(Date.UTC(2026, 9, 1, 12, index))])
    }
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}

export async function closeDatabase() { await pool?.end(); pool = undefined }

export async function waitFor(condition: () => Promise<boolean>, message: string, timeout = 10000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (await condition()) return
    await new Promise(resolve => setTimeout(resolve, 40))
  }
  throw new Error(message)
}

// Barrière contrôlée en DB : les deux requêtes HTTP sont engagées avant la libération.
export async function overlapping<T>(table: 'users' | 'expense_notes', operation: () => Promise<T>) {
  const client = await db().connect()
  const trigger = table === 'users' ? 'ci_manager_barrier' : 'ci_decision_barrier'
  await db().query(`CREATE OR REPLACE FUNCTION ci_wait_for_release() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN PERFORM pg_advisory_xact_lock(914007); RETURN NEW; END $$`)
  await db().query(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION ci_wait_for_release()`)
  await client.query('SELECT pg_advisory_lock(914007)')
  let operationResult: Promise<T> | undefined
  try {
    operationResult = operation()
    // Attacher immédiatement un gestionnaire : une erreur HTTP ne devient pas un rejet non géré.
    void operationResult.catch(() => {})
    await waitFor(async () => Number((await db().query(`SELECT COUNT(*) FROM pg_stat_activity
      WHERE datname=current_database() AND application_name <> 'arla-tests' AND wait_event_type='Lock'`)).rows[0].count) >= 2,
    'Les deux requêtes ne sont pas arrivées à la barrière DB.')
    await client.query('SELECT pg_advisory_unlock(914007)')
    return await operationResult
  } finally {
    await client.query('SELECT pg_advisory_unlock(914007)')
    await operationResult?.catch(() => {})
    await db().query(`DROP TRIGGER IF EXISTS ${trigger} ON ${table}`)
    client.release()
  }
}
