import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('reports', { recursive: true })
const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' })
let report
try { report = JSON.parse(result.stdout) } catch { report = { error: 'Rapport de dépendances indisponible.' } }
await writeFile('reports/dependencies.json', JSON.stringify({ issue: 'AUD-023', informational: true, exitCode: result.status, report }, null, 2))
const counts = report.metadata?.vulnerabilities
console.log('[AUD-023] Rapport informatif, aucun correctif automatique.', counts ?? 'Collecte indisponible.')
if (result.status !== 0) console.log('::warning::[AUD-023] Alertes ou collecte indisponible ; consulter le rapport. Ce job ne certifie pas les dépendances sûres.')
