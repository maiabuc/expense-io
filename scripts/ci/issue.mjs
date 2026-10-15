import { spawnSync } from 'node:child_process'
import { catalog } from './catalog.mjs'

const issue = process.argv[2]
if (!/^(AUD-\d{3}|G10|G14)$/.test(issue ?? '')) throw new Error('Utilisation : npm run test:issue -- AUD-007')
const cases = (await catalog()).filter(c => c.issues.includes(issue))
if (!cases.length) throw new Error(`Aucun test exécutable pour ${issue} ; consulter les couvertures reportées.`)
const suites = [...new Set(cases.map(c => c.suite))]
for (const suite of suites) {
  const pattern = `\\[${issue}(?:,|\\])|,${issue}(?:,|\\])`
  const command = suite === 'unit' ? ['node', 'scripts/ci/unit.mjs', '-t', pattern] : ['node', 'scripts/ci/run.mjs', suite]
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit', shell: false, env: { ...process.env, TEST_ISSUE: issue } })
  if (result.status !== 0) process.exitCode = 1
}

const report = spawnSync(process.execPath, ['scripts/ci/report.mjs', ...suites.map(suite => `--suite=${suite}`)], {
  stdio: 'inherit', shell: false, env: { ...process.env, TEST_ISSUE: issue },
})
if (report.status !== 0) process.exitCode = 1
