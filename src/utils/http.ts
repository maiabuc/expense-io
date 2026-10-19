/**
 * Message d'erreur à afficher pour une réponse HTTP non réussie : le champ
 * `error` du contrat API s'il est une chaîne non vide, sinon le repli fourni
 * (corps illisible, absent ou sans message). La sûreté du texte repose sur
 * le contrat serveur (AUD-005 : aucun détail technique dans `error`).
 */
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  const error = body !== null && typeof body === 'object' ? (body as { error?: unknown }).error : undefined
  return typeof error === 'string' && error.trim().length > 0 ? error : fallback
}
