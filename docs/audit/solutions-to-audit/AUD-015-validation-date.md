# AUD-015 — Validation de la date

Décisions du 14 octobre 2026, non implémentées. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuves

OBSERVATION : [route:74](../../../src/app/api/expense-notes/route.ts#L74) vérifie seulement que la date est une chaîne. Le [formulaire:195](../../../src/app/expenses/page.tsx#L195) utilise type=date et transmet FormData sans changement (`:79–83`). Selon [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date), la valeur transmise est yyyy-mm-dd, même si l'affichage dépend de la langue. L'OCR produit aussi année-mois-jour (`src/lib/ocr.ts:75`). Aucun scénario HTTP exécuté.

## Solution retenue

- Valider côté serveur le format existant yyyy-mm-dd ; dd.mm.yyyy n'est pas retenu puisqu'un format est déjà établi.
- Vérifier le jour réel, les longueurs des mois et les années bissextiles : le 29 février n'existe pas chaque année.
- Accepter aujourd'hui, refuser une date future ; pas de seuil d'ancienneté sélectionné.
- Définir aujourd'hui par l'horloge serveur dans Europe/Paris, indépendamment des réglages de l'ordinateur client.
- Pays/région et géolocalisation hors périmètre ; pas de migration géographique ni nouveau champ demandé.

Pourquoi : format et existence sont deux contrôles distincts ; l'horloge client est modifiable. Le schéma versionné (`migrations/1700000000001_init-schema.sql:4–34`) n'a pas de champ géographique et conserve une date seule. La préférence initiale pour la région de l'ordinateur est remplacée par Europe/Paris ; aucun besoin de persister cette information.

## Compatibilité et validation

La route actuelle ne refuse pas explicitement les dates futures : cette restriction demandée doit être vérifiée contre les fonctions attendues et les tests du professeur avant implémentation. Caractériser aussi les autres formats actuellement acceptés par PostgreSQL avant réduction du contrat API. HTTP 400 avec message sûr est proposé pour une date invalide ; contrat exact selon AUD-005 à préciser.

Vérifications prévues : date valide, absente/vide, syntaxe incorrecte, jour impossible, année bissextile, aujourd'hui/demain et passage de minuit Europe/Paris. Tests exécutés : 0 ; schéma local non inspecté, application inchangée. [Journal](../DECISION_LOG.md).

## Actualisation des preuves — campagne du 14–15 octobre

Date inexistante : 500 ; date 2099-01-01 : 201. Le refus du futur est une règle choisie pendant audit ; ne pas le présenter comme une obligation initiale démontrée. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-18 — SPEC-04, personne B

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-04](../../specs/SPEC-04-entrees-et-affichage.md). Révision de départ : `7377486`. Réalisation : `c445659`.

#### Ce qui a été implémenté

`parseStrictExpenseDate` (src/utils/validators.ts) vérifie le format exact `yyyy-mm-dd`, l'existence réelle du jour (bornes du mois via `Date.UTC(year, month, 0)`, bissextiles incluses) et refuse toute date postérieure à aujourd'hui. « Aujourd'hui » est calculé par `todayInParis()` (`Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'`), indépendant du fuseau de la machine serveur et de l'horloge cliente.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/utils/validators.ts : `DATE_PATTERN`, `daysInMonth`, `todayInParis`, `parseStrictExpenseDate` | Format, existence réelle, refus du futur en Europe/Paris | Remplace la vérification « est une chaîne » par un contrôle complet |
| src/app/api/expense-notes/route.ts : `POST` | Appel `parseStrictExpenseDate` → 400 si `null` | Refus avant toute écriture |

#### Nouveau fonctionnement

POST avec `expenseDate` → `parseStrictExpenseDate` vérifie le motif `^\d{4}-\d{2}-\d{2}$` → extrait année/mois/jour → `daysInMonth` calcule la borne réelle du mois (ex. 29 jours en février bissextile, 28 sinon) → rejet si jour hors bornes → comparaison lexicographique `raw > todayInParis()` (valide sur ce format) → rejet si date future selon l'horloge serveur en Europe/Paris, indépendamment du fuseau configuré sur la machine → sinon la chaîne est transmise inchangée à l'`INSERT`.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:issue -- AUD-015` | DATE-001, NOTE-016…021 réussis | 7/7 réussis, dont le passage de minuit Paris (horloge fixée) : aujourd'hui accepté, demain refusé | `reports/issues.json`, run local 2026-10-18 |
| `npm run test:api` (suite complète) | Aucune régression | 82/112 (AUD-015 0 échec) | `reports/issues.json` |

#### Écarts et limites

Aucun seuil d'ancienneté minimale ajouté (hors décision retenue). Pays/région et géolocalisation restent hors périmètre, conformément à la fiche. La distinction avec l'horloge UTC utilisée pour l'affichage (AUD-017) est volontaire : ce sont deux règles indépendantes.

### 29 octobre 2026 — SPEC-18, refus de l'année zéro avant soumission

Statut : implémentée et vérifiée sur le périmètre unitaire décrit ; API/E2E (absence de réservation DB/S3, persistance 0001) à vérifier par la CI, Docker absent localement.
Spec : [SPEC-18](../../specs/SPEC-18-date-annee-zero.md). Révision de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Réalisation : branche `feat/spec-18`, diff local du 29 octobre 2026.

#### Ce qui a été implémenté

`parseStrictExpenseDate` extrayait l'année mais ne refusait pas `year < 1`. `0000-01-01` passait le format, les bornes mois/jour et le contrôle de futur : `daysInMonth` s'appuie sur `new Date(Date.UTC(year, ...))` qui interprète l'année 0 comme 1900, donc ne l'écartait pas. Ajout d'un garde `if (year < 1) return null` placé avant le calcul des jours. L'année 0001 reste admise, le message « Date invalide », le format yyyy-mm-dd et la référence Europe/Paris sont conservés. Aucune autre règle de date modifiée.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/utils/validators.ts : parseStrictExpenseDate | `if (year < 1) return null` avant les bornes mois/jour | Refus d'entrée de l'année zéro, partagé par la route POST |

#### Nouveau fonctionnement

Formulaire multipart → `currentSession` → validation des champs → `parseStrictAmount` → `parseStrictExpenseDate` : motif yyyy-mm-dd → `year < 1` → `null` → la route renvoie 400 `{ error: "Date invalide" }` avant d'appeler `dependancesReelles`/`soumettre` et `withUserScope`, donc aucune note, réservation d'identifiant ni objet reçu créé. `0001-01-01` traverse le validateur inchangé et suit le parcours de création normal jusqu'à l'INSERT PostgreSQL.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npx vitest run tests/unit/expense-date.test.ts` | DATE-ZERO-001…006 verts | exit 0, 6/6 réussis (2 correction + 4 référence) | Sortie locale 2026-10-29, Node 24.6.0 |
| `npm run typecheck` | exit 0 | exit 0 | Sortie locale 2026-10-29 |
| `npm run lint` | exit 0 | exit 0 (1 avertissement préexistant hors périmètre) | Sortie locale 2026-10-29 |
| `npm run build` | exit 0 | exit 0 | Sortie locale 2026-10-29 |
| `npm run test:unit` (suite complète) | Seuls les défauts LastChanges non encore corrigés + spec-report préexistant restent rouges | 67/81 réussis ; 14 échecs restants (branche partie de feat/ci) | `reports/unit.json` |
| `tests/api/expense-date.spec.ts` (DATE-ZERO-007/008) | 400 sans écriture DB/S3 ; 0001 persistée | Non exécuté localement : Docker/Compose absents | À vérifier sur GitHub Actions à l'ouverture de la PR |

#### Écarts et limites

Aucun écart avec SPEC-18 : seul le garde `year < 1` a été ajouté. Aucun seuil d'ancienneté métier introduit. La preuve d'absence de réservation DB et d'objet S3, et la persistance PostgreSQL de `0001-01-01`, dépendent des services jetables et restent à exécuter en CI. Toute autre anomalie calendaire découverte serait consignée séparément, sans élargir ce correctif.
