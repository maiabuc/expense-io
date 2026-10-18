# AUD-021 — Interdire les boucles entre managers

Statut : règle retenue le 14 octobre 2026, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Localisation initiale et problème

`src/app/api/hr/users/[id]/manager/route.ts:24` permet de modifier le manager d'un employé ou d'un manager. Les lignes 32–34 refusent seulement l'auto-affectation ; les lignes 39–51 vérifient le rôle puis enregistrent le lien. `migrations/1700000000001_init-schema.sql:18` impose une référence à un utilisateur existant, sans contrôle de boucle.

OBSERVATION : aucun contrôle des liens successifs n'apparaît dans ce parcours. HYPOTHÈSE non exécutée : après A → B, l'affectation B → A ou une chaîne plus longue pourrait former une boucle. Pourquoi c'est un problème selon la règle désormais choisie : une hiérarchie doit pouvoir remonter jusqu'à un manager sans supérieur ; une boucle ne le permet pas. Le contrôle d'entreprise AUD-006 ne protège pas contre une boucle interne.

## Décision retenue

Réponse réelle de Maia : « Oui nous devons interdire les boucles tout en conservant les affectations valides ».

Refuser côté serveur toute affectation créant une boucle, directe ou indirecte. Conserver les affectations autorisées sans boucle et le retrait explicite `managerId: null`. Préserver rôles, périmètres, UI et format des réponses. Erreur compréhensible selon AUD-005 ; statut et libellé exacts à préciser dans le contrat avant implémentation.

PROPOSITION de réalisation, à préciser : suivre les supérieurs du manager proposé ; si la chaîne atteint la personne à affecter, refuser sans modification. Protéger ensemble la vérification et l'écriture contre deux affectations simultanées : une simple lecture suivie d'un UPDATE ne suffit pas. Une transaction sérialisant les changements de hiérarchie d'une même entreprise via sa ligne existante est une option simple ; tous les chemins d'écriture concernés doivent respecter cette protection. Aucun mécanisme précis n'est réputé accepté par la seule approbation de la règle.

Alternatives : conserver uniquement le refus d'auto-affectation laisse les boucles indirectes possibles ; contrôler dans l'UI seule laisse les appels API directs contourner la règle. Ne pas modifier automatiquement les affectations existantes : identifier d'éventuelles boucles sur données isolées et préparer le traitement des données historiques avant migration.

## Validation prévue et limites

Tester auto-affectation, boucle à deux managers, boucle longue et deux requêtes simultanées ; vérifier le refus et l'absence de mutation. Contrôles positifs : chaîne valide, changement de supérieur valide et retrait explicite. Combiner avec les refus interentreprises et de rôle d'AUD-006. Aucun test HTTP/DB, mesure de concurrence ou correction applicative effectué pour ce point.

## Actualisation des preuves — campagne du 14–15 octobre

Affectation du manager racine à son subordonné acceptée HTTP 200 : boucle à deux reproduite. Boucle longue et concurrence non exécutées. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-19 — SPEC-07, personne C

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-07](../../specs/SPEC-07-hierarchie-managers.md). Révision de départ : `bb16e63`. Réalisation : `09ca108` (correction) et `2421887` (tests), branche `feat/spec-07`.

#### Ce qui a été implémenté

L'affectation d'un manager est refusée en 409 (« Cette affectation créerait une boucle entre managers. ») si la chaîne des supérieurs du manager choisi atteint la personne à affecter. L'auto-affectation reste refusée (409 « Invalid manager »). Les affectations valides et le retrait par `null` sont conservés. Le contrôle et l'écriture se font dans une même transaction qui verrouille d'abord la ligne `companies` de l'entreprise : deux affectations simultanées sont exécutées l'une après l'autre et la seconde voit la hiérarchie à jour. Aucune relation existante n'est modifiée.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/app/api/hr/users/[id]/manager/route.ts, l. 57 | `SELECT id FROM companies WHERE id = $1 FOR UPDATE` au début de la transaction | Sérialise toutes les affectations d'une entreprise, ordre de verrous companies puis users |
| src/app/api/hr/users/[id]/manager/route.ts, l. 86–96 | Requête récursive sur la chaîne des supérieurs, `UNION` pour s'arrêter sur une boucle historique | Détection des boucles directes et longues |
| migrations/1700000000010_users-hierarchie-integrite.sql | Contrainte `users_manager_distinct_check` (pas d'auto-affectation), NOT VALID | Garde en base contre l'auto-affectation, quel que soit le chemin d'écriture |

#### Nouveau fonctionnement

Après validation du corps et de la cible (voir [AUD-020](AUD-020-validation-affectation.md#implementation)) : verrou de la ligne `companies` → manager existant, de rôle manager et de la même entreprise (409 sinon) → parcours récursif des supérieurs du manager choisi : si la cible apparaît, 409 sans écriture → sinon `UPDATE users`, puis commit qui libère le verrou. Une affectation concurrente attend le verrou puis relit la hiérarchie validée. Un échec en cours de transaction annule tout (aucune mutation). Les boucles ne s'expriment pas en contrainte SQL : seules les écritures qui passent par cette route sont protégées ; le seed et le SQL direct ne prennent pas le verrou.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `TEST_ISSUE=AUD-021 npm run test:api` / suite complète | AFF-016 à 018 verts, positifs conservés | AUD-021 : 7/7 réussis (AFF-015 à 018 ; AFF-023, 024, 025 ajoutés). AFF-016, 017, 018 étaient rouges | `reports/issues.json`, 2026-10-19 |
| AFF-023 sur le code de départ (`bb16e63`, clone jetable) | Échoue | Échec ; AFF-024 et 025 (référence) réussissent | Sortie locale 2026-10-19 |
| Concurrence : AFF-018 (deux affectations croisées) et AFF-025 (deux affectations indépendantes), barrière en base | `[200, 409]` puis `[200, 200]` | Réussis tous les deux | Sortie locale 2026-10-19 |
| `npm run lint` ; `npm run typecheck` ; `npm run build` | exit 0 | exit 0 chacun | Sortie locale 2026-10-19 |
| `npm run test:unit` | 6/6 | 6/6 réussis | `reports/unit.json` |
| `npm run test:api` (complète) | Aucune régression ; AFF verts | exit 1 ; 101 réussis, 34 échoués sur 135 (SPEC-06 : 79/125 ; main : 61/112) | `reports/issues.json` |
| `npm run test:e2e` (complète) | Aucune régression | exit 1 ; 38 réussis, 22 échoués sur 60 (identique à main) | `reports/issues.json` |
| `npm run test:report` | Bilan agrégé | exit 1 ; 145 réussis, 56 échoués sur 201 | `reports/issues.json` |

#### Écarts et limites

Pas de contrainte ni de trigger interdisant les boucles dans la base : un écrivain qui ne prend pas le verrou (SQL direct, seed) peut en créer. Une boucle déjà présente en base n'est ni détectée ni corrigée automatiquement (AFF-024 vérifie seulement que le contrôle se termine). Verrou par entreprise : toutes les affectations d'une même entreprise sont sérialisées, ce qui est acceptable pour une action RH rare.
