const EMAIL_PATTERN = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/

// Plafond généreux (unités UTF-16, comme String.length) appliqué AVANT
// l'analyse (AUD-027/AUD-030) : il borne le coût du parcours de l'expression
// sur une entrée adverse très longue, sans imposer de politique RFC ni de
// seuil de performance mesuré. Une valeur plus longue est refusée telle quelle.
export const MAX_EMAIL_LENGTH = 4096

export function isValidEmail(value: string): boolean {
  if (value.length > MAX_EMAIL_LENGTH) return false
  return EMAIL_PATTERN.test(value)
}

export function isPositiveAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

// --- AUD-014 : montant décimal strict ---------------------------------

// Un seul séparateur décimal (point ou virgule), jamais les deux à la
// fois ; signe + facultatif ; ".5" et "1." admis. Les formats comme
// "12abc", "1.2.3", "1,2,3", "NaN" ou "Infinity" ne correspondent pas.
const AMOUNT_PATTERN = /^\+?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/

// numeric(10,2) : 8 chiffres entiers + 2 décimales, soit au plus
// 9999999999 centimes (99999999,99). `BigInt(...)` plutôt qu'un littéral
// `n` : la cible de compilation (ES2017) n'autorise pas la syntaxe `100n`.
const AMOUNT_MAX_CENTS = BigInt('9999999999')
const CENTS_PER_UNIT = BigInt(100)
const ONE_CENT = BigInt(1)

/**
 * Valide la syntaxe complète d'un montant, sa positivité *avant* arrondi
 * (0.001 est une valeur positive admise, même si PostgreSQL la stocke
 * 0.00) et son dépassement de borne *après* arrondi au centime, sans
 * jamais passer par un `parseFloat`/arrondi JS. Rend la chaîne décimale
 * normalisée (virgule convertie en point, signe + retiré) à transmettre
 * telle quelle à PostgreSQL, qui applique son propre arrondi
 * numeric(10,2) au stockage ; ou `null` si invalide.
 */
export function parseStrictAmount(raw: string): string | null {
  const trimmed = raw.trim()
  if (!AMOUNT_PATTERN.test(trimmed)) return null

  const normalized = trimmed.replace(/^\+/, '').replace(',', '.')
  const [wholeRaw, fractionRaw = ''] = normalized.split('.')
  const whole = wholeRaw || '0'
  if (!/[1-9]/.test(whole + fractionRaw)) return null
  // Trois chiffres après la virgule suffisent pour reproduire l'arrondi
  // au centime le plus proche (chiffre immédiatement après le centime).
  const fraction = (fractionRaw + '000').slice(0, 3)

  let cents = BigInt(whole) * CENTS_PER_UNIT + BigInt(fraction.slice(0, 2))
  if (fraction[2] >= '5') cents += ONE_CENT

  if (cents > AMOUNT_MAX_CENTS) return null
  return normalized
}

// --- AUD-015 : date calendaire stricte ---------------------------------

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Date du jour à Paris (yyyy-mm-dd), indépendamment du fuseau du serveur. */
export function todayInParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

/**
 * Valide le format yyyy-mm-dd, l'existence réelle du jour (mois/bissextile
 * inclus) et le refus d'une date future selon l'horloge serveur en
 * Europe/Paris. Rend la chaîne inchangée si valide, sinon `null`.
 */
export function parseStrictExpenseDate(raw: string, today = todayInParis()): string | null {
  const match = DATE_PATTERN.exec(raw)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null

  // Comparaison lexicographique valide sur un format yyyy-mm-dd.
  if (raw > today) return null
  return raw
}

// --- AUD-004 : tri nommé -------------------------------------------------

// Map plutôt qu'objet littéral : une recherche dans un objet atteint aussi
// les propriétés héritées (`constructor`, `__proto__`…), qui renverraient
// une fonction ou un objet au lieu d'un refus.
const SORT_OPTIONS = new Map<string, string>([
  ['newest', 'created_at DESC'],
  ['amount_asc', 'amount ASC'],
  ['amount_desc', 'amount DESC'],
])
export const DEFAULT_SORT_OPTION = 'created_at DESC'

/**
 * Traduit une option de tri nommée (insensible à la casse) vers son
 * fragment SQL fixe, choisi par le serveur et jamais construit depuis
 * l'entrée du client. Rend le défaut si `raw` est vide/absent, ou `null`
 * si l'option est inconnue — à rejeter en HTTP 400 avant toute requête.
 */
export function resolveSortOption(raw: string | null): string | null {
  if (!raw) return DEFAULT_SORT_OPTION
  return SORT_OPTIONS.get(raw.toLowerCase()) ?? null
}

// --- G14 : détection du format de reçu par les octets -------------------

export type ReceiptMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf'

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

const RECEIPT_SIGNATURES: Array<{ mime: ReceiptMime; matches: (bytes: Uint8Array) => boolean }> = [
  { mime: 'image/png', matches: (b) => bytesStartWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mime: 'image/jpeg', matches: (b) => bytesStartWith(b, [0xff, 0xd8, 0xff]) },
  {
    mime: 'image/webp',
    matches: (b) => bytesStartWith(b, [0x52, 0x49, 0x46, 0x46]) && bytesStartWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  },
  { mime: 'application/pdf', matches: (b) => bytesStartWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
]

/**
 * Détecte le format réel d'un fichier à partir de ses octets (signature de
 * fichier), indépendamment de l'extension ou du type annoncé par
 * l'appelant. Rend `null` si aucun des quatre formats de reçu acceptés
 * (PNG/JPEG/WebP/PDF) n'est reconnu.
 */
export function detectReceiptType(bytes: Uint8Array): ReceiptMime | null {
  return RECEIPT_SIGNATURES.find((signature) => signature.matches(bytes))?.mime ?? null
}
