import path from 'node:path'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getPool, withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'
import { receiptKeyFor, uploadReceipt } from '@/lib/storage'
import {
  detectReceiptType,
  parseStrictAmount,
  parseStrictExpenseDate,
  resolveSortOption,
} from '@/utils/validators'

const ALLOWED_RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

function toExpenseNote(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number.parseFloat(row.amount as string),
    expenseDate: row.expense_date,
    description: row.description,
    receiptKey: row.receipt_key,
    status: row.status,
    createdAt: new Date(row.created_at as string).toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    // Le tri est construit depuis une option nommée choisie par le serveur
    // (jamais depuis le texte reçu) : ORDER BY n'accepte pas de paramètre
    // positionnel pour un nom de colonne, et la table d'options fixe évite
    // toute expression SQL arbitraire (AUD-004).
    const sort = resolveSortOption(url.searchParams.get('sort'))
    if (sort === null) {
      return Response.json({ error: 'Option de tri inconnue' }, { status: 400 })
    }

    return withUserScope(session.user.id, async (client) => {
      const result = await client.query(
        `SELECT * FROM expense_notes WHERE user_id = $1 ORDER BY ${sort}`,
        [session.user.id]
      )
      return Response.json(result.rows.map(toExpenseNote))
    })
  } catch (error) {
    return respondError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const amountRaw = formData.get('amount')
    const expenseDateRaw = formData.get('expenseDate')
    const description = formData.get('description')
    const receipt = formData.get('receipt')

    if (
      typeof amountRaw !== 'string' ||
      typeof expenseDateRaw !== 'string' ||
      typeof description !== 'string' ||
      description.trim().length === 0 ||
      !(receipt instanceof File)
    ) {
      return Response.json({ error: 'Champs invalides' }, { status: 400 })
    }

    // Validation syntaxique complète avant toute conversion ou écriture
    // (AUD-014/AUD-015) : la chaîne normalisée, pas un nombre JS arrondi,
    // est transmise à PostgreSQL pour préserver l'arrondi numeric(10,2).
    const amount = parseStrictAmount(amountRaw)
    if (amount === null) {
      return Response.json({ error: 'Montant invalide' }, { status: 400 })
    }
    const expenseDate = parseStrictExpenseDate(expenseDateRaw)
    if (expenseDate === null) {
      return Response.json({ error: 'Date invalide' }, { status: 400 })
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(receipt.type)) {
      return Response.json({ error: 'Type de fichier non autorisé pour le reçu' }, { status: 400 })
    }
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return Response.json({ error: 'Fichier trop volumineux' }, { status: 400 })
    }

    // Détection du format réel par les octets avant toute écriture ou
    // upload (G14) : le type annoncé seul n'est pas une preuve du contenu.
    const buffer = Buffer.from(await receipt.arrayBuffer())
    const detectedType = detectReceiptType(buffer)
    if (detectedType === null || detectedType !== receipt.type) {
      return Response.json(
        { error: 'Format de fichier non reconnu ou incohérent avec le type annoncé' },
        { status: 400 }
      )
    }

    const note = await withUserScope(session.user.id, async (client) => {
      const inserted = await client.query(
        `INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [session.user.id, amount, expenseDate, description, '']
      )
      return inserted.rows[0]
    })

    const extension = EXTENSION_BY_MIME[receipt.type] ?? path.extname(receipt.name) ?? ''
    const receiptKey = receiptKeyFor(note.receipt_seq, extension)
    await uploadReceipt(receiptKey, buffer, receipt.type)

    const updated = await getPool().query(
      `UPDATE expense_notes SET receipt_key = $1 WHERE id = $2 RETURNING *`,
      [receiptKey, note.id]
    )

    return Response.json(toExpenseNote(updated.rows[0]), { status: 201 })
  } catch (error) {
    return respondError(error)
  }
}
