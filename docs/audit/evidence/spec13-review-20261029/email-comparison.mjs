// Lancer depuis la racine : timeout 15s node docs/audit/evidence/spec13-review-20261029/email-comparison.mjs
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import ts from 'typescript'

const source = readFileSync('src/utils/validators.ts', 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { isValidEmail } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
const original = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/
const samples = []
for (const repetitions of [500, 1000, 2000, 4000]) {
  const input = `a@${'a.'.repeat(repetitions)}@`
  const results = []
  for (const [name, validate] of [['before', value => original.test(value)], ['after', isValidEmail]]) {
    validate('a@ci.invalid')
    const durationsMs = []
    const accepted = []
    for (let repeat = 0; repeat < 5; repeat++) {
      const start = performance.now()
      accepted.push(validate(input))
      durationsMs.push(performance.now() - start)
    }
    results.push({ name, durationsMs, accepted })
  }
  samples.push({ length: input.length, results })
}
console.log(JSON.stringify({ sourceBase: '0f7edf376237bdbee2d9ac845b329da4bc2a7232', realization: 'local diff 2026-10-29', node: process.version,
  platform: process.platform, sourceSha256: createHash('sha256').update(source).digest('hex'),
  command: 'timeout 15s node docs/audit/evidence/spec13-review-20261029/email-comparison.mjs', samples,
  limits: 'Microbenchmark synthétique isolé ; aucun débit HTTP ni capacité serveur déduits. Au-delà de 4096, le nouveau validateur refuse avant analyse.' }, null, 2))
