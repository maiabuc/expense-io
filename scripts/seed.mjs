// Peuple une base de démonstration entièrement navigable dès `make dev` :
// une entreprise, un hr_admin, un manager racine, un employé qui lui est
// rattaché, et une note de frais en attente pour chacun des deux (avec un
// vrai reçu uploadé) — pour qu'il n'y ait aucune étape manuelle (signup,
// promotion de rôle, soumission d'une note) avant de pouvoir naviguer.
// Idempotent : relançable sans dupliquer les comptes ni les notes, et capable de
// terminer une préparation interrompue (note sans reçu, reçu sans référence,
// référence sans objet) sur la même note, en conservant approved et rejected.
// La commande ne réussit que si toutes les données de démonstration sont complètes.
import bcrypt from 'bcryptjs'
import { config as loadEnv } from 'dotenv'
import { Pool } from 'pg'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

loadEnv({ quiet: true })

const hrEmail = process.env.SEED_HR_EMAIL ?? 'hr@expense.io'
const hrPassword = process.env.SEED_HR_PASSWORD ?? 'hr1234'
const managerEmail = process.env.SEED_MANAGER_EMAIL ?? 'manager@expense.io'
const managerPassword = process.env.SEED_MANAGER_PASSWORD ?? 'manager1234'
const employeeEmail = process.env.SEED_EMPLOYEE_EMAIL ?? 'demo@expense.io'
const employeePassword = process.env.SEED_EMPLOYEE_PASSWORD ?? 'demo1234'
const domain = hrEmail.split('@')[1]?.toLowerCase()
if (!domain) {
  throw new Error(`Email RH invalide : "${hrEmail}"`)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Un PNG 1x1 valide (pas juste des octets arbitraires) : "voir le reçu"
// affiche une vraie image dans le navigateur plutôt qu'un fichier corrompu.
const RECEIPT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
})
const bucket = process.env.S3_BUCKET ?? 'receipts'

async function resolveCompany() {
  const companyName = domain.split('.')[0]
  const inserted = await pool.query(
    `INSERT INTO companies (name, email_domain) VALUES ($1, $2)
     ON CONFLICT (email_domain) DO NOTHING
     RETURNING id`,
    [companyName, domain]
  )
  if (inserted.rows[0]) return inserted.rows[0].id
  const existing = await pool.query('SELECT id FROM companies WHERE email_domain = $1', [domain])
  return existing.rows[0].id
}

async function upsertUser(email, name, password, role, companyId, managerId = null) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows[0]) {
    await pool.query(
      'UPDATE users SET role = $1, company_id = $2, name = $3, manager_id = $4 WHERE id = $5',
      [role, companyId, name, managerId, existing.rows[0].id]
    )
    return existing.rows[0].id
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const inserted = await pool.query(
    'INSERT INTO users (email, name, password_hash, role, company_id, manager_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [email, name, passwordHash, role, companyId, managerId]
  )
  console.log(`Compte ${role} "${email}" créé (mot de passe : "${password}").`)
  return inserted.rows[0].id
}

// Lit l'objet stocké : null s'il n'existe pas ; toute autre panne est propagée (jamais un faux « absent »).
async function readReceipt(key) {
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    return Buffer.from(await result.Body.transformToByteArray())
  } catch (error) {
    if (error?.name === 'NoSuchKey') return null
    throw error
  }
}

// Dépose le reçu de démonstration seulement s'il manque ou diffère, puis relit l'objet.
async function ensureReceipt(key) {
  const stored = await readReceipt(key)
  if (!stored || !stored.equals(RECEIPT_PNG)) {
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: RECEIPT_PNG, ContentType: 'image/png' })
    )
    const verified = await readReceipt(key)
    if (!verified || !verified.equals(RECEIPT_PNG)) {
      throw new Error(`Reçu de démonstration non conforme après dépôt : ${key}`)
    }
  }
}

async function findNote(userId, description) {
  const found = await pool.query(
    `SELECT id, status, receipt_key, receipt_seq FROM expense_notes
     WHERE user_id = $1 AND description = $2 ORDER BY created_at, id`,
    [userId, description]
  )
  if (found.rows.length > 1) {
    console.warn(`Attention : ${found.rows.length} notes "${description}" existent ; la plus ancienne est conservée.`)
  }
  return found.rows[0]
}

async function seedExpenseNote(userId, description, amount) {
  let note = await findNote(userId, description)
  if (!note) {
    // Note incomplete avec sa clé de reçu prévue, dans une seule transaction : une
    // interruption laisse une note récupérable, jamais une note sans clé.
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const inserted = await client.query(
        `INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key, status)
         VALUES ($1, $2, CURRENT_DATE, $3, '', 'incomplete')
         RETURNING id, status, receipt_seq`,
        [userId, amount, description]
      )
      note = { ...inserted.rows[0], receipt_key: `receipts/${inserted.rows[0].receipt_seq}.png` }
      await client.query('UPDATE expense_notes SET receipt_key = $1 WHERE id = $2', [note.receipt_key, note.id])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    console.log(`Note de frais "${description}" créée pour ${userId} (${note.id}).`)
  }

  // Reprise sur la même note selon l'état réel : référence absente, objet absent ou différent.
  const key = note.receipt_key || `receipts/${note.receipt_seq}.png`
  await ensureReceipt(key)
  if (note.receipt_key !== key) {
    await pool.query('UPDATE expense_notes SET receipt_key = $1 WHERE id = $2', [key, note.id])
    console.log(`Référence du reçu rétablie pour la note "${description}" (${note.id}).`)
  }
  // Seule une note incomplete devient pending ; approved et rejected sont conservées.
  if (note.status === 'incomplete') {
    await pool.query("UPDATE expense_notes SET status = 'pending' WHERE id = $1 AND status = 'incomplete'", [note.id])
    console.log(`Note de frais "${description}" finalisée (${note.id}).`)
  }
}

// Vérifie les données attendues : un échec ici rend la commande en erreur, jamais un faux succès.
async function verifySeed(expected) {
  const problems = []
  for (const { userId, description } of expected) {
    const note = await findNote(userId, description)
    if (!note) { problems.push(`note absente : "${description}"`); continue }
    if (!['pending', 'approved', 'rejected'].includes(note.status)) problems.push(`note non finalisée (${note.status}) : "${description}"`)
    if (!note.receipt_key) { problems.push(`référence du reçu absente : "${description}"`); continue }
    const stored = await readReceipt(note.receipt_key)
    if (!stored || !stored.equals(RECEIPT_PNG)) problems.push(`reçu absent ou non conforme : "${description}"`)
  }
  if (problems.length) throw new Error(`Données de démonstration incomplètes — ${problems.join(' ; ')}`)
}

try {
  const companyId = await resolveCompany()
  await upsertUser(hrEmail, 'Hr', hrPassword, 'hr_admin', companyId)
  const managerId = await upsertUser(managerEmail, 'Manager', managerPassword, 'manager', companyId)
  const employeeId = await upsertUser(employeeEmail, 'Demo', employeePassword, 'employee', companyId, managerId)

  const notes = [
    { userId: employeeId, description: 'Taxi aéroport (seed)', amount: 42.5 },
    { userId: managerId, description: 'Café client (seed)', amount: 5.9 },
  ]
  for (const { userId, description, amount } of notes) await seedExpenseNote(userId, description, amount)
  await verifySeed(notes)

  console.log('')
  console.log('Comptes de démonstration prêts :')
  console.log(`  RH       ${hrEmail} / ${hrPassword}`)
  console.log(`  Manager  ${managerEmail} / ${managerPassword} (racine, sans manager assigné)`)
  console.log(`  Employé  ${employeeEmail} / ${employeePassword} (rattaché au manager ci-dessus)`)
} catch (error) {
  console.error(`Seed incomplet : ${error.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
