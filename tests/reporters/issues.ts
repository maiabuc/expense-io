import { mkdir, writeFile } from 'node:fs/promises'
import type { Reporter, TestCase, TestResult, FullResult, FullConfig, Suite, TestError } from '@playwright/test/reporter'
import { provenance } from './provenance.mjs'
import { metadata, sanitize } from './metadata.mjs'

export default class IssuesReporter implements Reporter {
  private results: object[] = []
  private invalid: string[] = []
  private planned = 0
  private suiteName = 'playwright'
  onError(error: TestError) {
    const message = sanitize(error.message)
    this.invalid.push(message); console.error(message)
  }
  onBegin(_config: FullConfig, suite: Suite) {
    const tests = suite.allTests(); this.planned = tests.length
    const projects = [...new Set(tests.map(t => t.parent.project()?.name))]
    this.suiteName = projects.length === 1 ? String(projects[0]) : 'playwright'
    const ids = new Set<string>()
    for (const test of tests) {
      try {
        const info = metadata(test.title)
        if (ids.has(info.caseId)) throw new Error(`Identifiant de cas dupliqué : ${info.caseId}`)
        ids.add(info.caseId)
      } catch (error) { this.invalid.push(String(error)) }
    }
  }
  onTestEnd(test: TestCase, result: TestResult) {
    try {
      const info = metadata(test.title)
      const record = { ...info, suite: this.suiteName, status: result.status, duration: result.duration,
        errors: result.errors.map(e => sanitize(e.message)), retry: result.retry }
      this.results.push(record)
      console.log(`${result.status === 'passed' ? 'OK' : 'ECHEC'} ${test.title}`)
      if (result.status !== 'passed') console.log(record.errors.join('\n'))
    } catch (error) { this.invalid.push(String(error)) }
  }
  async onEnd(result: FullResult) {
    await mkdir('reports', { recursive: true })
    await writeFile(`reports/${this.suiteName}.json`, JSON.stringify({ provenance: provenance(), suite: this.suiteName, status: result.status,
      planned: this.planned, results: this.results, invalid: this.invalid }, null, 2))
    if (this.invalid.length || !this.planned || this.results.length !== this.planned) {
      console.error('Suite vide, traçabilité invalide ou exécution incomplète.', this.invalid)
      return { status: 'failed' as const }
    }
  }
}
