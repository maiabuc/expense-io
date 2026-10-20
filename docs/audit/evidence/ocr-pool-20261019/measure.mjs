// Mesures AUD-008 / SPEC-03 C4. Exécution depuis la racine du dépôt :
//   node docs/audit/evidence/ocr-pool-20261019/measure.mjs
// Node ≥ 23 (import du module TypeScript par suppression des types). Aucune
// donnée utilisateur ni service externe : fixtures du dépôt et threads locaux.
import { readFile, writeFile } from 'node:fs/promises'
import { Worker } from 'node:worker_threads'
import { performance } from 'node:perf_hooks'
import {
  createEnginePool,
  createTesseractEngine,
  EngineBusyError,
  RecognitionTimeoutError,
  RECOGNITION_TIMEOUT_MS,
} from '../../../../src/lib/ocr.ts'

const round = (value) => Math.round(value * 10) / 10
const mib = (bytes) => round(bytes / 1024 / 1024)

function snapshot() {
  const cpu = process.cpuUsage()
  return { rssMiB: mib(process.memoryUsage().rss), cpuUserMs: round(cpu.user / 1000), cpuSystemMs: round(cpu.system / 1000) }
}

async function measure(operation) {
  const start = performance.now()
  try {
    await operation()
    return { durationMs: round(performance.now() - start), outcome: 'ok' }
  } catch (error) {
    return { durationMs: round(performance.now() - start), outcome: error instanceof Error ? error.constructor.name : String(error) }
  }
}

function countingPool() {
  const counter = { engines: 0 }
  const pool = createEnginePool({ createEngine: async () => { counter.engines++; return createTesseractEngine() } })
  return { pool, counter }
}

const receipt = await readFile('tests/fixtures/receipt.png')
const blank = await readFile('tests/fixtures/blank.png')
const results = {
  date: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  defaultTimeoutMs: RECOGNITION_TIMEOUT_MS,
  before: snapshot(),
}

// 1. Initialisation + reconnaissance à froid, reconnaissances à chaud (moteur réutilisé), arrêt confirmé.
{
  const { pool, counter } = countingPool()
  const cold = await measure(() => pool.recognize(receipt))
  const afterCold = snapshot()
  const warm = []
  for (let i = 0; i < 5; i++) warm.push((await measure(() => pool.recognize(receipt))).durationMs)
  const blankRun = await measure(() => pool.recognize(blank))
  const afterWarm = snapshot()
  const stop = await measure(() => pool.close())
  results.lifecycle = {
    enginesCreated: counter.engines,
    coldInitAndFirstRecognitionMs: cold.durationMs,
    coldOutcome: cold.outcome,
    warmRecognitionMs: warm,
    blankRecognitionMs: blankRun.durationMs,
    stopConfirmedMs: stop.durationMs,
    statsAfterClose: pool.stats(),
    memoryAfterCold: afterCold,
    memoryAfterWarm: afterWarm,
  }
}

// 2. Concurrence 1/2/4 sur la capacité par défaut (1 moteur, sans file).
{
  const concurrency = {}
  for (const level of [1, 2, 4]) {
    const { pool, counter } = countingPool()
    await pool.recognize(receipt) // moteur chaud : la mesure exclut l'initialisation
    const start = performance.now()
    const outcomes = await Promise.all(Array.from({ length: level }, () => measure(() => pool.recognize(receipt))))
    concurrency[String(level)] = {
      wallMs: round(performance.now() - start),
      succeeded: outcomes.filter((item) => item.outcome === 'ok').length,
      refusedBusy: outcomes.filter((item) => item.outcome === EngineBusyError.name).length,
      other: outcomes.filter((item) => item.outcome !== 'ok' && item.outcome !== EngineBusyError.name).map((item) => item.outcome),
      perRequestMs: outcomes.map((item) => item.durationMs),
      enginesCreated: counter.engines,
      memory: snapshot(),
    }
    await pool.close()
  }
  results.concurrency = concurrency
}

// 3. Délai de production (40 s) sur un thread réellement bloqué, puis arrêt confirmé.
{
  const thread = new Worker('while (true) {}', { eval: true })
  await new Promise((resolve) => thread.once('online', resolve))
  let exitObservedAt = 0
  thread.once('exit', () => { exitObservedAt = performance.now() })
  const pool = createEnginePool({ createEngine: async () => ({ thread, recognize: () => new Promise(() => {}) }) })
  const start = performance.now()
  const run = await measure(() => pool.recognize(Buffer.from('bloqué')))
  results.productionTimeout = {
    outcome: run.outcome,
    expected: RecognitionTimeoutError.name,
    timeoutToRejectionMs: run.durationMs,
    exitObservedAfterStartMs: exitObservedAt ? round(exitObservedAt - start) : null,
    threadIdAfter: thread.threadId,
    stats: pool.stats(),
  }
}

results.after = snapshot()
await writeFile('docs/audit/evidence/ocr-pool-20261019/results.json', JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify(results, null, 2))
