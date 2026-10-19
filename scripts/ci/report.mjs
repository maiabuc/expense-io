import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { provenance } from '../../tests/reporters/provenance.mjs'
import { evaluateSpecification, specificationMarkdown, specificationExecutionErrors } from '../../tests/reporters/specifications.mjs'
import { catalog } from './catalog.mjs'
import { metadata, sanitize } from '../../tests/reporters/metadata.mjs'

export async function summarize(directory = 'reports', suites = ['unit', 'api', 'e2e']) {
  const planned = (await catalog()).filter(c => suites.includes(c.suite) && (!process.env.TEST_ISSUE || c.issues.includes(process.env.TEST_ISSUE))); const actual = []; const suiteFailures = []; const environments = {}; const rawReports = {}
  for (const suite of suites) {
    try {
      const data = JSON.parse(await readFile(`${directory}/${suite}.json`, 'utf8'))
      rawReports[suite] = data
      environments[suite] = data.provenance ?? JSON.parse(await readFile(`${directory}/unit-environment.json`, 'utf8').catch(() => '{}'))
      if (suite === 'unit' ? data.success !== true : data.status !== 'passed' || data.invalid?.length) suiteFailures.push(suite)
      if (suite === 'unit') {
        for (const file of data.testResults ?? []) for (const assertion of file.assertionResults ?? []) {
          actual.push({ ...metadata(assertion.title), suite, status: assertion.status,
            errors: (assertion.failureMessages ?? []).map(sanitize) })
        }
      } else actual.push(...(data.results ?? []))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  const rows = []; const byIssue = {}
  for (const item of planned) {
    const matches = actual.filter(r => r.suite === item.suite && r.caseId === item.caseId)
    const result = matches.length === 1 ? matches[0] : { ...item, status: 'not-run', errors: ['Résultat absent ou ambigu.'] }
    result.classification = result.status === 'passed' ? 'réussi' : result.status === 'not-run' ? 'non exécuté' : item.kind === 'correction' ? 'défaut audité non corrigé à examiner' : 'échec de référence ou outillage à examiner'
    rows.push(result)
    for (const issue of item.issues) {
      byIssue[issue] ??= { passed: 0, failed: 0, notRun: 0, cases: [] }
      const group = byIssue[issue]
      if (result.status === 'passed') group.passed++
      else if (result.status === 'not-run' || result.status === 'skipped' || result.status === 'pending') group.notRun++
      else group.failed++
      group.cases.push({ id: item.caseId, suite: item.suite, status: result.status })
    }
  }
  const deferred = JSON.parse(await readFile('tests/deferred-coverage.json', 'utf8'))
  const specifications = JSON.parse(await readFile('tests/specifications.json', 'utf8'))
  const execution = provenance()
  const context = { environments, rawReports, expectedRevision: execution.revision, partialIssue: process.env.TEST_ISSUE,
    prerequisites: process.env.CI_PREREQUISITES ? JSON.parse(process.env.CI_PREREQUISITES) : undefined }
  const bySpecification = specifications.map(specification => evaluateSpecification(specification, planned, rows,
    { errors: specificationExecutionErrors(specification, planned, context) }))
  const lines = ['# Résultats des tests par issue', '', `Révision : ${execution.revision} (${execution.sourceState}). Généré : ${execution.generatedAt}. Node : ${execution.node}. Suites : ${suites.join(', ')}.`, '', 'Les contrôles présents réussis ne certifient pas seuls une issue corrigée. Les cas futurs et les absences restent explicites.', '',
    '| Issue | Réussis | Échoués | Non exécutés | Couverture future |', '| --- | ---: | ---: | ---: | --- |']
  for (const issue of [...new Set([...Object.keys(byIssue), ...Object.keys(deferred)])].sort()) {
    const group = byIssue[issue] ?? { passed: 0, failed: 0, notRun: 0 }
    lines.push(`| ${issue} | ${group.passed} | ${group.failed} | ${group.notRun} | ${(deferred[issue] ?? []).join(' ; ') || 'Voir critères et matrice de tests'} |`)
  }
  lines.push('', '## Cas exécutables', '', '| Cas | Issues | Suite | Résultat |', '| --- | --- | --- | --- |')
  for (const row of rows) lines.push(`| ${row.caseId} | ${row.issues.join(', ')} | ${row.suite} | ${row.status} |`)
  const result = { bySpecification, provenance: execution, environments, suites, scope: process.env.TEST_ISSUE ?? 'suites sélectionnées complètes', planned: planned.length, passed: rows.filter(r => r.status === 'passed').length,
    failed: rows.filter(r => !['passed', 'not-run', 'skipped', 'pending'].includes(r.status)).length,
    notRun: rows.filter(r => ['not-run', 'skipped', 'pending'].includes(r.status)).length, suiteFailures, byIssue, deferred, results: rows }
  if (suiteFailures.length) lines.push('', `Suites en échec : ${suiteFailures.join(', ')}. Consulter les résultats bruts, y compris les erreurs de préparation/fin de suite.`)
  await mkdir(directory, { recursive: true })
  await writeFile(`${directory}/specifications.json`, JSON.stringify({ provenance: execution, scope: suites, reports: bySpecification }, null, 2))
  await writeFile(`${directory}/specifications.md`, specificationMarkdown(bySpecification))
  await writeFile(`${directory}/issues.json`, JSON.stringify(result, null, 2))
  await writeFile(`${directory}/issues.md`, lines.join('\n') + '\n')
  return result
}
if (process.argv[1]?.endsWith('/report.mjs')) {
  const suites = process.argv.filter(a => a.startsWith('--suite=')).map(a => a.slice(8))
  const result = await summarize('reports', suites.length ? suites : undefined)
  console.log(JSON.stringify({ planned: result.planned, passed: result.passed, failed: result.failed, notRun: result.notRun }))
  if (result.failed || result.notRun || result.suiteFailures.length || !result.planned ||
    (!process.env.TEST_ISSUE && result.suites.length === 3 && result.bySpecification.some(specification => specification.status !== 'passed' && specification.status !== 'manual-review'))) process.exitCode = 1
}
