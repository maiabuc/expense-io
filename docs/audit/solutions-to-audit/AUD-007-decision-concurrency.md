# AUD-007 — Protéger une décision contre une écriture concurrente

Direction acceptée : `UPDATE` conditionnel sur l'état `pending` et périmètre autorisé conservé. Non implémenté ; contrat des réponses à préparer. Source originale : `265924bc7274047989e708ab635c2854d376230f`.

## Problème, localisation et fonctionnement original

[Approbation manager:14](../../../src/app/api/manager/expense-notes/[id]/approve/route.ts#L14) lit la note ; ligne 24 contrôle le statut lu ; lignes 28–30 écrivent par ID sans imposer que l'état enregistré soit toujours `pending`. [Rejet manager:14–30](../../../src/app/api/manager/expense-notes/[id]/reject/route.ts#L14) suit le même ordre. Les routes RH analogues doivent être vérifiées aussi. [db.ts:35–38](../../../src/lib/db.ts#L35) entoure chaque opération d'une transaction ; cela ne prouve pas à lui seul que deux requêtes ne se chevauchent pas.

## Pourquoi c'est un problème

Deux onglets ou clients peuvent lire `pending` avant qu'un seul ait écrit. Le premier approuve ; le second rejette à partir de sa lecture ancienne et peut écraser l'approbation. **OBSERVATION :** écriture sans condition d'état. **HYPOTHÈSE :** résultat de cette course à reproduire sur DB réelle selon l'isolation et les permissions. Aucun incident concurrent mesuré dans la preuve initiale.

La règle acceptée est qu'une deuxième décision ne doit pas écraser une première décision enregistrée. Réponse à une répétition identique, conflit et note inexistante/non autorisée restent à définir.

## Fonctionnement retenu

Écrire avec un `UPDATE` atomique exigeant l'état courant `pending` et le périmètre autorisé. Une ligne renvoyée confirme la transition ; zéro ligne ne doit pas être traité comme une décision réussie. Ce résultat ne distingue pas à lui seul état déjà décidé, ressource absente et refus d'accès : définir une réponse sans divulguer une note non autorisée.

La vérification décisive se fait au moment de l'écriture, plutôt que seulement avant. `await` ordonne le travail d'une requête ; il ne coordonne pas plusieurs connexions, clients ou instances. Désactiver les boutons réduit des doubles clics, mais les appels directs et autres onglets restent possibles.

Les transitions légitimes `pending` → `approved`/`rejected` sont conservées, sans nouveau statut ni schéma nécessaire pour ce contrôle seul. L'issue concurrente perdante est intentionnellement empêchée ; réponses exactes et UI doivent respecter le contrat retenu.

## Alternative et définition du verrou

Un `SELECT FOR UPDATE` dans une transaction verrouille la ligne sélectionnée ; des écritures concurrentes attendent normalement commit/rollback. Le verrou n'est pas une interdiction permanente : après sa libération, la règle métier doit toujours protéger l'état.

Cette séquence explicite lecture/verrou/écriture est viable pour une décision à plusieurs étapes coordonnées, mais ajoute attente et gestion transactionnelle. Non retenue pour la transition actuelle d'une ligne ; le `UPDATE` conditionnel emploie déjà le verrouillage interne PostgreSQL et vérifie la condition au point d'écriture. Réexaminer si des règles multi-lignes ou effets externes apparaissent. Rendre les handlers synchrones ou cacher les boutons ne protège pas l'état partagé.

## Validation requise

Données isolées, état initial `pending` connu : provoquer deux requêtes qui se chevauchent avec ordre contrôlé ; vérifier les réponses et l'état final. Couvrir manager et RH, décisions opposées, répétitions identiques, droits et périmètres. Documenter isolation et rôle DB effectifs ; ne pas conclure depuis des mocks que PostgreSQL applique la règle. Aucun code modifié ni test de correction réalisé dans cette fiche.

## Actualisation des preuves — campagne du 14–15 octobre

Deux transactions avec lectures chevauchées reproduisant le source : approved est écrasé par rejected. Contrôle séquentiel HTTP : approbation 200 puis nouvelle décision 409. Course HTTP simultanée non exécutée. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-19 — SPEC-08, personne C

Statut : implémentée et vérifiée sur le périmètre décrit (manager et RH, compte applicatif limité du harnais, état `incomplete` de SPEC-09).
Spec : [SPEC-08](../../specs/SPEC-08-decisions-atomiques.md). Révision de départ : `1746cdb` (branche `feat/spec-09`, elle-même sur `main` `7377486` + `feat/spec-01` `f5dc2d6` + `feat/spec-02` `4913b50` + `feat/spec-04` `19bdd4c` + `feat/spec-06` `bb16e63`). Réalisation : `4153242` (correction) et `1127b8e` (tests), branche `feat/spec-08`.

#### Ce qui a été implémenté

Chacune des quatre routes (manager et RH, approve et reject) remplace « lire pending puis écrire par identifiant » par un seul `UPDATE ... WHERE status = 'pending' AND <autorisation actuelle> RETURNING *`. L'autorisation est relue dans l'écriture : manager actuel de rôle `manager`, propriétaire rattaché directement à lui et de la même entreprise (manager) ; RH actuel de rôle `hr_admin`, propriétaire manager racine de la même entreprise (RH). Une ligne modifiée : succès 200. Zéro ligne : une requête de périmètre distingue 404 (hors périmètre ou absente, sans révéler l'état) de 409 « Already decided » (dans le périmètre, non pending, y compris `incomplete`). Un identifiant qui n'est pas un UUID répond 404 au lieu d'une erreur 500 de la base. Les gardes 401 manager et 403 RH sont inchangées, et le code ne partage aucune requête entre manager et RH.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/app/api/manager/expense-notes/[id]/approve/route.ts et reject/route.ts | `UPDATE expense_notes en SET status = ... FROM users u, users m WHERE ... AND en.status = 'pending' ... RETURNING en.*`, puis requête de périmètre sur zéro ligne | Transition atomique du manager |
| src/app/api/hr/expense-notes/[id]/approve/route.ts et reject/route.ts | Même schéma avec `hr` et la condition manager racine de même entreprise | Transition atomique du RH, périmètre distinct |
| migrations/1700000000020_expense-notes-soumission-rls.sql (SPEC-09) | Politiques `manager_update` et `hr_root_manager_update` : `USING status = 'pending'`, `WITH CHECK status IN ('approved', 'rejected')` | Même règle imposée en base sous le compte applicatif |

#### Nouveau fonctionnement

Manager ou RH → garde de rôle actuel (401 / 403) → identifiant UUID (404 sinon) → transaction `withUserScope` → un `UPDATE` unique qui verrouille la ligne et réévalue état et autorisation : si une autre décision a déjà été validée, PostgreSQL réévalue la condition sur la ligne mise à jour et ne modifie rien → zéro ligne → requête de périmètre → 409 ; sinon 404. Le perdant d'une course reçoit donc 409 sans écraser la première décision. L'état `incomplete` n'est décidable ni par la route (409) ni par la politique RLS (zéro ligne).

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| Suites complètes, issue AUD-007 | DEC-005, 006, 007 verts | AUD-007 : 21/21 réussis (DEC-005 à 007 étaient rouges ; DEC-010 à 017 ajoutés : séquentiel, incomplete, compte applicatif, autorisation relue, quatre décisions simultanées, panne, identifiant illisible, gardes) | `reports/issues.json`, 2026-10-19 |
| Cas ajoutés sur les routes précédentes (`1746cdb`, clone jetable) | Les cas `correction` échouent | DEC-014 et DEC-016 échouent ; DEC-010 à 013, 015 et 017 réussissent (cas `reference`) | Sortie locale 2026-10-19 |
| `npm run ci:docs` ; `lint` ; `typecheck` ; `build` | exit 0 | exit 0 chacun (242 tests identifiés) | Sortie locale 2026-10-19 |
| `npm run test:unit` | Pas de régression | 22/22 réussis | `reports/unit.json` |
| `npm run test:api` (complète) | Aucune régression | exit 1 ; 142 réussis, 16 échoués sur 158 (référence `feat/spec-09` : 131/150) | `reports/issues.json` |
| `npm run test:e2e` (complète) | Aucune régression | exit 1 ; 61 réussis, 1 échoué sur 62 (INS-006, SPEC-05) | `reports/issues.json` |
| `npm run test:report` | Bilan agrégé | exit 1 ; 225 réussis, 17 échoués sur 242 (référence : 214/234) | `reports/issues.json` |

#### Écarts et limites

Le critère « autorisation réévaluée à l'écriture » est garanti au niveau de l'instruction `UPDATE` ; un changement de rattachement survenu entre la garde de rôle et l'`UPDATE` d'une même requête est vu par l'`UPDATE` (relation relue), mais une relation modifiée pendant que l'`UPDATE` attend le verrou de la ligne n'est pas réévaluée (instantané de l'instruction). DEC-014 vérifie quatre décisions simultanées sans barrière en base ; DEC-005 à 007 utilisent la barrière existante. Les routes de décision ne sont pas passées en transaction `SELECT ... FOR UPDATE` : choix conservé de la fiche. Le contrôle de bout en bout avec des liens de reçu déjà émis n'est pas concerné.
