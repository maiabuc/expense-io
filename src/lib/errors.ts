// Code technique utile au diagnostic (code pg, nom d'exception AWS, etc.)
// sans jamais exposer de secret (identifiants, URL signée, jeton).
function errorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const withCode = error as { code?: unknown; name?: unknown }
    if (typeof withCode.code === 'string' && withCode.code.length > 0) return withCode.code
    if (typeof withCode.name === 'string' && withCode.name.length > 0) return withCode.name
  }
  return 'UNKNOWN'
}

const REDACTED = '[expurgé]'
export const MAX_DIAGNOSTIC_LENGTH = 16384
const OMITTED_DIAGNOSTIC = '[diagnostic trop volumineux, omis]'

// Chaque caractère du champ borné est parcouru sans réessayer différentes
// répartitions d'espaces. Les valeurs citées incluent leurs échappements.
function redactAuthorization(text: string): string {
  // Conversion ASCII seulement : certaines lettres Unicode changent de longueur
  // en minuscules, ce qui décalerait les indices du texte original.
  const lowercase = text.replace(/[A-Z]/g, (character) => character.toLowerCase())
  const chunks: string[] = []
  let search = 0
  let copied = 0
  while (search < text.length) {
    const start = lowercase.indexOf('authorization', search)
    if (start === -1) break
    let cursor = start + 'authorization'.length
    if (text[cursor] === '"' || text[cursor] === "'") cursor++
    while (cursor < text.length && /\s/.test(text[cursor])) cursor++
    if (text[cursor] !== ':' && text[cursor] !== '=') {
      search = cursor
      continue
    }
    cursor++
    while (cursor < text.length && /\s/.test(text[cursor])) cursor++
    const valueStart = cursor
    const quote = text[cursor]
    if (quote === '"' || quote === "'") {
      cursor++
      while (cursor < text.length) {
        const character = text[cursor++]
        if (character === '\\') {
          if (cursor < text.length) cursor++
        } else if (character === quote) break
      }
      // Une valeur citée non terminée est masquée jusqu'à la fin : ne pas
      // rechercher à nouveau des clés à l'intérieur du secret mal formé.
    } else {
      const scheme = lowercase.startsWith('bearer', cursor) ? 6
        : lowercase.startsWith('basic', cursor) ? 5 : 0
      if (scheme) {
        cursor += scheme
        while (cursor < text.length && /\s/.test(text[cursor])) cursor++
      }
      const tokenStart = cursor
      while (cursor < text.length && !/[\s"',;]/.test(text[cursor])) cursor++
      // Comme le filtre historique, un schéma seul reste une valeur à masquer.
      if (cursor === tokenStart && scheme) cursor = valueStart + scheme
      if (cursor === valueStart) {
        search = cursor < text.length ? cursor + 1 : cursor
        continue
      }
    }
    chunks.push(text.slice(copied, start), REDACTED)
    copied = cursor
    search = cursor
  }
  chunks.push(text.slice(copied))
  return chunks.join('')
}

// Motifs de données sensibles pouvant apparaître dans le texte d'une
// exception (message pg levé par un trigger, erreur SDK reprenant une URL,
// etc.). Le motif entier est remplacé, nom de clé compris.
const SENSITIVE_PATTERNS: RegExp[] = [
  // En-tête d'autorisation et jeton porteur.
  /bearer\s+[^\s"',;]+/gi,
  // Cookies et en-têtes de session.
  /(?:set-)?cookie["']?\s*[:=][^\r\n]*/gi,
  // Identifiants intégrés à une URL de connexion (postgres://user:mdp@hôte).
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/"'@]+@/gi,
  // Clés JSON et paires clé=valeur : les valeurs citées sont consommées
  // en entier, y compris leurs virgules et caractères échappés. Sinon,
  // un guillemet interromprait le filtre avant la valeur secrète.
  /\b(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key(?:[_-]?id)?|secret[_-]?access[_-]?key|session[_-]?token|credential)s?["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s"',;&]+)/gi,
  // Paramètres de signature AWS isolés (hors URL complète).
  /X-Amz-[A-Za-z-]+["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s&"']+)/gi,
]

// Chaîne de requête d'URL : peut porter une signature temporaire ou un jeton.
// L'hôte et le chemin restent visibles pour le diagnostic.
const URL_QUERY_PATTERN = /(\bhttps?:\/\/[^\s?#"']+)\?[^\s"'#]*/gi

export function redactDiagnostic(text: string): string {
  // Omettre le champ entier avant tout filtre : une troncature brute pourrait
  // couper un secret et rendre son contexte méconnaissable aux filtres.
  if (text.length > MAX_DIAGNOSTIC_LENGTH) return OMITTED_DIAGNOSTIC
  let result = redactAuthorization(text.replace(URL_QUERY_PATTERN, `$1?${REDACTED}`))
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, REDACTED)
  }
  return result
}

// Diagnostic interne structuré : conserve code, opération, statut, message et
// stack pour les logs serveur uniquement, après expurgation des secrets
// (jetons, cookies, identifiants, URL signées). Rien de ceci n'atteint la
// réponse HTTP (AUD-005).
function logInternalError(error: unknown, operation: string, status: number): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      code: redactDiagnostic(errorCode(error)),
      operation,
      status,
      message: redactDiagnostic(message),
      stack: stack === undefined ? undefined : redactDiagnostic(stack),
    })
  )
}

// `operation` identifie la route/action en cours (ex. "expense-notes:POST")
// pour retrouver le contexte dans les logs sans dépendre du message brut.
export function respondError(error: unknown, operation: string): Response {
  const status = 500
  logInternalError(error, operation, status)
  return Response.json(
    { error: 'Une erreur inattendue est survenue. Réessaie plus tard.' },
    { status }
  )
}

// Refus métier attendu (400, 409…) : la réponse ne porte que le message public du
// contrat ; le code technique reste dans le journal interne, après expurgation,
// avec la même forme que le diagnostic des pannes (AUD-005, AUD-020).
export function respondRefusal(code: string, message: string, status: number, operation: string): Response {
  console.warn(
    JSON.stringify({ timestamp: new Date().toISOString(), code: redactDiagnostic(code), operation, status })
  )
  return Response.json({ error: message }, { status })
}
