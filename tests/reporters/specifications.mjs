/** @typedef {{caseId: string, suite: string, title: string, issues: string[], status?: string}} Case */
/** @typedef {{id: string, title: string, mode: string, issues: string[], requiredCases?: string[], includeCases?: string[], includePrefixes?: string[], excludeCases?: string[], excludePrefixes?: string[], reason?: string}} Specification */

/** @param {Specification} specification @param {Case[]} catalog */
export function casesForSpecification(specification, catalog) {
  return catalog.filter(item => {
    const selected = item.issues.some(issue => specification.issues.includes(issue)) ||
      (specification.includeCases ?? []).includes(item.caseId) ||
      (specification.includePrefixes ?? []).some(prefix => item.caseId.startsWith(prefix))
    return selected && !(specification.excludeCases ?? []).includes(item.caseId) &&
      !(specification.excludePrefixes ?? []).some(prefix => item.caseId.startsWith(prefix))
  })
}

/** @param {Specification} specification @param {Case[]} catalog @param {Case[]} results @param {{errors?: string[]}} options */
export function evaluateSpecification(specification, catalog, results, options = {}) {
  const errors = options.errors ?? []
  if (specification.mode === 'manual') {
    return { id: specification.id, title: specification.title, status: 'manual-review', passed: 0, failed: 0, notRun: 0,
      planned: 0, missingCoverage: [], cases: [], errors: [specification.reason] }
  }
  const selected = casesForSpecification(specification, catalog)
  const missingCoverage = (specification.requiredCases ?? []).filter(id => !selected.some(item => item.caseId === id))
  const cases = selected.map(item => {
    const matches = results.filter(result => result.caseId === item.caseId && result.suite === item.suite)
    const result = matches.length === 1 && matches[0].title === item.title ? matches[0] : null
    return { caseId: item.caseId, suite: item.suite, status: result?.status ?? 'not-run' }
  })
  const passed = cases.filter(item => item.status === 'passed').length
  const notRun = cases.filter(item => ['not-run', 'skipped', 'pending'].includes(item.status)).length
  const failed = cases.length - passed - notRun
  const status = !cases.length || missingCoverage.length || notRun ? 'incomplete' : failed || errors.length ? 'failed' : 'passed'
  return { id: specification.id, title: specification.title, status, planned: cases.length, passed, failed, notRun,
    missingCoverage, cases, errors }
}

/** @param {Specification[]} specifications @param {Case[]} catalog */
export function validateSpecifications(specifications, catalog) {
  const ids = new Set()
  for (const specification of specifications) {
    if (!/^SPEC-\d{2}$/.test(specification.id) || ids.has(specification.id)) throw new Error('Identifiant de spec absent, invalide ou dupliqué.')
    ids.add(specification.id)
    if (!['automated', 'manual'].includes(specification.mode) || !specification.issues?.length) throw new Error(`Mode ou issues manquants : ${specification.id}`)
    if (specification.mode === 'automated') {
      if (!specification.requiredCases?.length || new Set(specification.requiredCases).size !== specification.requiredCases.length) throw new Error(`Cas obligatoires absents ou dupliqués : ${specification.id}`)
      if (!casesForSpecification(specification, catalog).length) throw new Error(`Aucun cas sélectionné : ${specification.id}`)
    } else if (!specification.reason) throw new Error(`Revue manuelle sans motif : ${specification.id}`)
  }
}

export function specificationMarkdown(reports) {
  const lines = ['# Contrôles par spec', '',
    'Un contrôle vert exige les cas du lot exécutés et réussis, ainsi que la couverture obligatoire déclarée. Il ne remplace pas la revue du code et des preuves.', '',
    '| Spec | État | Réussis | Échoués | Non exécutés | Cas obligatoires manquants |',
    '| --- | --- | ---: | ---: | ---: | --- |']
  for (const report of reports) lines.push(`| ${report.id} | ${report.status} | ${report.passed} | ${report.failed} | ${report.notRun} | ${report.missingCoverage.join(', ') || '—'} |`)
  for (const report of reports.filter(item => item.errors.length)) lines.push('', `**${report.id}** : ${report.errors.join(' ; ')}`)
  return lines.join('\n') + '\n'
}

/** @param {Specification} specification @param {Case[]} catalog @param {{environments: Record<string, {revision?: string, issue?: string}>, rawReports: Record<string, {invalid?: unknown[], status?: string, success?: boolean, numFailedTests?: number, planned?: number, results?: Case[], numTotalTests?: number, testResults?: {assertionResults?: object[]}[]}>, expectedRevision: string, partialIssue?: string, prerequisites?: Record<string, {result?: string}>}} context */
export function specificationExecutionErrors(specification, catalog, context) {
  if (specification.mode === 'manual') return []
  const errors = []
  const suites = new Set(casesForSpecification(specification, catalog).map(item => item.suite))
  for (const suite of suites) {
    const environment = context.environments?.[suite]
    const raw = context.rawReports?.[suite]
    if (!environment?.revision || environment.revision !== context.expectedRevision) errors.push(`${suite} : révision du rapport absente ou différente.`)
    if (environment?.issue || context.partialIssue) errors.push(`${suite} : exécution partielle par issue.`)
    if (!raw) errors.push(`${suite} : rapport brut absent ou illisible.`)
    else if (raw.invalid?.length || ['interrupted', 'timedout'].includes(raw.status) ||
      (suite === 'unit' && raw.success === false && raw.numFailedTests === 0)) errors.push(`${suite} : erreur globale d’exécution.`)
    if (raw) {
      const expected = catalog.filter(item => item.suite === suite).length
      const planned = suite === 'unit' ? raw.numTotalTests : raw.planned
      const observed = suite === 'unit' ? (raw.testResults ?? []).flatMap(file => file.assertionResults ?? []).length : raw.results?.length
      if (planned !== expected || observed !== expected) errors.push(`${suite} : rapport de suite incomplet.`)
    }
  }
  if (context.prerequisites) for (const name of ['installation', 'qualite', 'build']) {
    if (context.prerequisites[name]?.result !== 'success') errors.push(`Prérequis ${name} non réussi.`)
  }
  return errors
}
