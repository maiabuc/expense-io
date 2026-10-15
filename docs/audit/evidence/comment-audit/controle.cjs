const fs = require('node:fs');
const path = require('node:path');
const ts = require(process.cwd() + '/node_modules/typescript');
const vm = require('node:vm');
const cp = require('node:child_process');
const dest = process.env.ARLA_AUDIT_OUTPUT || '/tmp/arla-comment-audit-20261014';
fs.mkdirSync(dest, {recursive:true});
const sha = cp.execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const fichiers = cp.execFileSync('git', ['ls-files', 'src'], {encoding:'utf8'}).trim().split('\n');
const inventaire = [];
for (const fichier of fichiers) {
  const source = fs.readFileSync(fichier, 'utf8');
  const sf = ts.createSourceFile(fichier, source, ts.ScriptTarget.Latest, true);
  const plages = new Map();
  const ajouter = r => { if(r) for(const p of r) plages.set(p.pos, p); };
  const visiter = n => { ajouter(ts.getLeadingCommentRanges(source,n.pos)); ajouter(ts.getTrailingCommentRanges(source,n.end)); ts.forEachChild(n,visiter); };
  visiter(sf);
  const groupes = [];
  for (const p of [...plages.values()].sort((a,b)=>a.pos-b.pos)) {
    const dernier = groupes.at(-1);
    if (dernier && /^\s*$/.test(source.slice(dernier.end,p.pos)) && !source.slice(dernier.end,p.pos).includes('\n\n')) dernier.end = p.end;
    else groupes.push({pos:p.pos,end:p.end});
  }
  for(const p of groupes) inventaire.push({fichier, debut:sf.getLineAndCharacterOfPosition(p.pos).line+1, fin:sf.getLineAndCharacterOfPosition(p.end).line+1, texte:source.slice(p.pos,p.end)});
}
fs.writeFileSync(path.join(dest,'inventaire.json'),JSON.stringify({sha,fichiers:fichiers.length,commentaires:inventaire},null,2));
function extraire(fichier,nom) {
 const source=fs.readFileSync(fichier,'utf8'); const sf=ts.createSourceFile(fichier,source,ts.ScriptTarget.Latest,true); let code;
 function visite(n) {
  if(ts.isFunctionDeclaration(n)&&n.name?.text===nom) code=n.getText(sf);
  if(ts.isVariableDeclaration(n)&&n.name.getText(sf)===nom) code='const '+n.getText(sf)+';';
  ts.forEachChild(n,visite);
 }
 visite(sf); if(!code) throw new Error('Fonction introuvable '+fichier+':'+nom);
 return ts.transpileModule(code+'\nglobalThis.verifier='+nom+';', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
}
const cas=[
 ['src/app/expenses/page.tsx','handleSubmit','submitting',[{preventDefault(){},currentTarget:{reset(){}}}]],
 ['src/app/expenses/page.tsx','handleSuggestFields','extracting',[]],
 ['src/components/PendingApprovalsPanel.tsx','handleDecide','decidingId',['note-test','approve']],
 ['src/components/AdminConsole.tsx','handleManagerChange','savingId',['user-test','manager-test']],
 ['src/components/AdminConsole.tsx','handleDecide','decidingId',['note-test','reject']],
 ['src/app/expenses/page.tsx','loadNotes','loading',[]],
 ['src/components/PendingApprovalsPanel.tsx','loadPending','loading',[]],
 ['src/components/AdminConsole.tsx','loadUsers','usersLoading',[]],
 ['src/components/AdminConsole.tsx','loadNotes','notesLoading',[]],
];
(async()=>{
 const mesures=[];
 for(const [fichier,nom,flag,args] of cas) {
  for(const panne of [false,true]) {
   const etat={loading:true,usersLoading:true,notesLoading:true,submitting:false,extracting:false,decidingId:null,savingId:null,error:null,usersError:null,notesError:null};
   const ctx={console,useCallback:f=>f,fetch:async()=>{if(panne)throw new TypeError('Échec réseau simulé');return {ok:true,json:async()=>[]};},FormData:class{set(){}},receiptInputRef:{current:{files:[{}]}},loadNotes:async()=>{},loadPending:async()=>{},loadUsers:async()=>{}};
   for(const cle of ['loading','usersLoading','notesLoading','submitting','extracting','decidingId','savingId','error','usersError','notesError','notes','users','amount','expenseDate','suggestionNotice']) ctx['set'+cle[0].toUpperCase()+cle.slice(1)]=valeur=>{etat[cle]=valeur;};
   vm.createContext(ctx); vm.runInContext(extraire(fichier,nom),ctx); let erreur=false;
   try{await ctx.verifier(...args);}catch(e){erreur=true;}
   mesures.push({fichier,fonction:nom,panne,exceptionNonTraitee:erreur,indicateur:flag,valeur:etat[flag],message:etat.error??etat.usersError??etat.notesError});
  }
 }
 const dates=[];
 for(const fuseau of ['Europe/Paris','UTC','America/Los_Angeles']) {
  const code="const d='2026-10-14';console.log(JSON.stringify({date:d,affichage:new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(d))}));";
  const observation=JSON.parse(cp.execFileSync(process.execPath,['-e',code],{encoding:'utf8',env:{...process.env,TZ:fuseau}}));
  dates.push({fuseau,...observation});
 }
 const resultat={sha,node:process.version,typescript:ts.version,portee:'Fonctions extraites du source, setters/fetch simulés ; pas de React monté, serveur, DB ni stockage',mesures,dates};
 fs.writeFileSync(path.join(dest,'mesures.json'),JSON.stringify(resultat,null,2));
 console.log(JSON.stringify({fichiersSrc:fichiers.length,fichiersCommentes:new Set(inventaire.map(c=>c.fichier)).size,groupesCommentaires:inventaire.length,inventaire:inventaire.map(({fichier,debut,fin})=>({fichier,debut,fin})),controlesSucces:mesures.filter(m=>!m.panne).length,controlesPanne:mesures.filter(m=>m.panne).length,resultatsPanne:mesures.filter(m=>m.panne),dates},null,2));
})();
