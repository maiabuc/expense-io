'use server'

import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import { getPool } from '@/lib/db'
import { signIn, signOut } from '@/lib/auth'
import { isValidEmail } from '@/utils/validators'

export interface AuthFormState {
  error?: string
}

const MIN_PASSWORD_LENGTH = 8
const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: unknown }).code === UNIQUE_VIOLATION
  )
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = formData.get('name')
  const email = formData.get('email')
  const password = formData.get('password')

  // isValidEmail (validateur partagé, corrigé et borné) est la seule source de
  // format/longueur : plus d'expression indépendante dans l'action (AUD-030).
  // Le contrôle de type précède l'appel pour ne jamais valider un non-string.
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    typeof email !== 'string' ||
    !isValidEmail(email) ||
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    return {
      error: `Nom requis, email invalide, ou mot de passe trop court (${MIN_PASSWORD_LENGTH} caractères minimum).`,
    }
  }

  // Domaine extrait depuis l'unique @ déjà validé, sans réexécuter l'analyse ;
  // l'adresse originale reste stockée inchangée (AUD-030, convention AUD-019).
  const domain = email.slice(email.indexOf('@') + 1).toLowerCase()
  const companyName = domain.split('.')[0]
  const passwordHash = await bcrypt.hash(password, 12)

  // Entreprise (nouvelle ou existante) et premier compte utilisateur validés
  // ensemble sur une transaction commune : un échec de la création du compte
  // annule aussi la création de l'entreprise de cette tentative, qui ne
  // reste jamais sans son premier RH (AUD-013). Une entreprise déjà
  // existante avant cette tentative n'est jamais annulée : la branche
  // ci-dessous ne la réécrit pas, un rollback n'y change donc rien.
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email])
    if ((existing.rowCount ?? 0) > 0) {
      await client.query('ROLLBACK')
      return { error: 'Un compte existe déjà avec cet email.' }
    }

    const insertedCompany = await client.query<{ id: string }>(
      `INSERT INTO companies (name, email_domain) VALUES ($1, $2)
       ON CONFLICT (email_domain) DO NOTHING
       RETURNING id`,
      [companyName, domain]
    )

    let companyId: string
    let role: 'employee' | 'hr_admin'
    if (insertedCompany.rows[0]) {
      companyId = insertedCompany.rows[0].id
      role = 'hr_admin'
    } else {
      const existingCompany = await client.query<{ id: string }>(
        'SELECT id FROM companies WHERE email_domain = $1',
        [domain]
      )
      companyId = existingCompany.rows[0].id
      role = 'employee'
    }

    await client.query(
      'INSERT INTO users (name, email, password_hash, company_id, role) VALUES ($1, $2, $3, $4, $5)',
      [name.trim(), email, passwordHash, companyId, role]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    if (isUniqueViolation(error)) {
      return { error: 'Un compte existe déjà avec cet email.' }
    }
    throw error
  } finally {
    client.release()
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/expenses' })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Le compte a été créé mais la connexion automatique a échoué.' }
    }
    throw error
  }
  return {}
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Champs invalides.' }
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/expenses' })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email ou mot de passe incorrect.' }
    }
    throw error
  }
  return {}
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}
