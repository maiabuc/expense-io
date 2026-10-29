import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import ts from 'typescript'

// Lancer chaque version dans un processus isolé : timeout 15s node <script> before|after.
const version = process.argv[2]
if (!['before', 'after'].includes(version)) throw new Error('Version before ou after requise')
const source = readFileSync(version === 'before' ? new URL('./before.ts', import.meta.url) : 'src/lib/errors.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { redactDiagnostic } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const samples = []
for (const spaces of [500, 1000, 2000, 4000]) {
  const input = 'authorization:' + ' '.repeat(spaces)
  redactDiagnostic(input)
  const durationsMs = []
  for (let repeat = 0; repeat < 5; repeat++) {
    const start = performance.now()
    if (redactDiagnostic(input) !== input) throw new Error('Sortie fonctionnelle différente')
    durationsMs.push(performance.now() - start)
  }
  samples.push({ spaces, durationsMs })
}
console.log(JSON.stringify({ base: 'ebd8b96', realization: 'review diff 2026-10-29', version, node: process.version,
  sourceSha256: createHash('sha256').update(source).digest('hex'), samples,
  limits: 'Entrées synthétiques ; fonction seule, aucun débit HTTP déduit.' }, null, 2))
