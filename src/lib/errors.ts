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

// Motifs de données sensibles pouvant apparaître dans le texte d'une
// exception (message pg levé par un trigger, erreur SDK reprenant une URL,
// etc.). Le motif entier est remplacé, nom de clé compris.
const SENSITIVE_PATTERNS: RegExp[] = [
  // En-tête d'autorisation et jeton porteur.
  /authorization["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:bearer|basic)?\s*[^\s"',;]+)/gi,
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

// Budget conservateur de diagnostic (unités UTF-16) vérifié AVANT tout filtre
// (AUD-028) : au-delà, le champ entier est omis par un marqueur constant
// plutôt que filtré, pour borner le coût des expressions sur une entrée très
// longue et ne jamais conserver un préfixe/suffixe brut contenant une valeur
// sensible coupée. Ce n'est pas un seuil normatif.
export const MAX_DIAGNOSTIC_LENGTH = 16384
const OVERSIZED_DIAGNOSTIC = '[diagnostic trop volumineux, omis]'

export function redactDiagnostic(text: string): string {
  if (text.length > MAX_DIAGNOSTIC_LENGTH) return OVERSIZED_DIAGNOSTIC
  let result = text.replace(URL_QUERY_PATTERN, `$1?${REDACTED}`)
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
