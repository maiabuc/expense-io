# AUD-005 — Erreurs publiques et diagnostics internes

Décision acceptée, contrat précis à préparer ; non implémenté. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuves

OBSERVATION : [errors.ts:2–5](../../../src/lib/errors.ts#L2) journalise déjà l'exception, puis transmet son message brut et sa stack au client avec HTTP 500. Une stack décrit les appels et emplacements internes ; le message DB peut exposer des détails inutiles au public. Aucun exemple de fuite HTTP ni exploit démontré.

Le [consommateur UI:93–99](../../../src/app/expenses/page.tsx#L93) attend une chaîne `error`, sinon affiche un message de secours.

## Solution retenue

- Afficher uniquement un message compréhensible en français dans l'UI standard.
- Conserver code technique, description et diagnostics utiles dans des logs internes structurés, sans secrets ; ne pas envoyer stack ou message DB brut au client.
- Utiliser des codes HTTP adaptés et préserver le format compatible avec les appels API et le champ `error` existant.
- Les erreurs API standard déjà en anglais peuvent rester ; pas de traduction globale ni renommage des identifiants.
- Conserver polices, couleurs et positions. La présence d'un code technique dans la réponse n'est pas requise et ne doit pas être ajoutée par défaut.

Pourquoi : séparer feedback utilisateur et diagnostic tout en limitant les changements de consommateurs. Le logging existe déjà ; il doit rester utile et sûr. Pour les erreurs d'infrastructure inattendues, HTTP 500 avec message contrôlé est proposé, pas un traitement universel de toutes les erreurs. Catalogue, mapping HTTP, format de logs et éventuelle corrélation à définir ; aucun standard nommé ni refonte API sélectionné.

## Alternatives et validation

Retirer seulement la stack reste insuffisant si le message brut révèle des détails. Une convention publique plus large exige inventaire et adaptation des consommateurs ; elle n'est pas retenue pour son seul nom. Un identifiant de corrélation reste une option distincte du code technique, pas une décision acquise.

Provoquer une exception contrôlée via HTTP sur données isolées ; vérifier réponse publique sans détails internes, statut adapté, diagnostic utile et gestion UI inchangée. Vérifier séparément les entrées invalides et erreurs attendues. Tests exécutés : 0 ; application inchangée. [Journal](../DECISION_LOG.md).

## Actualisation des preuves — campagne du 14–15 octobre

Stack publique observée sur date impossible et panne de stockage. Aucun secret réel sauvegardé ; code corrigé et format futur non testés. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-18 — SPEC-01, personne A

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-01](../../specs/SPEC-01-erreurs-api.md). Révision de départ : `7377486`. Réalisation : `a8411b9`.

#### Ce qui a été implémenté

`respondError` ne transmet plus le message brut ni la stack au client : la réponse publique contient uniquement `{ error: "Une erreur inattendue est survenue. Réessaie plus tard." }` avec HTTP 500. En interne, une ligne JSON structurée (`timestamp`, `code`, `operation`, `status`, `message`, `stack`) est journalisée via `console.error`. Les 13 routes qui appelaient `respondError(error)` passent désormais un libellé d'opération (`"<route>:<méthode>"`) pour retrouver le contexte sans dépendre du message brut. Les refus métier existants (400/401/403/404/409) ne passent pas par cette fonction et gardent leurs statuts inchangés — aucune transformation universelle en 500.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/lib/errors.ts:1–37 | `errorCode`, `logInternalError`, `respondError` réécrits | Point commun de réponse/journalisation pour toutes les routes API |
| src/app/api/expense-notes/route.ts (GET/POST), src/app/api/expense-notes/[id]/receipt-url/route.ts, src/app/api/expense-notes/receipt-suggestion/route.ts | Appel `respondError(error, operation)` avec libellé dédié | Fournit le contexte d'opération au diagnostic interne |
| src/app/api/manager/expense-notes/route.ts, .../[id]/approve, .../[id]/reject, .../[id]/receipt-url | idem | idem |
| src/app/api/hr/expense-notes/route.ts, .../[id]/approve, .../[id]/reject, .../[id]/receipt-url, src/app/api/hr/users/route.ts, src/app/api/hr/users/[id]/manager/route.ts | idem | idem |

#### Nouveau fonctionnement

Action utilisateur → route API → bloc `try/catch` existant inchangé pour les refus attendus (401/400/404/409 renvoyés directement) → toute exception non prévue (panne DB/S3, etc.) atteint le `catch` → `respondError(error, operation)` journalise `{timestamp, code, operation, status:500, message, stack}` en interne (`console.error`, jamais envoyé au client) → la réponse HTTP renvoyée au client est `{ error: "Une erreur inattendue est survenue. Réessaie plus tard." }` avec statut 500 → le consommateur UI (`expenses/page.tsx` et autres) affiche déjà `body.error` tel quel, donc aucun changement UI nécessaire. `code` vient de `error.code` (ex. code pg) puis `error.name` (ex. exception AWS) sinon `"UNKNOWN"`.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run lint` | exit 0 | exit 0 (1 avertissement préexistant hors périmètre) | Sortie locale 2026-10-18 |
| `npm run typecheck` | exit 0 | exit 0 | Sortie locale 2026-10-18 |
| `npm run build` | exit 0 | exit 0 | Sortie locale 2026-10-18 |
| `npm run test:unit` | 6/6 réussis | 6/6 réussis | `reports/unit.json` |
| `npm run test:issue -- AUD-005` | PANNE-002, PANNE-003, NOTE-022 réussis | 3/3 réussis | Sortie locale, `reports/issues.json` |
| `npm run test:api` (suite complète) | Aucune régression AUD-005 ; rouge historique des autres lots inchangé | 64/112 réussis ; 0 échec sur AUD-005 ; 48 échecs restants tous sur AUD-003/004/006/007/008/009/014/015/018/020/021/G10/G14 (autres specs, non implémentées) | `reports/issues.json` (`byIssue`) |
| `npm run test:e2e` (suite complète) | Aucune régression AUD-005 | 38/60 réussis ; 0 échec sur AUD-005 ; 22 échecs restants sur AUD-013/016/017 (SPEC-02/04/05, non implémentées) | `reports/issues.json` (`byIssue`) |
| Garde append-only | Préfixes strictement conservés | Vérifié : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-01-gf.json` | Sortie locale 2026-10-18 |

Comptes réels : exécution locale macOS (Docker Desktop, Postgres 16 + LocalStack isolés sur ports dédiés CI, aucun service utilisateur arrêté ni modifié). CI GitHub non déclenchée pour cette préparation locale ; à confirmer à l'ouverture de la PR.

#### Écarts et limites

Catalogue d'erreurs, mapping HTTP par type et corrélation (identifiant de requête) restent non définis, conformément à AUD-005 ("aucun standard nommé ni refonte API sélectionné") : seul le traitement générique des pannes inattendues (HTTP 500 + message contrôlé) est couvert par ce lot. Playwright e2e non réexécuté avec navigateurs additionnels (seul chromium installé). SPEC-02/03/04/06/07/09 adapteront leurs propres routes à ce mécanisme commun, hors périmètre de cette entrée.
