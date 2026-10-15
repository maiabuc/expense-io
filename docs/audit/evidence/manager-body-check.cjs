// Observation isolée des deux déclarations de parsing ; aucun serveur ou DB.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require(process.cwd() + '/node_modules/typescript');
const fichier = 'src/app/api/hr/users/[id]/manager/route.ts';
const source = fs.readFileSync(fichier, 'utf8');
const arbre = ts.createSourceFile(fichier, source, ts.ScriptTarget.Latest, true);
const declarations = [];
function visiter(noeud) {
  if (ts.isVariableStatement(noeud) && noeud.declarationList.declarations.some(
    d => ['body', 'managerId'].includes(d.name.getText(arbre)))) {
    declarations.push(noeud.getText(arbre));
  }
  ts.forEachChild(noeud, visiter);
}
visiter(arbre);
if (declarations.length !== 2) throw new Error('Source de parsing modifié : réexaminer le protocole.');
const code = ts.transpileModule(
  'async function verifier(request){' + declarations.join('\n') +
  '; return managerId;} globalThis.verifier=verifier;',
  {compilerOptions: {target: ts.ScriptTarget.ES2022}}
).outputText;
const contexte = {};
vm.createContext(contexte);
vm.runInContext(code, contexte);
(async () => {
  const corps = ['{', '{}', 'null', '[]', '42', '"texte"', '{"managerId":null}',
    '{"managerId":"11111111-1111-4111-8111-111111111111"}'];
  const resultats = [];
  for (const texte of corps) {
    const managerId = await contexte.verifier({json: async () => JSON.parse(texte)});
    resultats.push({corps: texte, managerId});
  }
  console.log(JSON.stringify({fichier, resultats}, null, 2));
})().catch(erreur => {console.error(erreur); process.exitCode = 1;});
