# AUD-016 — Libérer les actions UI après erreur réseau

Statut : solution retenue le 14 octobre 2026, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuves

Les handlers attendent fetch puis libèrent leur état actif, sans catch/finally couvrant un rejet réseau. Une panne peut laisser bouton désactivé ou écran en chargement, sans message. Un HTTP d'erreur reçu n'est pas la même chose qu'un rejet réseau de la promesse.

Sources : `src/app/expenses/page.tsx:57–71,74–100,103–141`, `src/components/PendingApprovalsPanel.tsx:27–40,53–71`, `src/components/AdminConsole.tsx:43–67,71–89,102–120`. [Mesures](../comment-review.md#aud-016--états-ui-conservés-après-erreur-réseau) : 9 chemins exécutés chacun avec succès simulé et rejet fetch simulé ; les 9 pannes conservent l'indicateur actif. Setters/fetch simulés, React et navigateur non montés.

## Solution retenue

- Intercepter les erreurs réseau et les erreurs de lecture de réponse pertinentes ; afficher un message sûr et compréhensible dans l'UI standard.
- Libérer loading/submitting/extracting/decidingId/savingId via finally après succès comme après échec, sur les neuf chemins examinés.
- Conserver les champs saisis en cas d'échec ; maintenir la remise à zéro habituelle après succès confirmé.
- Ne pas réessayer automatiquement une écriture dont le résultat est incertain. Pour une soumission, appliquer la récupération avec identifiant stable retenue dans AUD-003.
- Préserver les traitements d'erreurs HTTP existants, contrats, polices, couleurs, positions et commandes. Aucun nouveau mécanisme d'attente ni écran sélectionné.

Pourquoi : rendre les actions utilisables après une panne sans transformer une absence de réponse en certitude d'échec serveur. Alternative : recharger la page manuellement masque le défaut et peut perdre la saisie ; retry automatique peut dupliquer ou répéter une écriture.

## Validation prévue

Sur les neuf chemins : succès, réponse HTTP d'erreur, rejet réseau et réponse illisible ; état final libéré et message attendu. Vérifier conservation de saisie après échec, comportement de succès et absence de nouvel envoi automatique. Compléter les preuves par tests navigateur isolés ; l'exécution extraite initiale ne prouve pas encore l'effet React. Aucune implémentation, aucun test de correction exécuté. Inventaire des autres appels fetch à compléter séparément, sans annoncer que tous sont couverts.

## Complément de revue API

La [revue API](../api-standardisation-review.md) identifie aussi trois lectures de reçu sans catch transport : expenses/page.tsx:145–152, PendingApprovalsPanel.tsx:43–50, AdminConsole.tsx:91–98. Elles ne portent pas l’indicateur bloqué des neuf chemins mesurés ; leur panne nécessite également un message. Complément de périmètre proposé pour la correction réseau, sans nouveau helper obligatoire et sans preuve navigateur.
