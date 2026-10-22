// Crée le compte applicatif limité du harnais CI (membre de expense_app, sans privilège administrateur).
// Le compte de préparation (DATABASE_URL) reste celui des migrations, du seed et des fixtures.
import pg from 'pg'

const url = new URL(process.env.DATABASE_URL ?? '')
if (!url.pathname.startsWith('/expense_io_ci_') || process.env.ARLA_TEST_RUN !== '1') {
  throw new Error('Cible refusée : base CI isolée requise.')
}
const pool = new pg.Pool({ connectionString: url.toString() })
try {
  await pool.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ci_app_login') THEN
      CREATE ROLE ci_app_login LOGIN PASSWORD 'ci-app-only' NOSUPERUSER NOBYPASSRLS IN ROLE expense_app;
    END IF;
  END $$`)
} finally {
  await pool.end()
}
