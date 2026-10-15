import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile, access, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { sanitize } from '../../tests/reporters/metadata.mjs'

const suite = process.argv[2]
if (!['api', 'e2e'].includes(suite)) throw new Error('Suite api ou e2e requise.')
const project = `expense-io-ci-${suite}-${process.pid}`
const env = { ...process.env, CI_SUITE: suite, ARLA_TEST_RUN: '1', CI_RUN_ID: randomUUID(),
  DATABASE_URL: `postgres://expense:expense-ci-only@127.0.0.1:${process.env.CI_DB_PORT ?? '15434'}/expense_io_ci_${suite}`,
  S3_ENDPOINT: `http://127.0.0.1:${process.env.CI_S3_PORT ?? '14568'}`, S3_BUCKET: `ci-${suite}-receipts`,
  S3_REGION: 'us-east-1', S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test', S3_FORCE_PATH_STYLE: 'true',
  AUTH_SECRET: 'ci-only-dummy-not-production', AUTH_TRUST_HOST: 'true', NEXT_TELEMETRY_DISABLED: '1',
  TEST_BASE_URL: `http://127.0.0.1:${process.env.CI_APP_PORT ?? '13420'}` }
const compose = ['compose', '-p', project, '-f', 'tests/infra/compose.yml']
const children = new Set()
let interrupted = false
function interrupt() {
  interrupted = true
  for (const child of children) child.kill('SIGTERM')
  server?.kill('SIGTERM')
}
process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt)
function execute(command, args) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', shell: false })
    children.add(child)
    child.once('error', error => { children.delete(child); reject(error) })
    child.once('exit', code => { children.delete(child); done(code ?? 1) })
  })
}
let server; let started = false
await mkdir('reports', { recursive: true })
await rm(`reports/${suite}.json`, { force: true })
await rm('reports/issues.json', { force: true })
await rm('reports/issues.md', { force: true })
try {
  await access('.next/BUILD_ID')
  started = true
  if (await execute('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '120'])) throw new Error('Services CI indisponibles.')
  if (interrupted) throw new Error('Exécution CI interrompue.')
  if (await execute('npm', ['run', 'migrate:up'])) throw new Error('Préparation du schéma CI échouée.')
  if (await execute('npm', ['run', 'ensure-bucket'])) throw new Error('Préparation du bucket CI échouée.')
  const stream = createWriteStream(`reports/server-${suite}.log`)
  server = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', '--port', new URL(env.TEST_BASE_URL).port, '--hostname', '127.0.0.1'],
    { env, stdio: ['ignore', 'pipe', 'pipe'], shell: false })
  server.stdout.pipe(stream); server.stderr.pipe(stream)
  let ready = false
  for (let i = 0; i < 150; i++) {
    if (interrupted || server.exitCode !== null) break
    try { const response = await fetch(`${env.TEST_BASE_URL}/api/auth/session`, { signal: AbortSignal.timeout(2000) }); if (response.ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error('Serveur de production CI indisponible.')
  const args = ['--no-install', 'playwright', 'test', `--project=${suite}`]
  if (process.env.TEST_ISSUE) args.push('--grep', `\\[${process.env.TEST_ISSUE}(?:,|\\])|,${process.env.TEST_ISSUE}(?:,|\\])`)
  const tests = await execute('npx', args)
  const report = await execute('node', ['scripts/ci/report.mjs', `--suite=${suite}`])
  process.exitCode = tests || report ? 1 : 0
} catch (error) { console.error(sanitize(error.message)); process.exitCode = 1 }
finally {
  if (server && server.exitCode === null) {
    const ended = new Promise(resolve => server.once('exit', resolve))
    server.kill('SIGTERM'); const timer = setTimeout(() => server.kill('SIGKILL'), 5000)
    await ended; clearTimeout(timer)
  }
  try { const path = `reports/server-${suite}.log`; await writeFile(path, sanitize(await readFile(path, 'utf8'))) } catch {}
  if (started) {
    const cleanup = await execute('docker', [...compose, 'down', '--volumes', '--remove-orphans'])
    if (cleanup) process.exitCode = 1
  }
  if (interrupted) process.exitCode = 1
}
