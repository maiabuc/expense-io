'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { readErrorMessage } from '@/utils/http'

interface ExpenseNote {
  id: string
  amount: number
  expenseDate: string
  description: string
  status: string
  createdAt: string
  // Clé de reprise, présente seulement pour une soumission incomplète (AUD-003).
  requestId?: string
  requestAmount?: string
}

// Tentative d'envoi en cours : la même clé est réutilisée tant que la soumission n'a pas abouti,
// pour reprendre la même note plutôt que d'en créer une seconde (AUD-003).
interface Attempt {
  key: string
  signature: string
  fields?: { amount: string; expenseDate: string; description: string }
}

const ATTEMPT_PREFIX = 'expense-request:'

function readAttempt(userId: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_PREFIX + userId)
    return raw ? (JSON.parse(raw) as Attempt) : null
  } catch {
    return null
  }
}

function writeAttempt(userId: string, attempt: Attempt | null) {
  try {
    if (attempt) sessionStorage.setItem(ATTEMPT_PREFIX + userId, JSON.stringify(attempt))
    else sessionStorage.removeItem(ATTEMPT_PREFIX + userId)
  } catch {
    // Stockage indisponible : la reprise passera alors par le requestId renvoyé par le serveur.
  }
}

function newRequestKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:focus:ring-brand-900'

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

// timeZone: 'UTC' évite un glissement de jour calendaire selon le fuseau
// du lecteur : expenseDate est une date seule (yyyy-mm-dd), sans heure ni
// fuseau propre (AUD-017).
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' })

const STATUS_STYLES: Record<string, string> = {
  incomplete: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_LABELS: Record<string, string> = {
  incomplete: 'incomplète',
  pending: 'en attente',
  approved: 'approuvée',
  rejected: 'rejetée',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default function ExpensesPage() {
  const [notes, setNotes] = useState<ExpenseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [suggestionNotice, setSuggestionNotice] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [description, setDescription] = useState('')
  const [resuming, setResuming] = useState<ExpenseNote | null>(null)
  const userIdRef = useRef<string | null>(null)
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch('/api/expense-notes')
      if (response.ok) {
        setNotes(await response.json())
      } else {
        setError(await readErrorMessage(response, 'Impossible de charger les notes de frais.'))
      }
    } catch {
      setError('Impossible de charger les notes de frais. Vérifie ta connexion et réessaie.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Le setState effectif n'intervient qu'après l'await dans loadNotes,
    // la règle react-hooks est ici trop conservatrice.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotes()
  }, [loadNotes])

  // La clé de tentative est rangée par compte : l'identité vient de la session Auth.js.
  async function getUserId(): Promise<string> {
    if (!userIdRef.current) {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()
        userIdRef.current = session?.user?.id ?? 'inconnu'
      } catch {
        userIdRef.current = 'inconnu'
      }
    }
    return userIdRef.current as string
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const form = event.currentTarget
    const formData = new FormData(form)
    // Sans fichier choisi, le navigateur envoie un fichier vide : on l'omet (reprise d'un reçu déjà stocké).
    const receipt = formData.get('receipt')
    if (receipt instanceof File && receipt.size === 0) formData.delete('receipt')

    try {
      const userId = await getUserId()
      const signature = [
        formData.get('amount'),
        formData.get('expenseDate'),
        formData.get('description'),
        receipt instanceof File ? `${receipt.name}:${receipt.size}:${receipt.lastModified}` : '',
      ].join('|')
      // Même contenu : même clé (réessai d'une écriture incertaine) ; contenu modifié : nouvelle demande.
      let attempt = readAttempt(userId)
      if (resuming?.requestId) {
        attempt = { key: resuming.requestId, signature, fields: attempt?.fields }
      } else if (!attempt || attempt.signature !== signature) {
        attempt = { key: newRequestKey(), signature }
      }
      attempt.fields = {
        amount: String(formData.get('amount')),
        expenseDate: String(formData.get('expenseDate')),
        description: String(formData.get('description')),
      }
      writeAttempt(userId, attempt)

      const response = await fetch('/api/expense-notes', {
        method: 'POST',
        headers: { 'Idempotency-Key': attempt.key },
        body: formData,
      })

      if (response.ok) {
        writeAttempt(userId, null)
        form.reset()
        setAmount('')
        setExpenseDate('')
        setDescription('')
        setResuming(null)
        setSuggestionNotice(null)
        await loadNotes()
      } else {
        const body = await response.json().catch(() => null)
        setError(
          typeof body?.error === 'string'
            ? body.error
            : 'Échec de la soumission de la note de frais.'
        )
      }
    } catch {
      setError('Échec de la soumission de la note de frais. Vérifie ta connexion et réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSuggestFields() {
    const receipt = receiptInputRef.current?.files?.[0]
    if (!receipt) {
      setError('Sélectionne d’abord un reçu.')
      return
    }
    setExtracting(true)
    setError(null)
    setSuggestionNotice(null)

    try {
      const formData = new FormData()
      formData.set('receipt', receipt)
      const response = await fetch('/api/expense-notes/receipt-suggestion', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        setError(await readErrorMessage(response, 'Impossible d’analyser ce reçu.'))
        return
      }
      // Une réponse vide est valide (rien à suggérer) : sans ce message, ça
      // ne se distinguerait pas visuellement d'un bouton qui n'a rien fait.
      const suggestion = (await response.json()) as { amount?: number; expenseDate?: string }
      const foundAmount = typeof suggestion.amount === 'number'
      const foundDate = typeof suggestion.expenseDate === 'string'
      if (foundAmount) {
        setAmount(String(suggestion.amount))
      }
      if (foundDate) {
        setExpenseDate(suggestion.expenseDate as string)
      }
      if (!foundAmount && !foundDate) {
        setSuggestionNotice('Aucune information reconnue sur ce reçu — saisis les champs manuellement.')
      } else if (!foundAmount || !foundDate) {
        setSuggestionNotice(
          `${foundAmount ? 'Date' : 'Montant'} non reconnu(e) sur ce reçu — vérifie ce champ.`
        )
      }
    } catch {
      setError('Impossible d’analyser ce reçu. Vérifie ta connexion et réessaie.')
    } finally {
      setExtracting(false)
    }
  }

  async function handleViewReceipt(id: string) {
    setError(null)
    try {
      const response = await fetch(`/api/expense-notes/${id}/receipt-url`)
      if (!response.ok) {
        setError(await readErrorMessage(response, 'Impossible de récupérer le reçu.'))
        return
      }
      const { url } = await response.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Impossible de récupérer le reçu. Vérifie ta connexion et réessaie.')
    }
  }

  // Reprise : recharge le formulaire existant avec la soumission inachevée.
  async function handleResume(note: ExpenseNote) {
    const userId = await getUserId()
    const stored = readAttempt(userId)
    const fields = stored && stored.key === note.requestId ? stored.fields : undefined
    setResuming(note)
    setError(null)
    setAmount(fields?.amount ?? note.requestAmount ?? String(note.amount))
    setExpenseDate(fields?.expenseDate ?? note.expenseDate)
    setDescription(fields?.description ?? note.description)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Les soumissions incomplètes ne comptent ni dans le total ni dans le nombre de notes.
  const submittedNotes = notes.filter((note) => note.status !== 'incomplete')
  const total = submittedNotes.reduce((sum, note) => sum + note.amount, 0)

  return (
    <main className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mes notes de frais</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {submittedNotes.length > 0
            ? `${submittedNotes.length} note${submittedNotes.length > 1 ? 's' : ''} · ${currencyFormatter.format(total)} au total`
            : notes.length > 0
              ? 'Aucune note soumise : reprends ta soumission incomplète dans l’historique.'
              : 'Soumets ta première note de frais ci-dessous.'}
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-semibold">Nouvelle note de frais</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="amount" className="text-sm font-medium">
                Montant (€)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step={resuming ? "any" : "0.01"}
                min={resuming ? "0" : "0.01"}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expenseDate" className="text-sm font-medium">
                Date
              </label>
              <input
                id="expenseDate"
                name="expenseDate"
                type="date"
                required
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              placeholder="Ex. Taxi aéroport, repas client…"
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="receipt" className="text-sm font-medium">
              Reçu (image ou PDF)
            </label>
            <input
              ref={receiptInputRef}
              id="receipt"
              name="receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              required={!resuming}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-gray-800 dark:file:text-brand-300"
            />
            <button
              type="button"
              onClick={handleSuggestFields}
              disabled={extracting}
              className="self-start text-sm font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {extracting ? 'Analyse du reçu…' : 'Pré-remplir depuis le reçu'}
            </button>
            {resuming && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reprise d’une soumission incomplète : le reçu déjà envoyé est réutilisé s’il est conforme,
                sinon sélectionne-le à nouveau.
              </p>
            )}
            {suggestionNotice && (
              <p className="text-sm text-amber-700 dark:text-amber-400">{suggestionNotice}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Envoi…' : 'Soumettre'}
          </button>
        </form>
      </section>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="border-b border-gray-200 px-6 py-4 text-base font-semibold dark:border-gray-800">
          Historique
        </h2>
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Chargement…
          </p>
        ) : notes.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Aucune note de frais pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 text-right font-medium">Montant</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {notes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {dateFormatter.format(new Date(note.expenseDate))}
                    </td>
                    <td className="px-6 py-3">{note.description}</td>
                    <td className="px-6 py-3 text-right font-medium whitespace-nowrap">
                      {currencyFormatter.format(note.amount)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={note.status} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      {note.status === 'incomplete' ? (
                        <button
                          type="button"
                          onClick={() => handleResume(note)}
                          className="text-sm font-medium text-brand-600 hover:underline"
                        >
                          Reprendre
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(note.id)}
                          className="text-sm font-medium text-brand-600 hover:underline"
                        >
                          Voir le reçu
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
