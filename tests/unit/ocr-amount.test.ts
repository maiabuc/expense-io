import { test, expect, vi } from 'vitest'
import { suggestFields } from '../../src/lib/ocr'

// Le moteur contrôlé fournit un texte déterministe. Le pool, suggestFields et
// les vrais parseurs restent exécutés, sans créer de thread OCR ni modifier
// l'interface publique uniquement pour les tests.
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({
    worker: { threadId: 1, once: vi.fn(), terminate: vi.fn(async () => 0) },
    recognize: vi.fn(async (data: Buffer) => ({ data: { text: data.toString('utf8') } })),
    terminate: vi.fn(async () => undefined),
  })),
}))

const suggestion = (text: string) => suggestFields({ data: Buffer.from(text), mimeType: 'image/png' })

test('[AUD-008][OCR-AMOUNT-001][correction] quatre chiffres non groupés conservent les centimes avec virgule et point', async () => {
  for (const text of ['TOTAL 1234,56 EUR', 'TOTAL 1234.56 EUR']) {
    expect((await suggestion(text)).amount, text).toBe(1234.56)
  }
})

test('[AUD-008][OCR-AMOUNT-002][correction] les grands montants non groupés sont reconnus en entier', async () => {
  for (const [text, expected] of [['TOTAL 12345,67 EUR', 12345.67], ['TOTAL 1234567.89 EUR', 1234567.89]] as const) {
    expect((await suggestion(text)).amount, text).toBe(expected)
  }
})

test('[AUD-008][OCR-AMOUNT-003][reference] les groupements de milliers restent reconnus', async () => {
  for (const text of ['TOTAL 1 234,56 EUR', 'TOTAL 1.234,56 EUR', 'TOTAL 1 234 567,89 EUR']) {
    const expected = text.includes('567') ? 1234567.89 : 1234.56
    expect((await suggestion(text)).amount, text).toBe(expected)
  }
})

test('[AUD-008][OCR-AMOUNT-004][reference] les petits montants et le repli entier restent disponibles', async () => {
  expect((await suggestion('TOTAL 12,34 EUR')).amount).toBe(12.34)
  expect((await suggestion('TOTAL 1234 EUR')).amount).toBe(1234)
})

test('[AUD-008][OCR-AMOUNT-005][reference] une analyse sans nombre reste un succès sans suggestion', async () => {
  expect(JSON.parse(JSON.stringify(await suggestion('Merci de votre visite')))).toEqual({})
})

test('[AUD-008][OCR-AMOUNT-006][correction] la ligne total garde la priorité et la date reste indépendante', async () => {
  const result = await suggestion('ARTICLE 9999,99 EUR\nTOTAL 1234,56 EUR\nDATE 01/10/2026')
  expect(result).toEqual({ amount: 1234.56, expenseDate: '2026-10-01' })
  expect(JSON.parse(JSON.stringify(result)).amount).toBeTypeOf('number')
})
