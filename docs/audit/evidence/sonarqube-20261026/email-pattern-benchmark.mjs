// Mesure bornée de l'expression existante ; aucune requête HTTP ou écriture en base.
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const path = 'src/app/actions/auth.ts'
const source = readFileSync(path, 'utf8')
const literal = source.match(/^const EMAIL_PATTERN = (\/.+\/[a-z]*)$/m)?.[1]
if (!literal) throw new Error('Expression de référence introuvable.')
const pattern = new RegExp(literal.slice(1, literal.lastIndexOf('/')))
pattern.test('a@example.test')
const measurements = [500, 1000, 2000, 4000].map(repetitions => {
  const value = 'a@' + 'a.'.repeat(repetitions) + '@'
  const start = performance.now()
  const accepted = pattern.test(value)
  return { characters: value.length, accepted, milliseconds: Number((performance.now() - start).toFixed(3)) }
})
console.log(JSON.stringify({ sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  file: path, fileSha256: createHash('sha256').update(source).digest('hex'), node: process.version,
  input: "'a@' + 'a.'.repeat(repetitions) + '@'", runsPerSize: 1, measurements,
  limits: 'Mesure locale indicative, quatre appels après échauffement, aucun appel HTTP ; aucune saturation serveur démontrée.' }, null, 2))
