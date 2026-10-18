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

## IMPLEMENTATION

### 2026-10-18 — SPEC-02, personne A

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-02](../../specs/SPEC-02-recuperation-ui.md). Révision de départ : `7377486`. Réalisation : `16cb7ad`.

#### Ce qui a été implémenté

Les 12 appels fetch des trois écrans (quatre dans `expenses/page.tsx`, trois dans `PendingApprovalsPanel.tsx`, cinq dans `AdminConsole.tsx`) sont enveloppés dans `try/catch/finally`. Le `catch` couvre à la fois un rejet réseau (`fetch` qui rejette) et une réponse JSON illisible (`response.json()` qui lève une `SyntaxError` après un `response.ok`) ; il affiche un message français sûr via l'état `error`/`usersError`/`notesError` existant. Le `finally` libère systématiquement l'indicateur actif (`loading`, `submitting`, `extracting`, `decidingId`, `savingId`, `usersLoading`, `notesLoading`) qu'il y ait eu succès ou échec. Les trois lectures de reçu du complément de revue API (sans indicateur bloqué) reçoivent le même traitement catch pour afficher un message, sans état à libérer. La saisie du formulaire de soumission n'est remise à zéro (`form.reset()`) que dans la branche de succès confirmé ; aucun nouvel appel n'est déclenché automatiquement après un échec (pas de retry).

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/app/expenses/page.tsx : `loadNotes`, `handleSubmit`, `handleSuggestFields`, `handleViewReceipt` | try/catch/finally ajouté autour des 4 appels | Libère loading/submitting/extracting, conserve la saisie, affiche un message sûr |
| src/components/PendingApprovalsPanel.tsx : `loadPending`, `handleViewReceipt`, `handleDecide` | idem pour les 3 appels manager | Libère loading/decidingId, affiche un message sûr |
| src/components/AdminConsole.tsx : `loadUsers`, `loadNotes`, `handleManagerChange`, `handleViewReceipt`, `handleDecide` | idem pour les 5 appels RH | Libère usersLoading/notesLoading/savingId/decidingId, affiche un message sûr |

#### Nouveau fonctionnement

Action utilisateur (chargement de page, soumission, pré-remplissage OCR, affichage de reçu, décision manager/RH, changement de manager) → appel `fetch` dans un bloc `try` → en cas de succès HTTP, traitement inchangé (mise à jour d'état, fermeture du formulaire le cas échéant) → en cas de réponse HTTP d'erreur, message tiré du corps `error` si présent sinon message de repli (comportement déjà existant, inchangé) → en cas de rejet réseau ou de `response.json()` illisible, le `catch` affiche un message français de repli invitant à vérifier la connexion → dans tous les cas, le `finally` remet l'indicateur actif à son état inactif, rendant le bouton/sélecteur de nouveau utilisable sans rechargement de page. Aucun second appel n'est émis automatiquement : l'utilisateur relance l'action lui-même.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run lint` ; `npm run typecheck` ; `npm run build` | exit 0 chacun | exit 0 chacun (1 avertissement lint préexistant hors périmètre) | Sortie locale 2026-10-18 |
| `npm run test:unit` | 6/6 | 6/6 | `reports/unit.json` |
| `npm run test:issue -- AUD-016` | NET-001…032 réussis | 32/32 réussis | Sortie locale, `reports/issues.json` |
| `npm run test:api` (suite complète) | Aucune régression AUD-016 | 61/112 ; AUD-005 à 0/3 car SPEC-01 n'est pas encore mergée dans `main` (dépendance hors branche, voir Écarts) ; toutes les autres catégories de rouge historique inchangées par rapport à la mesure SPEC-01 | `reports/issues.json` (`byIssue`) |
| `npm run test:e2e` (suite complète) | Aucune régression ; AUD-016 entièrement vert | 58/60 ; AUD-016 0 échec (32/32) ; 2 échecs restants hors périmètre (AUD-013, AUD-017 — SPEC-05/04) | `reports/issues.json` (`byIssue`) |
| Garde append-only | Préfixes strictement conservés | Vérifié : `check-append-only.mjs check --snapshot /tmp/arla-spec-02-gf.json` | Sortie locale 2026-10-18 |

Comptes réels : exécution locale macOS, Postgres 16 + LocalStack isolés sur ports CI dédiés, aucun service utilisateur arrêté. CI GitHub non déclenchée pour cette réalisation locale.

#### Écarts et limites

Branche créée depuis `main` actualisé (sans la branche `feat/spec-01`, pas encore mergée) : les 3 tests AUD-005 échouent sur cette branche uniquement parce que le mécanisme commun de SPEC-01 n'y est pas présent, pas à cause d'une régression introduite ici — ils redeviennent verts à l'intégration des deux branches. Aucun nouveau helper de fetch ni mécanisme d'attente global ajouté, conformément à la solution retenue. Tests navigateur limités à Chromium (seul navigateur installé) ; comportement Firefox/Safari non vérifié.
