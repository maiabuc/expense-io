import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { catalog } from './catalog.mjs'
import { summarize } from './report.mjs'
import { provenance } from '../../tests/reporters/provenance.mjs'
import { validateSpecifications, specificationMarkdown } from '../../tests/reporters/specifications.mjs'

const id = process.argv[2]
if (!/^SPEC-\d{2}$/.test(id ?? '')) throw new Error('Utilisation : npm run test:spec:report -- SPEC-01')
const specifications = JSON.parse(await readFile('tests/specifications.json', 'utf8'))
const planned = await catalog()
validateSpecifications(specifications, planned)
const specification = specifications.find(item => item.id === id)
if (!specification) throw new Error(`Spec inconnue : ${id}`)
if (process.env.TEST_ISSUE) throw new Error('Un résultat par spec exige les suites complètes ; retirer TEST_ISSUE.')
const directory = process.env.CI_REPORT_DIRECTORY ?? 'reports'
const aggregate = await summarize(directory)
const result = { ...aggregate.bySpecification.find(item => item.id === id), provenance: provenance() }
await mkdir(directory, { recursive: true })
await writeFile(`${directory}/${id}.json`, JSON.stringify(result, null, 2))
await writeFile(`${directory}/${id}.md`, specificationMarkdown([result]))
console.log(JSON.stringify({ spec: id, status: result.status, passed: result.passed, failed: result.failed, notRun: result.notRun,
  missingCoverage: result.missingCoverage, errors: result.errors }))
process.exitCode = result.status === 'passed' ? 0 : result.status === 'manual-review' ? 2 : 1
