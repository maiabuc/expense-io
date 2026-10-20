import { test, expect } from 'vitest'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { Worker } from 'node:worker_threads'
import {
  createEnginePool,
  createTesseractEngine,
  EngineBusyError,
  EngineStopError,
  RecognitionTimeoutError,
  RECOGNITION_TIMEOUT_MS,
  type EngineThread,
  type OcrEngine,
} from '../../src/lib/ocr'

// Thread simulé dont l'arrêt n'est confirmé (événement 'exit') que sur ordre du test.
class ControlledThread extends EventEmitter implements EngineThread {
  threadId = 1
  terminateCalls = 0
  constructor(private readonly confirmOnTerminate: boolean) { super() }
  async terminate() {
    this.terminateCalls++
    if (this.confirmOnTerminate) this.confirmExit()
    return 1
  }
  confirmExit() {
    if (this.threadId === -1) return
    this.threadId = -1
    this.emit('exit', 1)
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

async function flush() {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve))
}

test('[AUD-008][OCR-POOL-001][correction] un moteur Tesseract réel est réutilisé sans file ni recréation', async () => {
  const receipt = await readFile('tests/fixtures/receipt.png')
  const created: OcrEngine[] = []
  const pool = createEnginePool({ createEngine: async () => {
    const engine = await createTesseractEngine()
    created.push(engine)
    return engine
  } })
  try {
    const first = await pool.recognize(receipt)
    const second = await pool.recognize(receipt)
    expect(first).toContain('42')
    expect(second).toBe(first)
    expect(created).toHaveLength(1)
    expect(created[0].thread.threadId).not.toBe(-1)
    expect(pool.stats()).toMatchObject({ reserved: 1, idle: 1, stopping: 0, unconfirmedStops: 0 })
  } finally {
    await pool.close()
  }
  expect(created[0].thread.threadId).toBe(-1)
  expect(pool.stats()).toMatchObject({ reserved: 0, idle: 0 })
}, 60_000)

test('[AUD-008][OCR-POOL-002][correction] saturation : refus immédiat sans file ni nouvel appel différé', async () => {
  const pending = deferred<string>()
  let creations = 0
  let recognitions = 0
  const pool = createEnginePool({ createEngine: async () => {
    creations++
    return { thread: new ControlledThread(true), recognize: () => { recognitions++; return recognitions === 1 ? pending.promise : Promise.resolve('suivant') } }
  } })

  const first = pool.recognize(Buffer.from('a'))
  await flush()
  const started = Date.now()
  await expect(pool.recognize(Buffer.from('b'))).rejects.toBeInstanceOf(EngineBusyError)
  expect(Date.now() - started).toBeLessThan(50)
  expect(creations).toBe(1)
  expect(recognitions).toBe(1)

  pending.resolve('premier')
  await expect(first).resolves.toBe('premier')
  await flush()
  // La demande refusée n'a pas été mise en attente puis rejouée.
  expect(recognitions).toBe(1)
  await expect(pool.recognize(Buffer.from('c'))).resolves.toBe('suivant')
  expect(creations).toBe(1)
})

test('[AUD-008][OCR-POOL-003][correction] au délai, le thread bloqué est réellement arrêté avant de rendre la place', async () => {
  expect(RECOGNITION_TIMEOUT_MS).toBe(40_000)
  const blocked = new Worker('while (true) {}', { eval: true })
  await new Promise((resolve) => blocked.once('online', resolve))
  const exitCodes: number[] = []
  blocked.once('exit', (code) => exitCodes.push(code))

  const pool = createEnginePool({ timeoutMs: 100, createEngine: async () => ({
    thread: blocked,
    recognize: () => new Promise<string>(() => {}),
  }) })

  const started = Date.now()
  await expect(pool.recognize(Buffer.from('x'))).rejects.toBeInstanceOf(RecognitionTimeoutError)
  expect(Date.now() - started).toBeGreaterThanOrEqual(100)
  // Preuve d'arrêt : le thread a émis 'exit' et n'a plus d'identifiant actif.
  expect(exitCodes).toHaveLength(1)
  expect(blocked.threadId).toBe(-1)
  expect(pool.stats()).toMatchObject({ reserved: 0, stopping: 0, unconfirmedStops: 0 })
})

test('[AUD-008][OCR-POOL-004][correction] remplacement seulement après arrêt confirmé ; arrêt non confirmé signalé et place conservée', async () => {
  const threads: ControlledThread[] = []
  let failNext = true
  const pool = createEnginePool({ createEngine: async () => {
    const thread = new ControlledThread(false)
    threads.push(thread)
    return { thread, recognize: () => failNext ? Promise.reject(new Error('panne moteur')) : Promise.resolve('remplaçant') }
  } })

  const failing = pool.recognize(Buffer.from('a'))
  await flush()
  expect(pool.stats()).toMatchObject({ reserved: 1, stopping: 1 })
  // Arrêt demandé mais pas encore confirmé : aucun remplaçant ne peut démarrer.
  await expect(pool.recognize(Buffer.from('b'))).rejects.toBeInstanceOf(EngineBusyError)
  expect(threads).toHaveLength(1)
  expect(threads[0].terminateCalls).toBe(1)

  threads[0].confirmExit()
  await expect(failing).rejects.toThrow('panne moteur')
  expect(pool.stats()).toMatchObject({ reserved: 0, stopping: 0 })

  failNext = false
  await expect(pool.recognize(Buffer.from('c'))).resolves.toBe('remplaçant')
  expect(threads).toHaveLength(2)

  // Arrêt jamais confirmé : erreur d'origine relayée, échec signalé, place conservée.
  const failures: unknown[] = []
  const stuck = createEnginePool({ stopTimeoutMs: 50, onStopFailure: (error) => failures.push(error), createEngine: async () => ({
    thread: new ControlledThread(false),
    recognize: () => Promise.reject(new Error('panne moteur')),
  }) })
  await expect(stuck.recognize(Buffer.from('d'))).rejects.toThrow('panne moteur')
  expect(failures).toHaveLength(1)
  expect(failures[0]).toBeInstanceOf(EngineStopError)
  expect(stuck.stats()).toMatchObject({ reserved: 1, stopping: 0, unconfirmedStops: 1 })
  await expect(stuck.recognize(Buffer.from('e'))).rejects.toBeInstanceOf(EngineBusyError)
})
