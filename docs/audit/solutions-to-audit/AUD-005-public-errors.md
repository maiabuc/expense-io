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

### 2026-10-19 — SPEC-01, correction après revue (personne A)

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-01](../../specs/SPEC-01-erreurs-api.md). Révision de départ : `ef32e97` (`feat/spec-01` actualisée avec `main` `651b067`). Réalisation : commit de cette entrée sur `feat/spec-01`.

#### Ce qui a été implémenté

La [revue du 19 octobre](../revue-pr-g4bi2004-20261019.md) relève à juste titre (P1, critère C2) que l'entrée du 18 octobre protégeait la réponse publique mais journalisait encore le message et la stack bruts : une exception contenant un jeton ou une URL signée les recopiait dans le journal interne. Cette affirmation antérieure (« sans secrets ») était donc inexacte pour ce cas ; elle est conservée telle quelle ci-dessus et corrigée ici. `redactDiagnostic` expurge désormais le message, la stack et le code avant émission du diagnostic : en-têtes `authorization` et jetons `bearer`, cookies, identifiants intégrés à une URL de connexion (`postgres://utilisateur:motdepasse@`), paires clé=valeur sensibles (mot de passe, jeton, clés d'accès, jeton de session), paramètres `X-Amz-*`, et toute chaîne de requête d'URL (hôte et chemin conservés pour le diagnostic). Le motif entier est remplacé par `[expurgé]`, nom de clé compris.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/lib/errors.ts : `SENSITIVE_PATTERNS`, `URL_QUERY_PATTERN`, `redactDiagnostic` | Nouvelle expurgation | Diagnostic sûr par construction avant émission |
| src/lib/errors.ts : `logInternalError` | Applique `redactDiagnostic` au code, au message et à la stack | Aucun secret recopié dans le journal |
| tests/api/diagnostics.spec.ts | PANNE-005/006/007 | Autres formes de secrets, diagnostic utile conservé, journal + réponse sur le module réel |

#### Nouveau fonctionnement

Exception non prévue dans une route → `respondError(error, operation)` → `logInternalError` calcule code, message et stack puis les passe dans `redactDiagnostic` (chaîne de requête d'URL remplacée d'abord, puis chaque motif sensible) → une seule ligne JSON est émise sur `console.error` → la réponse HTTP reste `{ error: "Une erreur inattendue est survenue. Réessaie plus tard." }` avec 500, inchangée. Un message sans donnée sensible (ex. `relation "expense_notes" does not exist`) reste intact.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run lint` ; `npm run typecheck` ; `npm run build` | exit 0 | exit 0 (1 avertissement lint préexistant hors périmètre) | Sortie locale 2026-10-19 |
| `npm run test:unit` | Tous réussis | 21/21 (dont les 15 tests CI-SPEC du contrôleur) | `reports/unit.json` |
| `npm run test:api` (suite complète) | PANNE-002…007 et NOTE-022 réussis | 69/120 ; les 7 cas AUD-005 réussis, dont PANNE-004 (exception SQL réelle avec jeton et signature fictifs : absents de la réponse et du journal) | `reports/api.json` |
| `npm run test:e2e` (suite complète) | Aucune régression | 39/62 ; échecs restants hors SPEC-01 | `reports/e2e.json` |
| `npm run test:report` puis `npm run test:spec:report -- SPEC-01` | Contrôle par spec vert | `passed`, 7/7, aucune couverture manquante ; SPEC-02 à 12 identiques à la référence `main` du 19 octobre | `reports/SPEC-01.json`, `reports/specifications.md` |
| Garde append-only | Préfixes conservés | `check` réussi avec `/tmp/arla-spec-01-review-gf.json` | Sortie locale 2026-10-19 |

#### Écarts et limites

L'expurgation est une liste de motifs : un secret sous une forme non prévue (ex. valeur isolée sans clé ni préfixe reconnaissable) passerait encore. Elle s'applique au seul diagnostic émis par `respondError` ; les autres `console.error` du dépôt (ex. OCR) ne sont pas couverts par ce lot. PANNE-005/006/007 sont placés dans la suite API et non unitaire : le scénario d'outillage CI-SPEC-014 ne fournit qu'un rapport API pour SPEC-01, et un cas AUD-005 unitaire y apparaîtrait « non exécuté » (statut `incomplete` au lieu de `failed`). Le contrôleur AUD-011 n'est pas modifié par ce lot ; la remarque est transmise pour sa propre revue.

### 2026-10-20 — SPEC-01, secrets JSON et valeurs citées

Statut : implémentée et vérifiée sur les frontières décrites ; CI distante à confirmer après push.
Spec : [SPEC-01](../../specs/SPEC-01-erreurs-api.md). Départ : `3a343b5c42fca2e92074fd865702318dae869aa7`, après récupération des notes de main dans la branche SPEC-01. Réalisation : diff local du 20 octobre, empreintes des deux fichiers applicatif/test dans les [preuves](../evidence/spec01-fix-20261020/checks.json).

#### Ce qui a été implémenté

La contre-revue a reproduit une fuite avec `password="<fictif>"`, une clé JSON `token` et un cookie cité. Les motifs précédents s'arrêtaient aux guillemets avant de consommer la valeur. Les motifs traitent maintenant les clés JSON et valeurs entre guillemets simples/doubles, y compris caractères échappés, virgules et espaces internes. La même protection couvre Authorization, Cookie et paramètres AWS. Les constats historiques restent conservés ci-dessus.

#### Où

| Fichier et repère | Modification | Rôle |
| --- | --- | --- |
| src/lib/errors.ts, SENSITIVE_PATTERNS | Consommation complète des valeurs citées et des cookies | Filtrer avant journalisation |
| tests/api/diagnostics.spec.ts, PANNE-008/009 | Deux cas supplémentaires, neuf formes sensibles et journal réellement émis | Protéger le filtre et son utilisation |

#### Nouveau fonctionnement

Exception serveur → respondError → code/message/stack soumis à redactDiagnostic → clé et valeur sensibles remplacées ensemble → diagnostic JSON interne → réponse publique 500 générique inchangée. Aucun changement des réponses métier, succès, permissions, données ou UI. Les messages techniques sans secret reconnaissable restent utilisables.

#### Validation et preuves

| Commande/scénario | Résultat réel | Preuve |
| --- | --- | --- |
| Reproduction JSON avant correction | Assertion en échec, exit 1 | Contre-revue et reproduction du 20 octobre |
| Reproduction après correction | 5 frontières réussies ; deux axes de revue sans nouveau blocage | [Contre-revue](../revue-pr-g4bi2004-20261020.md) et module courant |
| npm ci ; npm run lint ; npm run typecheck ; npm run build | Exit 0 chacun ; un avertissement lint historique | [Dossier de checks](../evidence/spec01-fix-20261020/) |
| npm run test:unit | 21/21, exit 0 | [checks.json](../evidence/spec01-fix-20261020/checks.json) |
| npm run test:api | 122 exécutés, 71 réussis, 51 échecs de corrections hors lot, 0 absent, aucune erreur globale ni échec de référence ; exit 1 conservé | Même preuve, état de chaque cas conservé |
| npm run test:spec:report -- SPEC-01, SOURCE_SHA=3a343b5 | passed, 9/9, 0 échec/absent/couverture manquante, exit 0 | Même preuve |

Essais Linux/Node 24.6.0/npm 11.5.1, copie isolée /tmp, PostgreSQL et LocalStack jetables ; aucun service utilisateur modifié. Snapshot append-only capturé avant correction : `/tmp/arla-spec01-correction-oct20.json`.

#### Écarts et limites

Cette correction ferme les formats cités reproduits ; une liste de motifs ne prouve pas la confidentialité d'une chaîne arbitraire sans clé ou préfixe. Les autres producteurs de logs restent hors de cette correction. E2E non rejoués localement pour ce correctif ; la CI sera relancée après push. Les 51 échecs API des autres lots restent visibles, sans assertion modifiée, suppression ou skip. La demande explicite de Maia autorise ensuite l'intégration successive des SPEC-01 à 05 ; elle ne transforme pas le rouge global restant en réussite.

### 26 octobre 2026 — Préparation documentaire LastChanges, correction non implémentée

Une nouvelle alerte SonarQube S8786 concerne le coût du motif authorization (`src/lib/errors.ts:19`, SHA `2e9e30cf9f21a240c1213da6baec7f4c61618175`). À la demande de Maia, le [complément AUD-005 LastChanges](AUD-005-diagnostic-borne-LastChanges.md) et [SPEC-14 LastChanges](../../specs/SPEC-14-diagnostic-borne-LastChanges.md) préparent une borne préalable et une reconnaissance sans retours arrière, avec conservation des protections et tests existants. Quatre mesures du motif isolé sont disponibles ; aucune fuite ni saturation HTTP démontrée. Ce nouvel ajout est documentaire : aucun code changé, aucun test de correction exécuté, aucun correctif implémenté à cette date pour cette alerte.

### 26 octobre 2026 — Correction de classement documentaire, aucune implémentation

Maia précise qu'un nouveau constat doit avoir son propre ID AUD. Le rattachement de l'alerte SonarQube 12/16 à AUD-005 est remplacé par [AUD-028 — LastChanges](AUD-028-diagnostic-borne-LastChanges.md), avec [SPEC-14](../../specs/SPEC-14-diagnostic-borne-LastChanges.md). Les textes précédents restent historiques ; ils ne décrivent plus le classement retenu. AUD-005 conserve son objet initial de confidentialité des erreurs. Aucun changement applicatif ou test de correction exécuté.
