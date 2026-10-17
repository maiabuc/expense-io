import { test, expect, loginPage } from '../support/fixtures'
import { users, notes } from '../support/data'
import { db } from '../support/database'

test("[AUD-011][NAV-001][reference] connexion et déconnexion dans le navigateur", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/expenses')
  await expect(page).toHaveURL(/\/login$/)
})

test("[AUD-011][NAV-002][reference] identifiants incorrects affichent un refus", async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(users.a_employee.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill('incorrect')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /incorrect|existe déjà|Nom requis/ })).toContainText('incorrect')
  await expect(page).toHaveURL(/\/login$/)
})

test("[AUD-011][NAV-003][reference] page /expenses protégée sans session", async ({ page }) => {
  await page.goto('/expenses')
  await expect(page).toHaveURL(/\/login$/)
})

test("[AUD-011][NAV-004][reference] page /manager protégée sans session", async ({ page }) => {
  await page.goto('/manager')
  await expect(page).toHaveURL(/\/login$/)
})

test("[AUD-011][NAV-005][reference] page /hr protégée sans session", async ({ page }) => {
  await page.goto('/hr')
  await expect(page).toHaveURL(/\/login$/)
})

test("[AUD-006][NAV-006][reference] employé sans accès à la page manager", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/manager')
  await expect(page.getByRole('heading', { name: 'Accès réservé aux managers' })).toBeVisible()
})

test("[AUD-006][NAV-007][reference] manager sans accès à la page RH", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/hr')
  await expect(page.getByRole('heading', { name: 'Accès réservé aux RH' })).toBeVisible()
})

test("[AUD-003][NAV-008][reference] création via formulaire visible après rechargement", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.getByLabel('Montant (€)', { exact: true }).fill('15.50')
  await page.getByLabel('Date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('Description', { exact: true }).fill('Repas navigateur CI')
  await page.getByLabel('Reçu (image ou PDF)', { exact: true }).setInputFiles('tests/fixtures/receipt.pdf')
  const response = page.waitForResponse(r => r.url().endsWith('/api/expense-notes') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Soumettre', exact: true }).click()
  expect((await response).status()).toBe(201)
  await expect(page.getByRole('row').filter({ hasText: 'Repas navigateur CI' })).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'Repas navigateur CI' })).toHaveCount(1)
  await expect(page.getByLabel('Montant (€)', { exact: true })).toHaveValue('')
})

test("[AUD-011][NAV-009][reference] historique et total propriétaire affichés", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await expect(page.getByText(/3 notes.*37,34/)).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Taxi employé B' })).toHaveCount(0)
})

test("[AUD-006][NAV-010][reference] reçu ouvert depuis son historique", async ({ page }) => {
  await loginPage(page, 'a_employee')
  const response = page.waitForResponse(r => r.url().endsWith(`/api/expense-notes/${notes.employee}/receipt-url`))
  await page.getByRole('row').filter({ hasText: 'Taxi employé A' }).getByRole('button', { name: 'Voir le reçu' }).click()
  expect((await response).status()).toBe(200)
  const url = (await (await response).json()).url
  expect((await page.request.get(url)).status()).toBe(200)
})

test("[AUD-007][NAV-011][reference] a_root décide par le navigateur : Approuver", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/manager')
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Approuver', exact: true }).click()
  await expect(row).toHaveCount(0)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.employee])).rows[0].status).toBe('approved')
})

test("[AUD-007][NAV-012][reference] a_root décide par le navigateur : Rejeter", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/manager')
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Rejeter', exact: true }).click()
  await expect(row).toHaveCount(0)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.employee])).rows[0].status).toBe('rejected')
})

test("[AUD-007][NAV-013][reference] a_hr décide par le navigateur : Approuver", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  const row = page.getByRole('row').filter({ hasText: 'Taxi manager racine A' })
  await row.getByRole('button', { name: 'Approuver', exact: true }).click()
  await expect(row).toHaveCount(0)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.root])).rows[0].status).toBe('approved')
})

test("[AUD-007][NAV-014][reference] a_hr décide par le navigateur : Rejeter", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  const row = page.getByRole('row').filter({ hasText: 'Taxi manager racine A' })
  await row.getByRole('button', { name: 'Rejeter', exact: true }).click()
  await expect(row).toHaveCount(0)
  expect((await db().query('SELECT status FROM expense_notes WHERE id=$1', [notes.root])).rows[0].status).toBe('rejected')
})

test("[AUD-006,AUD-020][NAV-015][reference] RH affecte puis retire explicitement un manager", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  const select = page.getByRole('row').filter({ hasText: users.a_employee.email }).getByRole('combobox')
  await select.selectOption(users.a_sub.id)
  await expect(select).toBeEnabled()
  await expect(select).toHaveValue(users.a_sub.id)
  await select.selectOption('')
  await expect(select).toBeEnabled()
  await expect(select).toHaveValue('')
  expect((await db().query('SELECT manager_id FROM users WHERE id=$1', [users.a_employee.id])).rows[0].manager_id).toBeNull()
})

test("[AUD-008][NAV-016][reference] OCR réel préremplit le montant et la date", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.getByLabel('Reçu (image ou PDF)', { exact: true }).setInputFiles('tests/fixtures/receipt.png')
  await page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true }).click()
  await expect(page.getByLabel('Montant (€)', { exact: true })).toHaveValue('42.5')
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-10-14')
})

test("[AUD-008][NAV-017][reference] absence de texte OCR permet la saisie manuelle", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.getByLabel('Reçu (image ou PDF)', { exact: true }).setInputFiles('tests/fixtures/blank.png')
  await page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true }).click()
  await expect(page.getByText(/Aucune information reconnue/)).toBeVisible()
  await page.getByLabel('Montant (€)', { exact: true }).fill('12.50')
  await expect(page.getByLabel('Montant (€)', { exact: true })).toHaveValue('12.50')
})

test("[AUD-017][NAV-018][reference] date calendaire préservée en Europe/Paris", async ({ page }) => {
  const browser = page.context().browser()
  if (!browser) throw new Error('Navigateur requis.')
  const context = await browser.newContext({ baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:13420', timezoneId: 'Europe/Paris', locale: 'fr-FR' })
  try {
    const tab = await context.newPage(); await loginPage(tab, 'a_employee')
    const row = tab.getByRole('row').filter({ hasText: 'Taxi employé A' })
    await expect(row.getByRole('cell').first()).toHaveText('1 oct. 2026')
  } finally { await context.close() }
})

test("[AUD-017][NAV-019][reference] date calendaire préservée en UTC", async ({ page }) => {
  const browser = page.context().browser()
  if (!browser) throw new Error('Navigateur requis.')
  const context = await browser.newContext({ baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:13420', timezoneId: 'UTC', locale: 'fr-FR' })
  try {
    const tab = await context.newPage(); await loginPage(tab, 'a_employee')
    const row = tab.getByRole('row').filter({ hasText: 'Taxi employé A' })
    await expect(row.getByRole('cell').first()).toHaveText('1 oct. 2026')
  } finally { await context.close() }
})

test("[AUD-017][NAV-020][correction] date calendaire préservée en America/Los_Angeles", async ({ page }) => {
  const browser = page.context().browser()
  if (!browser) throw new Error('Navigateur requis.')
  const context = await browser.newContext({ baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:13420', timezoneId: 'America/Los_Angeles', locale: 'fr-FR' })
  try {
    const tab = await context.newPage(); await loginPage(tab, 'a_employee')
    const row = tab.getByRole('row').filter({ hasText: 'Taxi employé A' })
    await expect(row.getByRole('cell').first()).toHaveText('1 oct. 2026')
  } finally { await context.close() }
})

test('[AUD-017][NAV-021][reference] minuit Paris conserve le jour calendaire du reçu', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T22:00:01Z') })
  await loginPage(page, 'a_employee')
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await expect(row.getByRole('cell').first()).toHaveText('1 oct. 2026')
  await page.getByLabel('Date', { exact: true }).fill('2026-10-15')
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-10-15')
})
