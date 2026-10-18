import path from 'node:path'
import { createWorker, type Worker } from 'tesseract.js'

export const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const TESSDATA_PATH = path.join(process.cwd(), 'tessdata')

// Capacité initiale d'un seul moteur par processus : à mesurer avant
// d'augmenter (AUD-008). Pas de file FIFO ni file durable : une demande
// sans moteur libre est refusée immédiatement.
const POOL_CAPACITY = 1
const RECOGNITION_TIMEOUT_MS = 40_000

export class EngineBusyError extends Error {}
export class RecognitionTimeoutError extends Error {}

const idleEngines: Worker[] = []
let totalEngines = 0

async function acquireEngine(): Promise<Worker> {
  const idle = idleEngines.pop()
  if (idle) return idle
  if (totalEngines >= POOL_CAPACITY) {
    throw new EngineBusyError('Pool OCR saturé.')
  }
  totalEngines++
  try {
    return await createWorker('fra', undefined, {
      langPath: TESSDATA_PATH,
      cacheMethod: 'none',
      // Sans ce handler, tesseract.js relance l'erreur dans le gestionnaire
      // de messages du worker en plus de rejeter la promesse du job — un
      // throw non intercepté qui fait planter tout le processus Node (vu en
      // vérification manuelle sur une image corrompue). Le rejet normal de
      // `recognize()`, lui, reste intact et c'est lui que suggestFields
      // traite : fournir ce handler ne supprime donc aucun diagnostic.
      errorHandler: () => {},
    })
  } catch (error) {
    totalEngines--
    throw error
  }
}

// Un moteur sain rejoint le pool pour réutilisation ; un moteur après
// panne/délai est réellement arrêté et retiré, sans dépasser la capacité
// — un remplacement sera créé à la prochaine demande.
function releaseEngine(worker: Worker, healthy: boolean): void {
  if (healthy) {
    idleEngines.push(worker)
    return
  }
  totalEngines--
  void worker.terminate().catch(() => {})
}

async function recognizeWithTimeout(worker: Worker, data: Buffer) {
  const recognition = worker.recognize(data)
  // Évite un rejet non géré si le délai gagne la course en premier : la
  // reconnaissance peut encore se terminer (ou échouer) après coup sur un
  // moteur que releaseEngine aura déjà arrêté.
  recognition.catch(() => {})

  // L'exécuteur de la promesse est appelé immédiatement (synchrone) : `timer`
  // est bien assigné avant le `finally` ci-dessous.
  let timer!: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new RecognitionTimeoutError('Délai de reconnaissance OCR dépassé.')),
      RECOGNITION_TIMEOUT_MS
    )
  })
  try {
    return await Promise.race([recognition, timeout])
  } finally {
    clearTimeout(timer)
  }
}

const AMOUNT_KEYWORD_PATTERN = /total|montant|ttc|à payer|net à/i
const CURRENCY_HINT_PATTERN = /€|eur\b/i
const DECIMAL_AMOUNT_PATTERN = /\b\d{1,3}(?:[ .]\d{3})*[.,]\d{2}/g
const INTEGER_AMOUNT_PATTERN = /\b\d{1,5}\b/g

const DATE_PATTERNS = [
  /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/,
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
  /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})\b/,
]

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
}
const FRENCH_TEXTUAL_DATE_PATTERN = new RegExp(
  `\\b(\\d{1,2})\\s+(${Object.keys(FRENCH_MONTHS).join('|')})\\s+(\\d{4})\\b`,
  'i'
)

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export interface ExpenseNoteSuggestion {
  amount?: number
  expenseDate?: string
}

function parseAmount(text: string): number | undefined {
  const lines = text.split('\n')
  const keywordLine = lines.find((line) => AMOUNT_KEYWORD_PATTERN.test(line))
  const candidateLines = keywordLine ? [keywordLine] : lines

  const decimalAmounts: number[] = []
  for (const line of candidateLines) {
    for (const match of line.matchAll(DECIMAL_AMOUNT_PATTERN)) {
      const value = Number.parseFloat(match[0].replace(/[ .](?=\d{3})/g, '').replace(',', '.'))
      if (Number.isFinite(value) && value > 0) decimalAmounts.push(value)
    }
  }
  if (decimalAmounts.length > 0) return Math.max(...decimalAmounts)

  const integerAmounts: number[] = []
  for (const line of lines) {
    if (!AMOUNT_KEYWORD_PATTERN.test(line) && !CURRENCY_HINT_PATTERN.test(line)) continue
    for (const match of line.matchAll(INTEGER_AMOUNT_PATTERN)) {
      const value = Number.parseInt(match[0], 10)
      if (Number.isFinite(value) && value > 0) integerAmounts.push(value)
    }
  }
  return integerAmounts.length > 0 ? Math.max(...integerAmounts) : undefined
}

function toIsoDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day))
  const isValid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return isValid ? date.toISOString().slice(0, 10) : undefined
}

function parseExpenseDate(text: string): string | undefined {
  const ddmmyyyy = text.match(DATE_PATTERNS[0])
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    const iso = toIsoDate(Number(year), Number(month), Number(day))
    if (iso) return iso
  }
  const yyyymmdd = text.match(DATE_PATTERNS[1])
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd
    const iso = toIsoDate(Number(year), Number(month), Number(day))
    if (iso) return iso
  }
  const ddmmyy = text.match(DATE_PATTERNS[2])
  if (ddmmyy) {
    const [, day, month, year] = ddmmyy
    const iso = toIsoDate(2000 + Number(year), Number(month), Number(day))
    if (iso) return iso
  }
  const textual = stripAccents(text).match(FRENCH_TEXTUAL_DATE_PATTERN)
  if (textual) {
    const [, day, monthName, year] = textual
    const iso = toIsoDate(Number(year), FRENCH_MONTHS[monthName.toLowerCase()], Number(day))
    if (iso) return iso
  }
  return undefined
}

// Le format annoncé est vérifié par l'appelant (route), qui renvoie 400
// avant d'atteindre ce module. Toute panne du moteur (donnée non décodable,
// saturation, délai dépassé) est désormais relayée par une exception :
// une analyse réussie sans champ reconnu reste {} (AUD-008), mais ce n'est
// plus la même chose qu'un échec dissimulé en succès vide.
export async function suggestFields(receipt: {
  data: Buffer
  mimeType: string
}): Promise<ExpenseNoteSuggestion> {
  const worker = await acquireEngine()
  let healthy = true
  try {
    const {
      data: { text },
    } = await recognizeWithTimeout(worker, receipt.data)
    return { amount: parseAmount(text), expenseDate: parseExpenseDate(text) }
  } catch (error) {
    healthy = false
    throw error
  } finally {
    releaseEngine(worker, healthy)
  }
}
