// Harnais d'audit uniquement : refuse toute cible autre que les services isolés.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { spawnSync } from 'node:child_process'
const scratch = '/tmp/expense-io-audit-20261014'
const require = createRequire(`${scratch}/package.json`)
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const db = new Pool({ connectionString: 'postgres://expense:expense-audit-only@127.0.0.1:15433/expense_io_audit' })
const s3 = new S3Client({ endpoint: 'http://127.0.0.1:14567', region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: 'test', secretAccessKey: 'test' } })
const bucket = 'audit-receipts-20261014'
const base = process.argv[2] === 'storage-failure' ? 'http://127.0.0.1:13401' : 'http://127.0.0.1:13400'
const sha = '265924bc7274047989e708ab635c2854d376230f'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const fixturePath = `${scratch}/audit-results/fixtures.json`
const results = { source: sha, mode: process.argv[2], environment: { postgresPort: 15433, s3Port: 14567, appPort: 13400, browser: false }, observations: [], timings: [] }
function check(name, expected, actual) { results.observations.push({ name, expected, actual, pass: JSON.stringify(expected) === JSON.stringify(actual) }) }
async function request(path, cookie = '', options = {}) {
  const start = performance.now()
  const r = await fetch(base + path, { ...options, headers: { ...options.headers, cookie } })
  const raw = await r.text(); let body
  try { body = JSON.parse(raw) } catch { body = null }
  return { status: r.status, body, bytes: Buffer.byteLength(raw), ms: performance.now() - start }
}
async function login(email, password = 'audit-only-password') {
  const jar = new Map()
  function absorb(r) { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)) } }
  const cookies = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  let r = await fetch(`${base}/api/auth/csrf`); absorb(r); const { csrfToken } = await r.json()
  r = await fetch(`${base}/api/auth/callback/credentials`, { method: 'POST', redirect: 'manual', headers: { cookie: cookies(), 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${base}/expenses` }) }); absorb(r)
  const session = await request('/api/auth/session', cookies())
  return { cookie: cookies(), authenticated: Boolean(session.body?.user?.id) }
}
async function prepare() {
  const f = { companies: {}, users: {}, notes: {}, receipt: 'fixtures/reference.png' }
  const hash = await bcrypt.hash('audit-only-password', 12)
  for (const company of ['a', 'b']) {
    f.companies[company] = (await db.query('INSERT INTO companies(name,email_domain) VALUES($1,$2) RETURNING id', [`Audit ${company}`, `audit-${company}.invalid`])).rows[0].id
    for (const [key, role, manager] of [['hr', 'hr_admin', null], ['root', 'manager', null], ['sub', 'manager', 'root'], ['employee', 'employee', 'root'], ['unrelated', 'employee', 'sub']]) {
      const k = company + '_' + key; const email = `${key}@audit-${company}.invalid`
      const id = (await db.query('INSERT INTO users(company_id,name,email,password_hash,role,manager_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id', [f.companies[company], k, email, hash, role, manager ? f.users[company + '_' + manager].id : null])).rows[0].id
      f.users[k] = { id, email, role }
    }
    for (const key of ['root', 'employee', 'unrelated']) {
      const k = company + '_' + key
      const id = (await db.query("INSERT INTO expense_notes(user_id,amount,expense_date,description,receipt_key) VALUES($1,12.34,'2026-10-01',$2,$3) RETURNING id", [f.users[k].id, `Audit note ${k}`, f.receipt])).rows[0].id
      f.notes[k] = id
    }
  }
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: f.receipt, Body: png, ContentType: 'image/png' }))
  writeFileSync(fixturePath, JSON.stringify(f, null, 2))
  check('fixtures entreprises', 2, Object.keys(f.companies).length)
  check('fixtures utilisateurs', 10, Object.keys(f.users).length)
  check('fixtures notes initiales', 6, Object.keys(f.notes).length)
  results.database = (await db.query('SELECT current_user,version(),rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0]
}
async function campaign() {
  const f = JSON.parse(readFileSync(fixturePath, 'utf8')); const auth = {}
  for (const key of ['a_employee', 'a_root', 'a_hr', 'b_employee']) { auth[key] = await login(f.users[key].email); check(`connexion ${key}`, true, auth[key].authenticated) }
  check('mot de passe incorrect', false, (await login(f.users.a_employee.email, 'incorrect')).authenticated)
  for (const [path, status] of [['/api/expense-notes', 401], ['/api/manager/expense-notes', 401], ['/api/hr/expense-notes', 403]]) check(`anonyme ${path}`, status, (await request(path)).status)
  let r = await request('/api/expense-notes', auth.a_employee.cookie)
  check('liste propre limitée au propriétaire', true, r.status === 200 && r.body.every(n => n.userId === f.users.a_employee.id))
  r = await request('/api/manager/expense-notes', auth.a_root.cookie)
  check('liste manager conforme aux affectations', [f.notes.a_employee], r.body.map(n => n.id).sort())
  r = await request('/api/hr/expense-notes', auth.a_hr.cookie)
  check('liste RH limitée à son entreprise', [f.notes.a_root], r.body.map(n => n.id).sort())
  for (const [label, path, who, expected] of [
    ['reçu propre', `/api/expense-notes/${f.notes.a_employee}/receipt-url`, 'a_employee', 200],
    ['reçu autre entreprise propriétaire', `/api/expense-notes/${f.notes.b_employee}/receipt-url`, 'a_employee', 404],
    ['reçu manager autorisé', `/api/manager/expense-notes/${f.notes.a_employee}/receipt-url`, 'a_root', 200],
    ['reçu manager non rattaché', `/api/manager/expense-notes/${f.notes.a_unrelated}/receipt-url`, 'a_root', 404],
    ['reçu manager autre entreprise', `/api/manager/expense-notes/${f.notes.b_employee}/receipt-url`, 'a_root', 404],
    ['reçu RH autre entreprise', `/api/hr/expense-notes/${f.notes.b_root}/receipt-url`, 'a_hr', 404]]) {
    r = await request(path, auth[who].cookie);check(label, expected, r.status)
    if (label === 'reçu propre' && r.body?.url) { const file = await fetch(r.body.url); check('lien signé ouvre objet S3', 200, file.status) }
  }
  const submit = async (amount, date, bytes = png, mime = 'image/png', description = 'Audit soumission') => {
    const data = new FormData(); data.set('amount', amount); data.set('expenseDate', date); data.set('description', description); data.set('receipt', new Blob([bytes], { type: mime }), 'audit.png')
    return request('/api/expense-notes', auth.a_employee.cookie, { method: 'POST', body: data })
  }
  r = await submit('15.50', '2026-10-01'); check('soumission valide HTTP', 201, r.status)
  if (r.status === 201) {
    const row = (await db.query('SELECT receipt_key,amount::text,expense_date::text,status FROM expense_notes WHERE id=$1', [r.body.id])).rows[0]
    check('soumission persistance SQL', { amount: '15.50', expense_date: '2026-10-01', status: 'pending' }, { amount: row.amount, expense_date: row.expense_date, status: row.status })
    const obj = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: row.receipt_key }));check('soumission objet S3', png.length, obj.ContentLength)
  }
  r = await submit('12abc', '2026-10-01');check('AUD-014 suffixe montant refusé', 400, r.status)
  r = await submit('1,2', '2026-10-01');check('AUD-014 virgule vaut 1.2', 1.2, r.body?.amount)
  r = await submit('12', '2099-01-01');check('AUD-015 date future refusée selon règle choisie', 400, r.status)
  r = await submit('12', '2026-02-30');check('AUD-015 date inexistante erreur contrôlée', 400, r.status)
  check('AUD-005 absence stack publique sur date invalide', false, Boolean(r.body?.stack))
  r = await submit('12', '2026-10-01', Buffer.from('ceci ne constitue pas une image'), 'image/png');check('G14 faux PNG refusé', 400, r.status)
  r = await request('/api/expense-notes?sort=colonne_inexistante', auth.a_employee.cookie);check('AUD-004 tri invalide refusé avant SQL', 400, r.status);check('AUD-005 absence stack publique sur SQL invalide', false, Boolean(r.body?.stack))
  const assign = (id, body) => request(`/api/hr/users/${id}/manager`, auth.a_hr.cookie, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
  r = await assign(f.users.a_employee.id, '{');check('AUD-020 JSON illisible refusé', 400, r.status)
  check('AUD-020 affectation conservée', f.users.a_root.id, (await db.query('SELECT manager_id FROM users WHERE id=$1', [f.users.a_employee.id])).rows[0].manager_id)
  await db.query('UPDATE users SET manager_id=$1 WHERE id=$2', [f.users.a_root.id, f.users.a_employee.id])
  r = await assign(f.users.a_employee.id, JSON.stringify({ managerId: f.users.b_root.id }));check('AUD-006 affectation autre entreprise refusée', 409, r.status)
  await db.query('UPDATE users SET manager_id=$1 WHERE id=$2', [f.users.a_root.id, f.users.a_employee.id])
  r = await assign(f.users.a_root.id, JSON.stringify({ managerId: f.users.a_sub.id }));check('AUD-021 boucle à deux managers refusée', 409, r.status)
  await db.query('UPDATE users SET manager_id=NULL WHERE id=$1', [f.users.a_root.id])
  r = await assign(f.users.a_employee.id, JSON.stringify({ managerId: null }));check('retrait explicite valide', 200, r.status)
  await db.query('UPDATE users SET manager_id=$1 WHERE id=$2', [f.users.a_root.id, f.users.a_employee.id])
  r = await request(`/api/manager/expense-notes/${f.notes.a_employee}/approve`, auth.a_root.cookie, { method: 'POST' });check('approbation valide', 200, r.status)
  r = await request(`/api/manager/expense-notes/${f.notes.a_employee}/reject`, auth.a_root.cookie, { method: 'POST' });check('refus après décision séquentielle', 409, r.status)
  await db.query("UPDATE users SET role='employee' WHERE id=$1", [f.users.a_root.id])
  r = await request('/api/manager/expense-notes', auth.a_root.cookie);check('G10 rôle rétrogradé session inchangée refusé', 401, r.status)
  await db.query("UPDATE users SET role='manager' WHERE id=$1", [f.users.a_root.id])
  for (const [label, bytes, mime] of [['image minuscule', png, 'image/png'], ['image corrompue', Buffer.from('image invalide'), 'image/png'], ['PDF non supporté OCR', Buffer.from('%PDF-1.4\n%%EOF'), 'application/pdf']]) {
    const data = new FormData();data.set('receipt', new Blob([bytes], { type: mime }), 'audit');r = await request('/api/expense-notes/receipt-suggestion', auth.a_employee.cookie, { method: 'POST', body: data });results.timings.push({ label: `OCR ${label}`, ms: r.ms, status: r.status, returnedFields: Object.keys(r.body ?? {}) });
    if (label === 'image corrompue') check('AUD-008 panne moteur distinguée du succès vide', true, r.status >= 400)
  }
  await sqlChecks(f)
  await volumeChecks(f, auth.a_employee.cookie)
}
async function sqlChecks(f) {
  await db.query('CREATE ROLE expense_audit_enforced NOLOGIN NOSUPERUSER NOBYPASSRLS')
  await db.query('GRANT USAGE ON SCHEMA public TO expense_audit_enforced');await db.query('GRANT SELECT,INSERT,UPDATE ON users,companies,expense_notes TO expense_audit_enforced');await db.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO expense_audit_enforced')
  const c = await db.connect()
  try {
    await c.query('BEGIN');await c.query('SET LOCAL ROLE expense_audit_enforced');await c.query("SELECT set_config('app.current_user_id',$1,true)", [f.users.a_hr.id]);
    const r = await c.query('SELECT id FROM expense_notes WHERE id=$1', [f.notes.b_root]);check('AUD-009 politique RLS RH exclut entreprise B', 0, r.rowCount);await c.query('ROLLBACK')
    await c.query('BEGIN');await c.query('SET LOCAL ROLE expense_audit_enforced');await c.query("SELECT set_config('app.current_user_id',$1,true)", [f.users.a_employee.id]);
    const inserted = await c.query("INSERT INTO expense_notes(user_id,amount,expense_date,description,receipt_key) VALUES($1,1,'2026-10-01','audit finalisation','') RETURNING id", [f.users.a_employee.id]);await c.query('COMMIT')
    await c.query('BEGIN');await c.query('SET LOCAL ROLE expense_audit_enforced');const updated = await c.query("UPDATE expense_notes SET receipt_key='fixtures/reference.png' WHERE id=$1", [inserted.rows[0].id]);check('AUD-009 finalisation originale sans contexte sous RLS', 1, updated.rowCount);await c.query('ROLLBACK')
  } finally { await c.query('ROLLBACK');c.release() }
  await db.query("UPDATE expense_notes SET status='pending' WHERE id=$1", [f.notes.a_employee])
  const a = await db.connect();const b = await db.connect()
  try {
    await a.query('BEGIN');await b.query('BEGIN')
    const q = 'SELECT en.* FROM expense_notes en JOIN users u ON u.id=en.user_id WHERE en.id=$1 AND u.manager_id=$2'
    const params = [f.notes.a_employee, f.users.a_root.id]
    await a.query(q, params);await b.query(q, params)
    await a.query("UPDATE expense_notes SET status='approved' WHERE id=$1 RETURNING *", [f.notes.a_employee]);await a.query('COMMIT')
    await b.query("UPDATE expense_notes SET status='rejected' WHERE id=$1 RETURNING *", [f.notes.a_employee]);await b.query('COMMIT')
    check('AUD-007 décisions SQL chevauchées première conservée', 'approved', (await db.query('SELECT status FROM expense_notes WHERE id=$1', [f.notes.a_employee])).rows[0].status)
  } finally { a.release();b.release() }
}
async function volumeChecks(f, cookie) {
  await db.query("INSERT INTO expense_notes(user_id,amount,expense_date,description,receipt_key,created_at) SELECT $1,1,'2026-10-01','audit-volume-'||i,'fixtures/reference.png',NOW()-i*INTERVAL '1 minute' FROM generate_series(1,10000)i", [f.users.a_employee.id]);await db.query('ANALYZE expense_notes')
  const sql = 'SELECT * FROM expense_notes WHERE user_id=$1 ORDER BY created_at DESC'
  results.volume = { notesAdded: 10000, repetitions: 10, indexesBefore: (await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE tablename='expense_notes'")).rows }
  results.volume.planBefore = (await db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql,[f.users.a_employee.id])).rows[0]['QUERY PLAN']
  for(let i=0;i<10;i++){const r=await request('/api/expense-notes',cookie);results.timings.push({label:'liste 10000 avant index',ms:r.ms,bytes:r.bytes,status:r.status,count:r.body.length})}
  await db.query('CREATE INDEX audit_probe_owner_created ON expense_notes(user_id,created_at DESC)');await db.query('ANALYZE expense_notes')
  results.volume.planAfter = (await db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql,[f.users.a_employee.id])).rows[0]['QUERY PLAN']
  for(let i=0;i<10;i++){const r=await request('/api/expense-notes',cookie);results.timings.push({label:'liste 10000 après index expérimental',ms:r.ms,bytes:r.bytes,status:r.status,count:r.body.length})}
  await db.query('DROP INDEX audit_probe_owner_created')
}
async function storageFailure() {
  const f = JSON.parse(readFileSync(fixturePath, 'utf8'))
  const a = await login(f.users.a_employee.email)
  const data = new FormData();data.set('amount','12');data.set('expenseDate','2026-10-01');data.set('description','audit-storage-failure');data.set('receipt',new Blob([png],{type:'image/png'}),'audit.png')
  const r = await request('/api/expense-notes',a.cookie,{method:'POST',body:data})
  check('AUD-003 erreur upload HTTP',500,r.status)
  const rows = (await db.query("SELECT status,receipt_key FROM expense_notes WHERE description='audit-storage-failure'")).rows
  check('AUD-003 aucune note pending sans reçu après panne',false,rows.some(n=>n.status==='pending'&&!n.receipt_key))
  check('AUD-005 aucune stack sur panne stockage',false,Boolean(r.body?.stack))
  const seedEnv = { ...process.env, DATABASE_URL:'postgres://expense:expense-audit-only@127.0.0.1:15433/expense_io_audit', S3_ENDPOINT:'http://127.0.0.1:14567', S3_REGION:'us-east-1', S3_ACCESS_KEY_ID:'test', S3_SECRET_ACCESS_KEY:'test', S3_FORCE_PATH_STYLE:'true', SEED_HR_EMAIL:'hr@audit-seed.invalid', SEED_MANAGER_EMAIL:'manager@audit-seed.invalid', SEED_EMPLOYEE_EMAIL:'employee@audit-seed.invalid', SEED_HR_PASSWORD:'audit-only-password', SEED_MANAGER_PASSWORD:'audit-only-password', SEED_EMPLOYEE_PASSWORD:'audit-only-password' }
  const failed=spawnSync(process.execPath,['scripts/seed.mjs'],{cwd:scratch,env:{...seedEnv,S3_BUCKET:'audit-bucket-absent-20261014'},encoding:'utf8'})
  check('AUD-018 seed panne contrôlée échoue',1,failed.status)
  const resumed=spawnSync(process.execPath,['scripts/seed.mjs'],{cwd:scratch,env:{...seedEnv,S3_BUCKET:bucket},encoding:'utf8'})
  check('AUD-018 commande seed relancée réussit',0,resumed.status)
  const seedRows=(await db.query("SELECT en.receipt_key,en.status FROM expense_notes en JOIN users u ON u.id=en.user_id WHERE u.email='employee@audit-seed.invalid'")).rows
  check('AUD-018 reprise répare le reçu manquant',true,seedRows.length===1&&Boolean(seedRows[0].receipt_key))
  results.seed={firstExit:failed.status,retryExit:resumed.status,employeeNotes:seedRows.length,receiptKeyEmpty:seedRows[0]?.receipt_key==='',rawOutputStored:false}
}
try {
  if (process.argv[2] === 'prepare') await prepare()
  else if (process.argv[2] === 'campaign') await campaign()
  else if (process.argv[2] === 'storage-failure') await storageFailure()
  else throw new Error('Mode prepare, campaign ou storage-failure requis')
} catch (e) { results.blocker = { name: e.name, code: e.code, message: e.message };process.exitCode = 1 }
finally {
  await db.end(); const file=`${scratch}/audit-results/${process.argv[2]}.json`;writeFileSync(file,JSON.stringify(results,null,2));console.log(JSON.stringify({file,checks:results.observations.length,passed:results.observations.filter(x=>x.pass).length,failed:results.observations.filter(x=>!x.pass),blocker:results.blocker},null,2))
}
