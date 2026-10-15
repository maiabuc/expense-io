import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const original = JSON.parse(await readFile('docs/audit/evidence/audit-content-baseline.json', 'utf8'))
let base = process.env.AUDIT_BASE_SHA
if (!base || /^0+$/.test(base)) base = 'HEAD'
if (base !== 'HEAD' && !/^[a-f0-9]{40}$/.test(base)) throw new Error('Référence Git de comparaison invalide.')
execFileSync('git', ['rev-parse', '--verify', `${base}^{commit}`], { stdio: 'pipe' })
const reference = []
for (const item of original.fichiers) {
  const exists = spawnSync('git', ['cat-file', '-e', `${base}:${item.chemin}`], { stdio: 'pipe' })
  if (exists.status !== 0) { reference.push(item); continue }
  const bytes = execFileSync('git', ['show', `${base}:${item.chemin}`])
  reference.push({ chemin: item.chemin, octets: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
// Inclure aussi les nouvelles fiches de la base, même absentes du manifeste original.
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'docs/audit/solutions-to-audit'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
for (const file of files.filter(file => file.endsWith('.md') && !reference.some(item => item.chemin === file))) {
  const bytes = execFileSync('git', ['show', `${base}:${file}`])
  reference.push({ chemin: file, octets: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
const directory = await mkdtemp(join(tmpdir(), 'arla-ci-prefixes-'))
const snapshot = join(directory, 'base.json')
await writeFile(snapshot, JSON.stringify({ fichiers: reference }))
const result = spawnSync(process.execPath, ['docs/audit/tools/check-append-only.mjs', 'check', '--snapshot', snapshot], { stdio: 'inherit' })
process.exitCode = result.status ?? 1
