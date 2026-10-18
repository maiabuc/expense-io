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

// Diagnostic interne structuré : conserve code, opération, statut, message et
// stack pour les logs serveur uniquement. Rien de ceci ne doit atteindre la
// réponse HTTP (AUD-005).
function logInternalError(error: unknown, operation: string, status: number): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      code: errorCode(error),
      operation,
      status,
      message,
      stack,
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
