import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resetDatabase, closeDatabase } from './database'
import { users, password, type UserKey, type ExpenseNoteResponse } from './data'

export const test = base.extend<{ isolatedState: void }>({
  // Chaque scénario repart d'un état connu ; un échec de test ne pollue pas le suivant.
  isolatedState: [async ({ request }, use) => { void request; await resetDatabase(); await use() }, { auto: true }],
})
export { expect }
test.afterAll(async () => { await closeDatabase() })

export async function authenticate(request: APIRequestContext, key: UserKey, credential = password) {
  const csrf = await request.get('/api/auth/csrf')
  const { csrfToken } = await csrf.json()
  await request.post('/api/auth/callback/credentials', { form: { email: users[key].email, password: credential, csrfToken,
    callbackUrl: '/expenses' }, maxRedirects: 0 })
  const session = await request.get('/api/auth/session')
  return session.json()
}
export async function loginPage(page: Page, key: UserKey) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(users[key].email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page).toHaveURL(/\/expenses$/)
  await expect(page.getByRole('heading', { name: 'Mes notes de frais', exact: true })).toBeVisible()
}
export async function submit(request: APIRequestContext, fields: Record<string, string> = {}, file = 'receipt.png', mime = 'image/png') {
  return request.post('/api/expense-notes', { multipart: {
    amount: '15.50', expenseDate: '2026-10-01', description: 'Soumission CI', ...fields,
    receipt: { name: file, mimeType: mime, buffer: await readFile(`tests/fixtures/${file}`) },
  } })
}
export async function ownNotes(request: APIRequestContext): Promise<ExpenseNoteResponse[]> {
  const response = await request.get('/api/expense-notes'); expect(response.status()).toBe(200)
  return response.json()
}
