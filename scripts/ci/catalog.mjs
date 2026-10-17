import ts from 'typescript'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { metadata } from '../../tests/reporters/metadata.mjs'

export async function catalog() {
  const issues = new Set((await readdir('docs/audit/solutions-to-audit')).map(f => f.match(/^(AUD-\d{3}|G10|G14)-/)?.[1]).filter(Boolean))
  const cases = []; const ids = new Set()
  for (const suite of ['unit', 'api', 'e2e']) {
    for (const file of (await readdir(`tests/${suite}`)).filter(f => /\.(test|spec)\.ts$/.test(f)).sort()) {
      const path = join('tests', suite, file); const text = await readFile(path, 'utf8')
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
      function visit(node) {
        if (ts.isCallExpression(node)) {
          const expression = node.expression.getText(source)
          if (/^(test|it)\.(skip|todo|fail|only)/.test(expression)) throw new Error(`Test ignoré/masqué/interdit dans ${path}`)
          if (['test', 'it'].includes(expression)) {
            const title = node.arguments[0]
            if (!title || !ts.isStringLiteral(title)) throw new Error(`Titre de test littéral requis : ${path}`)
            const info = metadata(title.text)
            if (ids.has(info.caseId)) throw new Error(`Identifiant de cas dupliqué : ${info.caseId}`)
            for (const issue of info.issues) if (!issues.has(issue)) throw new Error(`Issue inconnue : ${issue}`)
            ids.add(info.caseId); cases.push({ ...info, suite, file: path })
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
    if (!cases.some(c => c.suite === suite)) throw new Error(`Suite ${suite} vide.`)
  }
  return cases
}
if (process.argv[1]?.endsWith('/catalog.mjs')) {
  const cases = await catalog(); await mkdir('reports', { recursive: true })
  await writeFile('reports/catalog.json', JSON.stringify(cases, null, 2))
  console.log(`${cases.length} tests identifiés, chacun avec issue et cas uniques.`)
}
