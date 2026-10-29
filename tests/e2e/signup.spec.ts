import { test, expect } from '../support/fixtures'
import { users, password } from '../support/data'
import { db } from '../support/database'
import type { Page } from '@playwright/test'

async function fillSignup(page: Page, email: string, name = 'Nouvel employé CI', credential = password) {
  await page.goto('/signup')
  await page.getByLabel('Nom', { exact: true }).fill(name)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(credential)
}
test('[AUD-013,AUD-019][INS-001][reference] nouvelle entreprise avec premier RH et connexion', async ({ page }) => {
  await fillSignup(page, 'rh@ci-nouvelle.invalid')
  await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
  await expect(page).toHaveURL(/\/expenses$/)
  const rows = (await db().query("SELECT u.role,c.email_domain FROM users u JOIN companies c ON c.id=u.company_id WHERE u.email='rh@ci-nouvelle.invalid'")).rows
  expect(rows).toEqual([{ role: 'hr_admin', email_domain: 'ci-nouvelle.invalid' }])
})
test('[AUD-013,AUD-019][INS-002][reference] domaine existant rejoint comme employé', async ({ page }) => {
  await fillSignup(page, 'nouveau@ci-a.invalid')
  await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
  await expect(page).toHaveURL(/\/expenses$/)
  expect((await db().query("SELECT role,company_id FROM users WHERE email='nouveau@ci-a.invalid'")).rows).toEqual([{ role: 'employee', company_id: users.a_employee.company }])
})
test('[AUD-013][INS-003][reference] email déjà utilisé refusé sans doublon', async ({ page }) => {
  await fillSignup(page, users.a_employee.email)
  await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /incorrect|existe déjà|Nom requis/ })).toContainText('existe déjà')
  expect(Number((await db().query('SELECT COUNT(*) FROM users WHERE email=$1', [users.a_employee.email])).rows[0].count)).toBe(1)
})
test('[AUD-013][INS-004][reference] nom vide côté serveur refusé', async ({ page }) => {
  await fillSignup(page, 'vide@ci-invalide.invalid', '   ')
  await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /incorrect|existe déjà|Nom requis/ })).toContainText('Nom requis')
  expect(Number((await db().query("SELECT COUNT(*) FROM users WHERE email='vide@ci-invalide.invalid'")).rows[0].count)).toBe(0)
})
test('[AUD-013][INS-005][reference] mot de passe trop court empêche la création', async ({ page }) => {
  await fillSignup(page, 'court@ci-invalide.invalid', 'Employé CI', 'court')
  await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
  expect(await page.getByLabel('Mot de passe', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true)
  expect(Number((await db().query("SELECT COUNT(*) FROM users WHERE email='court@ci-invalide.invalid'")).rows[0].count)).toBe(0)
})
test('[AUD-013][INS-006][correction] panne de création du compte ne laisse pas une entreprise orpheline', async ({ page }) => {
  await db().query(`CREATE OR REPLACE FUNCTION ci_signup_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.email='panne@ci-panne.invalid' THEN RAISE EXCEPTION 'Panne contrôlée CI'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER ci_signup_failure BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION ci_signup_failure()`)
  await fillSignup(page, 'panne@ci-panne.invalid')
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/signup' && r.request().method() === 'POST')
  await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
  await response
  expect(Number((await db().query("SELECT COUNT(*) FROM companies WHERE email_domain='ci-panne.invalid'")).rows[0].count)).toBe(0)
})
test('[AUD-013][INS-007][reference] inscriptions simultanées donnent un seul premier RH', async ({ page, browser }) => {
  const second = await browser.newContext({ baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:13420' })
  try {
    const tab = await second.newPage()
    await fillSignup(page, 'premier@ci-concurrent.invalid'); await fillSignup(tab, 'second@ci-concurrent.invalid')
    await Promise.all([page.getByRole('button', { name: "S'inscrire", exact: true }).click(), tab.getByRole('button', { name: "S'inscrire", exact: true }).click()])
    await expect(page).toHaveURL(/\/expenses$/); await expect(tab).toHaveURL(/\/expenses$/)
    const rows = (await db().query("SELECT role FROM users WHERE email LIKE '%@ci-concurrent.invalid' ORDER BY role")).rows
    expect(rows).toEqual([{ role: 'employee' }, { role: 'hr_admin' }])
  } finally { await second.close() }
})

test('[AUD-013][INS-008][reference] un échec de connexion automatique ne supprime pas le compte validé', async ({ page }) => {
  // Défaillance contrôlée de l'authentification du seul compte fictif après son insertion.
  await db().query(`CREATE OR REPLACE FUNCTION ci_login_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.email='login-failure@ci-login-fault.invalid' THEN NEW.password_hash='hachage-invalide-ci'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER ci_login_failure BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION ci_login_failure()`)
  try {
    await fillSignup(page, 'login-failure@ci-login-fault.invalid')
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/signup' && r.request().method() === 'POST')
    await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
    await response
    expect((await db().query("SELECT u.role,c.email_domain FROM users u JOIN companies c ON c.id=u.company_id WHERE u.email='login-failure@ci-login-fault.invalid'")).rows)
      .toEqual([{ role: 'hr_admin', email_domain: 'ci-login-fault.invalid' }])
    expect((await (await page.request.get('/api/auth/session')).json())?.user).toBeUndefined()
  } finally { await db().query('DROP TRIGGER IF EXISTS ci_login_failure ON users') }
})

test('[AUD-027,AUD-030][EMAIL-008][correction] email surdimensionné refusé par le serveur sans création de compte ou entreprise', async ({ page }) => {
  const domain = 'ci-email-borne.invalid'
  const email = `${'a'.repeat(4097 - domain.length - 1)}@${domain}`
  expect(email).toHaveLength(4097)
  const before = (await db().query(`SELECT
    (SELECT count(*)::int FROM users) AS users,
    (SELECT count(*)::int FROM companies) AS companies`)).rows[0]
  await fillSignup(page, email)
  // Neutraliser les contraintes HTML pour vérifier la validation de l'action serveur.
  await page.getByLabel('Email', { exact: true }).evaluate((input: HTMLInputElement) => {
    input.type = 'text'
    input.removeAttribute('maxlength')
    if (input.form) input.form.noValidate = true
  })
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/signup' && r.request().method() === 'POST')
  await page.getByRole('button', { name: "S'inscrire", exact: true }).click()
  await response
  // Le route-announcer de Next possède aussi role=alert : cibler le formulaire.
  const formError = page.getByRole('main').getByRole('alert')
  await expect(formError).toHaveCount(1)
  await expect(formError).toContainText('email invalide')
  await expect(page).toHaveURL(/\/signup$/)
  const after = (await db().query(`SELECT
    (SELECT count(*)::int FROM users) AS users,
    (SELECT count(*)::int FROM companies) AS companies`)).rows[0]
  expect(after).toEqual(before)
  expect((await db().query('SELECT id FROM users WHERE email=$1', [email])).rows).toEqual([])
  expect((await db().query('SELECT id FROM companies WHERE email_domain=$1', [domain])).rows).toEqual([])
})
