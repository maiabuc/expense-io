// Microbenchmark borné, sans secret ni appel HTTP.
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
const file = 'src/lib/errors.ts'
const source = readFileSync(file, 'utf8')
const literal = source.split('\n')[18].trim().replace(/,$/, '')
if (!literal.startsWith('/authorization')) throw new Error('Motif de référence introuvable.')
const end = literal.lastIndexOf('/')
const pattern = new RegExp(literal.slice(1, end), literal.slice(end + 1))
'authorization: faux'.replace(pattern, '[expurgé]')
const measurements = [500, 1000, 2000, 4000].map(spaces => {
  const input = 'authorization:' + ' '.repeat(spaces)
  const start = performance.now()
  const output = input.replace(pattern, '[expurgé]')
  return { spaces, milliseconds: Number((performance.now() - start).toFixed(3)), changed: output !== input }
})
console.log(JSON.stringify({ sourceSha: '2e9e30cf9f21a240c1213da6baec7f4c61618175', file,
  fileSha256: createHash('sha256').update(source).digest('hex'), node: process.version,
  runsPerSize: 1, measurements, limits: 'Motif isolé, données synthétiques, aucun secret ou appel HTTP ; saturation non démontrée.' }, null, 2))
