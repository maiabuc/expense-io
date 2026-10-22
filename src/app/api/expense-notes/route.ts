import type { NextRequest } from 'next/server'
import { currentSession } from '@/lib/current-session'
import { withUserScope } from '@/lib/db'
import { respondError, respondRefusal } from '@/lib/errors'
import { dependancesReelles } from '@/modules/soumission/assemblage'
import { ErreurSoumission, type NoteSoumise, type TypeRecu } from '@/modules/soumission/ports'
import { soumettre } from '@/modules/soumission/soumettre'
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    // Clé de reprise, uniquement pour les soumissions inachevées du propriétaire (AUD-003).
    ...(row.status === 'incomplete' ? { requestId: row.request_key, requestAmount: row.request_amount ?? String(row.amount) } : {}),
  }
}

function fromSubmitted(note: NoteSoumise) {
  return {
    id: note.id,
    userId: note.userId,
    amount: Number.parseFloat(note.amount),
    expenseDate: note.expenseDate,
    description: note.description,
    receiptKey: note.receiptKey,
    status: note.status,
    createdAt: note.createdAt,
  }
}

// Refus de la demande : le code technique reste dans les logs, jamais dans la réponse (AUD-005).
function refuser(code: string, message: string, status: number) {
  return respondRefusal(code, message, status, 'expense-notes:POST')
}

export async function GET(request: NextRequest) {
  try {
    const session = await currentSession()
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

    return await withUserScope(session.user.id, async (client) => {
      const result = await client.query(
        `SELECT * FROM expense_notes WHERE user_id = $1 ORDER BY ${sort}`,
        [session.user.id]
      )
      return Response.json(result.rows.map(toExpenseNote))
    })
  } catch (error) {
    return respondError(error, 'expense-notes:GET')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await currentSession()
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clé de demande facultative : un client standard la conserve pour reprendre la même
    // soumission ; sans elle, chaque envoi est une demande distincte (client historique).
    const suppliedKey = request.headers.get('Idempotency-Key')
    if (suppliedKey !== null && !UUID.test(suppliedKey)) {
      return refuser('CLE_DEMANDE_INVALIDE', "L'en-tête Idempotency-Key doit être un UUID.", 400)
    }
    const requestKey = suppliedKey ?? globalThis.crypto.randomUUID()

    const formData = await request.formData()
    const amountRaw = formData.get('amount')
    const expenseDateRaw = formData.get('expenseDate')
    const description = formData.get('description')
    const receipt = formData.get('receipt')

    // Le reçu peut manquer seulement pour reprendre une demande identifiée : le module
    // vérifie alors l'objet déjà stocké et demande le fichier s'il n'est pas exploitable.
    const receiptOptional = suppliedKey !== null && receipt === null
    if (
      typeof amountRaw !== 'string' ||
      typeof expenseDateRaw !== 'string' ||
      typeof description !== 'string' ||
      description.trim().length === 0 ||
      !(receipt instanceof File || receiptOptional)
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

    let submittedReceipt: { octets: Uint8Array; type: TypeRecu; extension: string } | null = null
    if (receipt instanceof File) {
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
      submittedReceipt = { octets: buffer, type: detectedType, extension: EXTENSION_BY_MIME[detectedType] }
    }

    try {
      const result = await soumettre(dependancesReelles(), {
        acteurId: session.user.id,
        cle: requestKey,
        champs: { montant: amount, date: expenseDate, description },
        recu: submittedReceipt,
      })
      // Première finalisation : 201 ; demande déjà finalisée : 200 avec l'état actuel.
      return Response.json(fromSubmitted(result.note), { status: result.type === 'creee' ? 201 : 200 })
    } catch (error) {
      if (!(error instanceof ErreurSoumission)) throw error
      switch (error.code) {
        case 'DEMANDE_CONTENU_DIFFERENT':
          return refuser(error.code, 'Cette demande existe déjà avec un contenu différent.', 409)
        case 'DEMANDE_EN_COURS':
          return refuser(error.code, 'Cette demande est en cours de traitement. Veuillez réessayer.', 409)
        case 'RECU_REQUIS':
          return refuser(error.code, 'Le reçu est requis : fournissez le fichier à nouveau.', 400)
        default:
          // Panne de stockage ou de base : diagnostic interne, message sûr, note conservée en incomplete.
          respondError(error.cause ?? error, 'expense-notes:POST')
          return Response.json(
            { error: "La soumission n'a pas pu être terminée. Veuillez la reprendre." },
            { status: 500 }
          )
      }
    }
  } catch (error) {
    return respondError(error, 'expense-notes:POST')
  }
}
