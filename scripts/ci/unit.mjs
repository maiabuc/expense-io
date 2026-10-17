import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { provenance } from '../../tests/reporters/provenance.mjs'
await mkdir('reports', { recursive: true })
await rm('reports/unit.json', { force: true })
await writeFile('reports/unit-environment.json', JSON.stringify(provenance(), null, 2))
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2)], { stdio: 'inherit', shell: false })
process.exitCode = result.status ?? 1
