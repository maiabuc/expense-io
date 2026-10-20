import { test, expect } from 'vitest'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { catalog } from '../../scripts/ci/catalog.mjs'
import { summarize } from '../../scripts/ci/report.mjs'
import { evaluateSpecification, casesForSpecification, validateSpecifications, specificationExecutionErrors } from '../reporters/specifications.mjs'

const spec = { id: 'SPEC-01', title: 'Erreurs', mode: 'automated', issues: ['AUD-005'], requiredCases: ['CAS-001'] }
const entry = { caseId: 'CAS-001', suite: 'api', title: 'Cas erreur', issues: ['AUD-005'] }
const success = { ...entry, status: 'passed' }

test('[AUD-011][CI-SPEC-001][outillage] une autre spec rouge ne rend pas rouge un lot entièrement réussi', () => {
  const result = evaluateSpecification(spec, [entry, { ...entry, caseId: 'AUTRE', issues: ['AUD-014'] }],
    [success, { ...success, caseId: 'AUTRE', status: 'failed' }])
  expect(result.status).toBe('passed')
  expect(result.passed).toBe(1)
})
test('[AUD-011][CI-SPEC-002][outillage] un cas absent ou ignoré ne donne jamais un contrôle vert', () => {
  expect(evaluateSpecification(spec, [entry], []).status).toBe('incomplete')
  expect(evaluateSpecification(spec, [entry], [{ ...success, status: 'skipped' }]).notRun).toBe(1)
})
test('[AUD-011][CI-SPEC-003][outillage] une couverture obligatoire absente reste explicite', () => {
  const result = evaluateSpecification({ ...spec, requiredCases: ['CAS-001', 'SECRET-001'] }, [entry], [success])
  expect(result.status).toBe('incomplete')
  expect(result.missingCoverage).toEqual(['SECRET-001'])
})
test('[AUD-011][CI-SPEC-004][outillage] un résultat dupliqué ou un autre titre ne prouve pas le cas attendu', () => {
  expect(evaluateSpecification(spec, [entry], [success, success]).notRun).toBe(1)
  expect(evaluateSpecification(spec, [entry], [{ ...success, title: 'Autre test' }]).notRun).toBe(1)
})
test('[AUD-011][CI-SPEC-005][outillage] un échec du lot ou une erreur globale restent bloquants', () => {
  expect(evaluateSpecification(spec, [entry], [{ ...success, status: 'failed' }]).status).toBe('failed')
  expect(evaluateSpecification(spec, [entry], [success], { errors: ['Rapport périmé'] }).status).toBe('failed')
})
test('[AUD-011][CI-SPEC-006][outillage] une qualification manuelle ne reçoit pas un faux succès automatique', () => {
  const result = evaluateSpecification({ ...spec, mode: 'manual', reason: 'Avis à relire' }, [], [])
  expect(result.status).toBe('manual-review')
  expect(result.planned).toBe(0)
})
test('[AUD-011][CI-SPEC-007][outillage] affectation et consultation ne confondent pas les deux specs partageant AUD006', () => {
  const ownership = { ...spec, issues: ['AUD-006'], excludePrefixes: ['AFF-'], excludeCases: ['NAV-015'] }
  const cases = ['DROIT-001', 'AFF-010', 'NAV-015'].map(caseId => ({ ...entry, caseId, issues: ['AUD-006'] }))
  expect(casesForSpecification(ownership, cases).map(item => item.caseId)).toEqual(['DROIT-001'])
})
test('[AUD-011][CI-SPEC-008][outillage] un nouveau test lié à AUD005 rejoint automatiquement sa spec', () => {
  expect(casesForSpecification(spec, [entry, { ...entry, caseId: 'NOUVEAU' }])).toHaveLength(2)
})
test('[AUD-011][CI-SPEC-009][outillage] le manifeste rejette specs dupliquées et sélections vides', () => {
  expect(() => validateSpecifications([spec, spec], [entry])).toThrow()
  expect(() => validateSpecifications([spec], [])).toThrow()
  expect(() => validateSpecifications([{ ...spec, requiredCases: [] }], [entry])).toThrow()
})

const execution = { environments: { api: { revision: 'sha-actuel' } }, rawReports: { api: { status: 'failed', planned: 1, results: [success] } }, expectedRevision: 'sha-actuel' }
test('[AUD-011][CI-SPEC-010][outillage] un ancien SHA est refusé par le contrôle commun à la synthèse et au job', () => {
  expect(specificationExecutionErrors(spec, [entry], { ...execution, expectedRevision: 'autre-sha' })).toContain('api : révision du rapport absente ou différente.')
  expect(specificationExecutionErrors(spec, [entry], execution)).toEqual([])
})
test('[AUD-011][CI-SPEC-011][outillage] une erreur globale reste bloquante même si les cas du lot sont verts', () => {
  expect(specificationExecutionErrors(spec, [entry], { ...execution, rawReports: { api: { status: 'failed', planned: 1, results: [success], invalid: ['Erreur setup'] } } }))
    .toContain('api : erreur globale d’exécution.')
})
test('[AUD-011][CI-SPEC-012][outillage] la synthèse et le job refusent les prérequis qualité échoués', () => {
  expect(specificationExecutionErrors(spec, [entry], { ...execution, prerequisites: { installation: { result: 'success' }, qualite: { result: 'failure' }, build: { result: 'success' } } }))
    .toEqual(['Prérequis qualite non réussi.'])
})
test('[AUD-011][CI-SPEC-013][outillage] une preuve partielle ou un rapport absent ne suffit pas', () => {
  expect(specificationExecutionErrors(spec, [entry], { ...execution, rawReports: {} })).toContain('api : rapport brut absent ou illisible.')
  expect(specificationExecutionErrors(spec, [entry], { ...execution, partialIssue: 'AUD-005' })).toContain('api : exécution partielle par issue.')
})

test('[AUD-011][CI-SPEC-014][outillage] la synthèse et le job refusent ensemble les résultats d’un ancien SHA', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'arla-spec-context-'))
  try {
    const cases = (await catalog()).filter(item => item.suite === 'api')
    await writeFile(join(directory, 'api.json'), JSON.stringify({ provenance: { revision: 'ancien-sha-fictif' }, status: 'passed', planned: cases.length,
      invalid: [], results: cases.map(item => ({ ...item, status: 'passed' })) }))
    const summary = await summarize(directory)
    expect(summary.bySpecification.find((item: { id: string; status: string }) => item.id === 'SPEC-01')?.status).toBe('failed')
    const job = spawnSync(process.execPath, ['scripts/ci/spec-check.mjs', 'SPEC-01'], { encoding: 'utf8', env: { ...process.env, CI_REPORT_DIRECTORY: directory } })
    expect(job.status).toBe(1)
    expect(JSON.parse(await readFile(join(directory, 'SPEC-01.json'), 'utf8')).status).toBe('failed')
  } finally { await rm(directory, { recursive: true, force: true }) }
})
test('[AUD-011][CI-SPEC-015][outillage] une suite tronquée ne devient pas une preuve complète du lot', () => {
  expect(specificationExecutionErrors(spec, [entry], { ...execution, rawReports: { api: { status: 'passed', planned: 1, results: [] } } }))
    .toContain('api : rapport de suite incomplet.')
})
