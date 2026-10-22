import path from 'node:path'
import { createWorker } from 'tesseract.js'

export const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const TESSDATA_PATH = path.join(process.cwd(), 'tessdata')

// Capacité initiale d'un seul moteur par processus : à mesurer avant
// d'augmenter (AUD-008). Pas de file FIFO ni file durable : une demande
// sans moteur libre est refusée immédiatement.
export const DEFAULT_POOL_CAPACITY = 1
export const RECOGNITION_TIMEOUT_MS = 40_000
// Délai laissé au thread pour confirmer son arrêt (événement 'exit').
export const STOP_CONFIRMATION_TIMEOUT_MS = 5_000

export class EngineBusyError extends Error {}
export class RecognitionTimeoutError extends Error {}
export class EngineStopError extends Error {}

/** Thread réel exécutant un moteur (instance `worker_threads.Worker`). */
export interface EngineThread {
  readonly threadId: number
  once(event: 'exit', listener: (code: number) => void): unknown
  terminate(): Promise<unknown>
}

export interface OcrEngine {
  readonly thread: EngineThread
  recognize(data: Buffer): Promise<string>
}

export interface EnginePoolOptions {
  createEngine: () => Promise<OcrEngine>
  capacity?: number
  timeoutMs?: number
  stopTimeoutMs?: number
  onStopFailure?: (error: unknown) => void
}

export interface EnginePoolStats {
  /** Moteurs comptés dans la capacité : en création, au repos, en service ou en cours d'arrêt. */
  reserved: number
  idle: number
  stopping: number
  /** Arrêts non confirmés : leur place reste réservée. */
  unconfirmedStops: number
}

export interface EnginePool {
  recognize(data: Buffer): Promise<string>
  /** Arrête les moteurs au repos (fin de processus, recyclage). */
  close(): Promise<void>
  stats(): EnginePoolStats
}

function logStopFailure(error: unknown): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      code: 'OCR_STOP_UNCONFIRMED',
      operation: 'ocr:stop',
      message: error instanceof Error ? error.message : String(error),
    })
  )
}

// Arrêt réel : on demande l'arrêt du thread puis on attend son événement
// 'exit'. `terminate()` de tesseract.js ne suffit pas comme preuve : il
// lance l'arrêt sans l'attendre et se résout immédiatement.
async function confirmThreadExit(thread: EngineThread, timeoutMs: number): Promise<void> {
  if (thread.threadId === -1) return
  const exited = new Promise<void>((resolve) => {
    thread.once('exit', () => resolve())
  })
  // L'exécuteur de la promesse est synchrone : `timer` est assigné avant le `finally`.
  let timer!: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new EngineStopError(`Arrêt du moteur OCR non confirmé après ${timeoutMs} ms.`)),
      timeoutMs
    )
  })
  try {
    await Promise.race([Promise.all([thread.terminate(), exited]), timeout])
  } finally {
    clearTimeout(timer)
  }
}

export function createEnginePool(options: EnginePoolOptions): EnginePool {
  const capacity = options.capacity ?? DEFAULT_POOL_CAPACITY
  const timeoutMs = options.timeoutMs ?? RECOGNITION_TIMEOUT_MS
  const stopTimeoutMs = options.stopTimeoutMs ?? STOP_CONFIRMATION_TIMEOUT_MS
  const onStopFailure = options.onStopFailure ?? logStopFailure

  const idle: OcrEngine[] = []
  let reserved = 0
  let stopping = 0
  let unconfirmedStops = 0

  async function acquire(): Promise<OcrEngine> {
    const engine = idle.pop()
    if (engine) return engine
    if (reserved >= capacity) {
      throw new EngineBusyError('Pool OCR saturé.')
    }
    reserved++
    try {
      return await options.createEngine()
    } catch (error) {
      reserved--
      throw error
    }
  }

  // La place n'est rendue qu'après confirmation de l'arrêt du thread : un
  // remplaçant ne peut jamais tourner en même temps que le moteur arrêté.
  // Si l'arrêt n'est pas confirmé, la place reste réservée et l'échec est
  // signalé (journal structuré par défaut), jamais ignoré.
  async function stop(engine: OcrEngine): Promise<void> {
    stopping++
    try {
      await confirmThreadExit(engine.thread, stopTimeoutMs)
      reserved--
    } catch (error) {
      unconfirmedStops++
      onStopFailure(error)
    } finally {
      stopping--
    }
  }

  async function recognize(data: Buffer): Promise<string> {
    const engine = await acquire()
    const recognition = engine.recognize(data)
    // Après un délai dépassé, ce job peut encore échouer sur un moteur déjà
    // arrêté : son rejet tardif n'a plus de destinataire.
    recognition.catch(() => {})

    let timer!: ReturnType<typeof setTimeout>
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new RecognitionTimeoutError('Délai de reconnaissance OCR dépassé.')),
        timeoutMs
      )
    })
    try {
      const text = await Promise.race([recognition, timeout])
      idle.push(engine)
      return text
    } catch (error) {
      // Panne ou délai : le moteur n'est plus fiable, il est arrêté avant
      // que sa place ne soit rendue, puis l'erreur d'origine est relayée.
      await stop(engine)
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  async function close(): Promise<void> {
    const engines = idle.splice(0, idle.length)
    await Promise.all(engines.map((engine) => stop(engine)))
  }

  return {
    recognize,
    close,
    stats: () => ({ reserved, idle: idle.length, stopping, unconfirmedStops }),
  }
}

export async function createTesseractEngine(): Promise<OcrEngine> {
  const worker = await createWorker('fra', undefined, {
    langPath: TESSDATA_PATH,
    cacheMethod: 'none',
    // Sans ce handler, tesseract.js relance l'erreur dans le gestionnaire de
    // messages du worker en plus de rejeter la promesse du job : un throw non
    // intercepté qui fait planter tout le processus Node (reproduit sur une
    // image corrompue). Le rejet de `recognize()` reste intact et c'est lui
    // que le pool traite : ce handler ne supprime aucun diagnostic.
    errorHandler: () => {},
  })
  // tesseract.js expose son thread sous `worker` sans le déclarer dans ses types.
  const thread = (worker as unknown as { worker?: EngineThread }).worker
  if (!thread || typeof thread.terminate !== 'function' || typeof thread.once !== 'function') {
    await worker.terminate()
    throw new EngineStopError('Thread du moteur OCR inaccessible : arrêt non vérifiable.')
  }
  return {
    thread,
    recognize: async (data) => (await worker.recognize(data)).data.text,
  }
}

let defaultPool: EnginePool | undefined

function enginePool(): EnginePool {
  if (!defaultPool) defaultPool = createEnginePool({ createEngine: createTesseractEngine })
  return defaultPool
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
  const text = await enginePool().recognize(receipt.data)
  return { amount: parseAmount(text), expenseDate: parseExpenseDate(text) }
}
