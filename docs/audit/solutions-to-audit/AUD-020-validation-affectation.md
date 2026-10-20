# AUD-020 — Distinguer erreur de requête et retrait de manager

Statut : direction retenue le 14 octobre 2026, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Localisation initiale et problème

`src/app/api/hr/users/[id]/manager/route.ts:12–13` transforme l'échec de request.json en null, puis managerId absent en null. Les lignes 31–46 sautent la vérification de manager si cette valeur est null ; les lignes 48–51 sauvegardent l'affectation. Le client RH transmet explicitement managerId, y compris null pour un retrait (`src/components/AdminConsole.tsx:74–78`).

Pourquoi c'est un problème : erreur de lecture et demande métier de retrait sont confondues. Une requête mal formée/incomplète peut devenir une modification valide. MEASUREMENT : huit exécutions des deux déclarations extraites ; six corps invalides/incomplets produisent null comme le retrait explicite. [Résultats](../evidence/manager-body-check.json), [protocole](../evidence/manager-body-check.cjs). Aucune mutation HTTP/DB exécutée.

## Solution retenue

Distinguer les erreurs et refuser avant toute mutation :

| Cas | Résultat attendu |
| --- | --- |
| JSON impossible à lire | Erreur spécifique de JSON invalide ; aucune affectation changée |
| JSON lisible mais corps non objet (null, tableau, nombre, chaîne) | Erreur spécifique de structure ; aucune mutation |
| Objet sans champ managerId | Erreur spécifique de champ manquant ; aucune mutation |
| Champ managerId d'un type/format invalide | Erreur spécifique de champ invalide ; aucune mutation |
| Objet avec managerId explicitement null | Demande de retrait valide, avec autorisation existante |
| Objet avec identifiant de manager valide | Vérifier rôle, entreprise et périmètre selon AUD-006 avant affectation |

Utiliser HTTP 400 pour les erreurs de requête, message public compréhensible dans le champ error compatible et code technique distinct en logs internes selon AUD-005. Aucun champ technique nouveau requis dans la réponse. Libellés/codes exacts et validation d'identifiant à préparer. Ne pas utiliser un fallback null pour les erreurs et ne pas supprimer une affectation parce que le champ manque.

Préserver le retrait explicite et l'affectation autorisée, URL/méthode/format standard/UI/commandes. Aucun élargissement des droits ni retrait de fonctionnalité valide. Alternative erreur unique générique ne permet pas le diagnostic demandé ; interprétation implicite en retrait écartée.

## Validation prévue

Sur environnement isolé et acteur RH autorisé : chaque entrée invalide produit une erreur différenciée sans changement de manager ; retrait null et affectation valide comme contrôles positifs. Ajouter mauvais rôle/entreprise, identifiant inexistant et contraintes AUD-006. Vérifier réponses et état DB, pas uniquement le parsing. Aucun test de correction ni changement applicatif.

## Actualisation des preuves — campagne du 14–15 octobre

JSON cassé envoyé par RH autorisé : HTTP 200 et manager_id devient null en DB. Les erreurs différenciées de la cible restent à tester. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-19 — SPEC-07, personne C

Statut : implémentée et vérifiée sur le périmètre décrit, sauf AFF-019 resté rouge pour une raison de données de test (voir limites).
Spec : [SPEC-07](../../specs/SPEC-07-hierarchie-managers.md). Révision de départ : `bb16e63` (tête de `feat/spec-06`, sur `main` `7377486`). Réalisation : `09ca108` (correction) et `2421887` (tests), branche `feat/spec-07`.

#### Ce qui a été implémenté

La route d'affectation lit le corps JSON sans repli sur `null`. JSON illisible, corps non objet, champ `managerId` absent et valeur invalide (autre chose que `null` ou un UUID) sont refusés en 400 avec quatre messages français distincts, avant toute lecture de la hiérarchie et sans mutation. Seul `{"managerId": null}` retire le manager. Un identifiant de cible qui n'est pas un UUID est traité comme une cible absente (404, au lieu d'une erreur 500 de la base). Le code technique de chaque refus est journalisé (`console.warn` JSON) sans figurer dans la réponse.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/app/api/hr/users/[id]/manager/route.ts, l. 33–46 | Lecture du corps, quatre refus 400 distincts, validation UUID | Aucune requête SQL avant un corps valide |
| src/app/api/hr/users/[id]/manager/route.ts, `refuser` (l. 8–19) | Réponse publique `{ error }` et journal du code interne | Code technique distinct en logs (AUD-005) |

#### Nouveau fonctionnement

Action RH → garde de rôle actuel (403 sinon) → lecture du corps (400 sans mutation selon le cas) → transaction qui verrouille la ligne `companies` de l'entreprise du RH → cible de la même entreprise et de rôle employee ou manager (404 sinon) → contrôles du manager et des boucles, voir [AUD-021](AUD-021-boucles-managers.md#implementation) → écriture. Le retrait par `null` suit le même chemin, sans contrôle de manager. La réponse de succès conserve `id, name, email, role, managerId`.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:api` avec `TEST_ISSUE=AUD-020` | AFF-001 à 008, 019 verts, positifs conservés | 14 réussis sur 15 : AFF-001 à 008 verts (étaient rouges), AFF-009 vert, AFF-020, 021, 028, 029 ajoutés et verts, NAV-015 vert. AFF-019 rouge | Sortie locale 2026-10-19 |
| Les cas AFF-020, 021, 029 sur le code de départ (`bb16e63`, clone jetable) | Échouent | 3 échecs sur 3 ; AFF-028 (référence) réussit | Sortie locale 2026-10-19 |
| `npm run lint` ; `npm run typecheck` ; `npm run build` | exit 0 | exit 0 chacun | Sortie locale 2026-10-19 |
| `npm run test:unit` | 6/6 | 6/6 réussis | `reports/unit.json` |
| `npm run test:api` (complète) | Aucune régression ; AFF verts | exit 1 ; 101 réussis, 34 échoués sur 135 (SPEC-06 : 79/125 ; main : 61/112) | `reports/issues.json` |
| `npm run test:e2e` (complète) | Aucune régression | exit 1 ; 38 réussis, 22 échoués sur 60 (identique à main) | `reports/issues.json` |
| `npm run test:report` | Bilan agrégé | exit 1 ; 145 réussis, 56 échoués sur 201 | `reports/issues.json` |

#### Écarts et limites

AFF-019 reste rouge. Le client Playwright envoie une donnée textuelle non analysable (`{`) sous forme de chaîne JSON valide (`"{"`) : le test n'envoie donc jamais de JSON illisible, et ses entrées `{` et `[]` produisent toutes deux l'erreur « corps non objet », d'où 3 messages distincts au lieu de 4. Le contrat n'a qu'un message pour les corps non objet. Je n'ai pas modifié ce test ; le cas AFF-029 envoie les octets bruts et prouve les quatre messages distincts. Correction possible, à décider : envoyer `Buffer.from('{')` dans AFF-019. Le catalogue prévoit un message 409 « Cette affectation de manager n'est pas autorisée. » ; j'ai conservé « Invalid manager » déjà présent pour compatibilité. Le journal des codes utilise `console.warn` local à la route en attendant l'intégration avec le mécanisme de SPEC-01 (non présent sur cette base).

### 2026-10-20 — SPEC-07 : intégration de `main`, journal des refus par SPEC-01 (personne C)

Statut : implémentée et vérifiée sur le périmètre décrit, sauf AFF-019 resté rouge (voir limites).
Spec : [SPEC-07](../../specs/SPEC-07-hierarchie-managers.md). Révision de départ : `8b02ca4`. `main` fusionné : `5dc5024` (fusion `7cdf94b`). Réalisation : `aa93ca7` (journal des refus) et `f47d5e8` (message du 409, décision D1).

#### Ce qui a été implémenté

La branche contient désormais SPEC-01 à 06 de `main`. Les refus 400/409 de la route d'affectation ne passent plus par un `console.warn` local : ils sont journalisés par `respondRefusal`, ajouté à `src/lib/errors.ts` à côté de `respondError` (même forme de ligne, code expurgé par `redactDiagnostic`). `respondError` lui-même ne convient pas aux refus : il répond toujours 500. Contrat de réponse inchangé. Le refus d'affectation interdite répond désormais « Cette affectation de manager n'est pas autorisée. » (catalogue de 01-contrats, décision D1) au lieu de « Invalid manager ».

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/lib/errors.ts, `respondRefusal` (fin de fichier) | Journal d'un refus attendu et réponse `{ error }` | Point commun avec le diagnostic de SPEC-01 |
| src/app/api/hr/users/[id]/manager/route.ts, `refuser` et `OPERATION` | Délègue à `respondRefusal` ; message du 409 d'affectation interdite | Journal interne, message public conforme |
| tests/api/hierarchie.spec.ts, AFF-030 et AFF-031 | Journal du refus (code, opération, statut, sans secret) ; message D1 pour auto-affectation, autre entreprise, rôle non manager, manager inexistant | Preuves des deux changements |
| tests/support/database.ts | Liste de triggers de nettoyage : union de `main` et de `ci_assignment_failure` | Résolution du conflit de fusion |

#### Nouveau fonctionnement

Action RH → garde de rôle actuel → lecture du corps → contrôles → en cas de refus, `respondRefusal(code, message, statut, opération)` écrit `{timestamp, code, operation, status}` sur la sortie d'avertissement et répond le seul message public. Le reste du parcours décrit dans l'entrée du 2026-10-19 est inchangé.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run lint` ; `npm run typecheck` ; `npm run build` | exit 0 | exit 0 chacun (lint : 1 avertissement préexistant, `e` inutilisé hors périmètre) | Run local 2026-10-20 sur `f47d5e8` |
| `npm run test:unit` | tous réussis | 25/25 | `reports/unit.json` |
| `npm run test:api` complète | aucun nouveau rouge | 138/147 ; 9 rouges, tous attendus à ce stade : AFF-019 (SPEC-07, voir limites) et PANNE-001, RLS-001, RLS-002, RLS-005 (SPEC-09), DEC-005 à 007 (SPEC-08), SEED-002 (SPEC-10), dont les branches ne sont pas encore intégrées | `reports/api.json` |
| `npm run test:e2e` complète | aucune régression | 62/62 | `reports/e2e.json` |
| `npm run test:report` | bilan agrégé | exit 1 (les 9 rouges ci-dessus) ; 225/234 | `reports/issues.json` |
| `npm run test:issue -- AUD-006` / `AUD-020` / `AUD-021` / `G10` | cas de l'issue verts | AUD-006 36/36 ; AUD-020 15/16 (AFF-019 rouge) ; AUD-021 7/7 ; G10 11/11 | sorties locales du 2026-10-20 |
| `AUDIT_BASE_SHA=5dc5024… node scripts/ci/documentation.mjs` | préfixes de `main` conservés | exit 0 | sortie locale |

#### Écarts et limites

AFF-019 reste rouge, non modifié et non traité : il exige quatre messages distincts alors que le client Playwright envoie « { » sous forme de chaîne JSON valide (diagnostic de l'entrée du 2026-10-19 conservé) ; AFF-029 prouve les quatre messages avec des octets bruts. Le cas AFF-019 est requis par `tests/specifications.json` : le contrôle « SPEC-07 » de la CI restera rouge tant que cette décision n'est pas prise. L'entrée du 2026-10-19 indiquait conserver « Invalid manager » : la décision D1 du 2026-10-20 la remplace pour le message public. La relecture de la concurrence par une autre personne n'a pas eu lieu.
