import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { waitFor } from './database'
import { testEnvironment } from './environment'

async function withServer<T>(overrides: Record<string, string>, operation: (url: string, logs: () => string) => Promise<T>) {
  testEnvironment()
  const port = Number(new URL(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:13420').port) + 1
  const base = `http://127.0.0.1:${port}`
  const server = spawn(process.execPath, [...(overrides.CI_FIXED_TIME ? ['--import', resolve('tests/support/paris-clock.mjs')] : []), resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { env: { ...process.env, DATABASE_URL: testEnvironment().appDatabaseURL, ...overrides, AUTH_TRUST_HOST: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let logs = ''
  server.stderr.on('data', chunk => { logs = (logs + String(chunk)).slice(-100000) })
  try {
    await waitFor(async () => {
      if (server.exitCode !== null) throw new Error('Instance de panne indisponible : port réservé occupé ou build absent.')
      try { return (await fetch(`${base}/api/auth/session`)).ok } catch { return false }
    }, 'Instance de panne non démarrée.')
    return await operation(base, () => logs)
  } finally {
    if (server.exitCode === null) {
      const ended = new Promise(resolve => server.once('exit', resolve))
      server.kill('SIGTERM'); const timeout = setTimeout(() => server.kill('SIGKILL'), 5000)
      await ended; clearTimeout(timeout)
    }
  }
}

export function withMissingBucket<T>(operation: (url: string, logs: () => string) => Promise<T>) {
  return withServer({ S3_BUCKET: 'ci-bucket-volontairement-absent' }, operation)
}
export function withRestrictedDatabase<T>(operation: (url: string, logs: () => string) => Promise<T>) {
  const { databaseURL } = testEnvironment()
  const url = new URL(databaseURL); url.username = 'ci_enforced'; url.password = 'ci-restricted-only'
  return withServer({ DATABASE_URL: url.toString() }, operation)
}

// Base injoignable (port 1 refusé immédiatement) : la session JWT reste valide,
// seule la relecture en base de l'identité échoue.
export function withUnreachableDatabase<T>(operation: (url: string, logs: () => string) => Promise<T>) {
  const url = new URL(testEnvironment().databaseURL); url.port = '1'
  return withServer({ DATABASE_URL: url.toString() }, operation)
}

export function withParisMidnight<T>(operation: (url: string, logs: () => string) => Promise<T>) {
  return withServer({ CI_FIXED_TIME: '2026-10-14T22:00:01Z' }, operation)
}

export function withCapturedDiagnostics<T>(operation: (url: string, logs: () => string) => Promise<T>) {
  return withServer({}, operation)
}
