import { test, expect, loginPage } from '../support/fixtures'
import { users } from '../support/data'
import type { Page } from '@playwright/test'

async function fillNote(page: Page) {
  await page.getByLabel('Montant (€)', { exact: true }).fill('12.50')
  await page.getByLabel('Date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('Description', { exact: true }).fill('Saisie conservée CI')
  await page.getByLabel('Reçu (image ou PDF)', { exact: true }).setInputFiles('tests/fixtures/receipt.png')
}

test("[AUD-016][NET-001][correction] liste propriétaire : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.abort('failed')
  })
  await page.goto('/expenses')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-002][reference] liste propriétaire : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  await page.goto('/expenses')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-003][correction] liste propriétaire : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  await page.goto('/expenses')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-004][correction] soumission : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.abort('failed')
  })
  await fillNote(page)
  await page.getByRole('button', { name: 'Soumettre', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Soumettre', exact: true })).toBeEnabled()
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Saisie conservée CI')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-005][reference] soumission : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  await fillNote(page)
  await page.getByRole('button', { name: 'Soumettre', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Soumettre', exact: true })).toBeEnabled()
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Saisie conservée CI')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-006][correction] OCR : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes/receipt-suggestion', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.abort('failed')
  })
  await fillNote(page)
  await page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-007][reference] OCR : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes/receipt-suggestion', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  await fillNote(page)
  await page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-008][correction] OCR : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes/receipt-suggestion', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  await fillNote(page)
  await page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pré-remplir depuis le reçu', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-009][correction] reçu propriétaire : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes/10000000-0000-4000-8000-000000000301/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.abort('failed')
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-010][reference] reçu propriétaire : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes/10000000-0000-4000-8000-000000000301/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-011][correction] reçu propriétaire : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_employee')
  await page.goto('/expenses')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/expense-notes/10000000-0000-4000-8000-000000000301/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-012][correction] liste manager : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.abort('failed')
  })
  await page.goto('/manager')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-013][reference] liste manager : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  await page.goto('/manager')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-014][correction] liste manager : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  await page.goto('/manager')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-015][correction] décision manager : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/manager')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes/10000000-0000-4000-8000-000000000301/approve', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.abort('failed')
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Approuver', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Approuver', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-016][reference] décision manager : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/manager')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes/10000000-0000-4000-8000-000000000301/approve', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Approuver', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Approuver', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-017][correction] reçu manager : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/manager')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes/10000000-0000-4000-8000-000000000301/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.abort('failed')
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-018][reference] reçu manager : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/manager')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes/10000000-0000-4000-8000-000000000301/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-019][correction] reçu manager : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_root')
  await page.goto('/manager')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/manager/expense-notes/10000000-0000-4000-8000-000000000301/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi employé A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-020][correction] annuaire RH : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/users', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.abort('failed')
  })
  await page.goto('/hr')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-021][reference] annuaire RH : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/users', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  await page.goto('/hr')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-022][correction] annuaire RH : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/users', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  await page.goto('/hr')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-023][correction] liste RH : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.abort('failed')
  })
  await page.goto('/hr')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-024][reference] liste RH : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  await page.goto('/hr')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-025][correction] liste RH : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  await page.goto('/hr')
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-026][correction] affectation RH : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/users/10000000-0000-4000-8000-000000000104/manager', async route => {
    if (route.request().method() !== 'PUT') return route.continue()
    calls++; await route.abort('failed')
  })
  const select = page.getByRole('row').filter({ hasText: users.a_employee.email }).getByRole('combobox')
  await select.selectOption(users.a_sub.id)
  await expect(select).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-027][reference] affectation RH : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/users/10000000-0000-4000-8000-000000000104/manager', async route => {
    if (route.request().method() !== 'PUT') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  const select = page.getByRole('row').filter({ hasText: users.a_employee.email }).getByRole('combobox')
  await select.selectOption(users.a_sub.id)
  await expect(select).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-028][correction] décision RH : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes/10000000-0000-4000-8000-000000000304/approve', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.abort('failed')
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi manager racine A' })
  await row.getByRole('button', { name: 'Approuver', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Approuver', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-029][reference] décision RH : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes/10000000-0000-4000-8000-000000000304/approve', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi manager racine A' })
  await row.getByRole('button', { name: 'Approuver', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Approuver', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-030][correction] reçu RH : échec réseau visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes/10000000-0000-4000-8000-000000000304/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.abort('failed')
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi manager racine A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-031][reference] reçu RH : échec HTTP visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes/10000000-0000-4000-8000-000000000304/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur simulée CI' }) })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi manager racine A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})

test("[AUD-016][NET-032][correction] reçu RH : échec JSON illisible visible et récupérable", async ({ page }) => {
  await loginPage(page, 'a_hr')
  await page.goto('/hr')
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  let calls = 0
  await page.route(url => url.pathname === '/api/hr/expense-notes/10000000-0000-4000-8000-000000000304/receipt-url', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  const row = page.getByRole('row').filter({ hasText: 'Taxi manager racine A' })
  await row.getByRole('button', { name: 'Voir le reçu', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})
