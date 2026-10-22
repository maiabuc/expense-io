import { readFile } from 'node:fs/promises'
import { test, expect, loginPage, authenticate } from '../support/fixtures'
import { db } from '../support/database'
import { users } from '../support/data'
import { withMissingBucket } from '../support/failure-server'

const CLE = 'cccccccc-0000-4000-8000-000000000001'

test("[AUD-003][NAV-030][correction] soumission incomplète : libellé, total exclu, « Reprendre » dans le formulaire existant puis finalisation", async ({ page, request }) => {
  // Panne de stockage réelle sur l'instance de panne : la note reste incomplète.
  await authenticate(request, 'a_employee')
  await withMissingBucket(async (base) => {
    const response = await request.post(`${base}/api/expense-notes`, { headers: { 'Idempotency-Key': CLE }, multipart: {
      amount: '21.30', expenseDate: '2026-10-02', description: 'Reprise navigateur CI',
      receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
    expect(response.status()).toBe(500)
  })
  await loginPage(page, 'a_employee')
  const ligne = page.getByRole('row').filter({ hasText: 'Reprise navigateur CI' })
  await expect(ligne).toHaveCount(1)
  await expect(ligne.getByText('incomplète', { exact: true })).toBeVisible()
  await expect(ligne.getByRole('button', { name: 'Voir le reçu' })).toHaveCount(0)
  await expect(page.getByText(/3 notes.*37,34/)).toBeVisible() // l'incomplète n'entre ni dans le nombre ni dans le total
  await ligne.getByRole('button', { name: 'Reprendre', exact: true }).click()
  await expect(page.getByLabel('Montant (€)', { exact: true })).toHaveValue('21.3')
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-10-02')
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Reprise navigateur CI')
  await page.getByLabel('Reçu (image ou PDF)', { exact: true }).setInputFiles('tests/fixtures/receipt.png')
  const reponse = page.waitForResponse(r => r.url().endsWith('/api/expense-notes') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Soumettre', exact: true }).click()
  expect((await reponse).status()).toBe(201)
  await expect(page.getByRole('row').filter({ hasText: 'Reprise navigateur CI' })).toHaveCount(1)
  await expect(ligne.getByText('en attente', { exact: true })).toBeVisible()
  await expect(page.getByText(/4 notes/)).toBeVisible()
  expect((await db().query("SELECT id FROM expense_notes WHERE user_id=$1 AND description='Reprise navigateur CI'", [users.a_employee.id])).rowCount).toBe(1)
})

test("[AUD-003][NAV-031][correction] la même clé est réutilisée après un échec réseau, puis effacée après le succès", async ({ page }) => {
  await loginPage(page, 'a_employee')
  const cles: (string | undefined)[] = []
  let appels = 0
  await page.route(url => url.pathname === '/api/expense-notes', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    cles.push(route.request().headers()['idempotency-key'])
    if (++appels === 1) return route.abort('failed')
    return route.continue()
  })
  await page.getByLabel('Montant (€)', { exact: true }).fill('9.90')
  await page.getByLabel('Date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('Description', { exact: true }).fill('Clé conservée CI')
  await page.getByLabel('Reçu (image ou PDF)', { exact: true }).setInputFiles('tests/fixtures/receipt.png')
  await page.getByRole('button', { name: 'Soumettre', exact: true }).click()
  const nombreDeCles = () => page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('expense-request:')).length)
  await expect.poll(() => cles.length).toBe(1)
  await expect(page.getByRole('alert').filter({ hasText: /soumission/i })).toBeVisible()
  expect(await nombreDeCles()).toBe(1)
  const reponse = page.waitForResponse(r => r.url().endsWith('/api/expense-notes') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Soumettre', exact: true }).click()
  expect((await reponse).status()).toBe(201)
  expect(cles).toHaveLength(2)
  expect(cles[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(cles[1]).toBe(cles[0])
  expect(await nombreDeCles()).toBe(0)
  expect((await db().query("SELECT id FROM expense_notes WHERE description='Clé conservée CI'")).rowCount).toBe(1)
})

async function repriseSansStockage(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext, montant: string) {
  await authenticate(request, 'a_employee')
  await withMissingBucket(async base => {
    const response = await request.post(`${base}/api/expense-notes`, { headers: { 'Idempotency-Key': CLE }, multipart: {
      amount: montant, expenseDate: '2026-10-02', description: 'Précision conservée CI',
      receipt: { name: 'receipt.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/receipt.png') } } })
    expect(response.status()).toBe(500)
  })
  await loginPage(page, 'a_employee')
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  const ligne = page.getByRole('row').filter({ hasText: 'Précision conservée CI' })
  await ligne.getByRole('button', { name: 'Reprendre', exact: true }).click()
  await expect(page.getByLabel('Montant (€)', { exact: true })).toHaveValue(montant)
  await page.getByLabel('Reçu (image ou PDF)', { exact: true }).setInputFiles('tests/fixtures/receipt.png')
  const reponse = page.waitForResponse(r => r.url().endsWith('/api/expense-notes') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Soumettre', exact: true }).click()
  expect((await reponse).status()).toBe(201)
  await expect(ligne.getByText('en attente', { exact: true })).toBeVisible()
  expect((await db().query('SELECT id FROM expense_notes WHERE request_key=$1', [CLE])).rowCount).toBe(1)
}

test('[AUD-003][NAV-032][correction] stockage navigateur perdu : reprise du montant original avant arrondi', async ({ page, request }) => {
  await repriseSansStockage(page, request, '12.345')
})

test('[AUD-003][NAV-033][correction] stockage navigateur perdu : reprise d’un montant positif inférieur au centime', async ({ page, request }) => {
  await repriseSansStockage(page, request, '0.001')
})
