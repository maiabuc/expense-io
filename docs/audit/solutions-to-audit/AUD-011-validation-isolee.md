# AUD-011 — Validation avec données séparées

Direction retenue le 14 octobre 2026. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème

Pour vérifier les corrections, il faudra provoquer des erreurs et modifier des notes de démonstration. Ces essais ne doivent pas toucher aux données ou services locaux existants. OBSERVATION : [Makefile:45–46](../../../Makefile#L45) lance installation, services, migrations, bucket et seed via la cible dev ; [Makefile:36–43](../../../Makefile#L36) appelle migration et seed. Les [écritures du seed:58–94](../../../scripts/seed.mjs#L58) peuvent changer les rôles/rattachements et ajouter des notes/reçus dans la base configurée. Pourquoi c'est un problème : des essais sur cette cible partagée peuvent altérer les données actuelles et rendre les résultats difficiles à reproduire. C'est une lacune de validation/isolation, pas un échec de démarrage démontré.

## Solution retenue

Données de test séparées. Préparer une base et un stockage de reçus réservés aux vérifications, avec deux entreprises et plusieurs rôles. Conserver les commandes build/README et leurs usages. Ne pas migrer, peupler, nettoyer ni arrêter les services actuels. Mise en place après l'audit, suivant le [protocole isolé](../evidence/runtime-protocol.md).

Alternative écartée : provoquer les pannes sur les données actuelles, avec risque d'altération et résultats difficiles à reproduire. Les copies de données seules ne suffisent pas si les essais ciblent encore les services actuels.

## Validation

Vérifier les cibles DB/stockage et l'isolation avant les écritures ; documenter fixtures, SHA, commandes et résultats. Aucun environnement créé, aucun test exécuté dans cet entretien. Les choix techniques précis restent à vérifier avant exécution.

## Actualisation des preuves — campagne du 14–15 octobre

Isolation mise en place sur demande explicite de Maia : projet Docker dédié, DB/S3 sur ports 15433/14567, deux entreprises et dix comptes fictifs. Campagne puis nettoyage des conteneurs/réseau dédiés, services utilisateur préservés. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 15 octobre 2026 — CI-001, tests isolés et traçabilité par issue

Statut : implémentée et vérifiée localement sur le périmètre ci-dessous ; exécution GitHub non acquise par ces mesures. Les tests de correction restent rouges tant que les défauts applicatifs persistent.
Spec : [CI-001](../../specs/CI-001-tests-non-regression.md). Révision de départ : `49e0ff395fd94c57e54213fe95434eb1e1e61869`. Réalisation mesurée : diff local daté, fixé par le [manifeste](../evidence/ci-20261015/source-manifest.json). Aucune modification des observations précédentes ni correction des autres AUD par cet ajout de tests.

#### Ce qui a été implémenté

CI avec installation, documentation protégée, lint, types, unitaires, build, API, navigateur et synthèse requise. Chaque cas porte son ID d'issue et son ID unique ; sélection possible par issue, sans déclaration automatique d'une correction. DB/S3 dédiés, deux entreprises et dix comptes fictifs, contrôles positifs/refus/pannes/concurrence, OCR et authentification réels. Résultats persistés avec provenance et périmètre ; couverture future nommée ; aucun test ignoré pour obtenir du vert.

#### Où

| Fichier et repère | Modification | Rôle |
| --- | --- | --- |
| .github/workflows/ci.yml, jobs | Étapes et dépendances, artefacts et résultat requis | Lance tous les contrôles et conserve les échecs |
| scripts/ci/run.mjs, lancement/finally ; tests/infra/compose.yml | Services jetables, application construite et nettoyage | Prépare puis détruit seulement l'environnement CI |
| tests/support/environment.ts, testEnvironment ; database.ts, resetDatabase | Garde des cibles et fixtures | Refuse les services usuels et isole chaque scénario |
| tests/api, tests/e2e et tests/unit |178 cas liés aux issues | Vérifient fonctionnalités et défauts attendus |
| scripts/ci/catalog.mjs, issue.mjs, report.mjs ; tests/reporters | Catalogue, sélection et synthèse | Relie chaque résultat aux AUD sans faux succès d'absence |
| scripts/ci/documentation.mjs | Comparaison des préfixes Git et manifeste | Protège aussi les anciennes IMPLEMENTATION |
| package.json, package-lock.json, configurations | Dépendances de test et scripts ajoutés | Commandes existantes conservées |
| docs/testing/README.md | Instructions d'exécution et lecture | Guide les équipes avant les corrections |

#### Nouveau fonctionnement

Push/PR → installation verrouillée → qualité et build → serveur construit avec DB/S3 CI → fixtures fictives → connexion réelle → appel API ou action navigateur → vérification réponse, UI et effets DB/S3 → résultat par cas puis par issue. Une assertion échouée rend la suite et le bilan requis rouges. Les rapports s'exécutent même après échec, puis les services jetables sont supprimés. Le JSON de la suite est supprimé avant préparation pour ne pas réutiliser un ancien succès. Les pannes provoquées n'atteignent pas les services utilisateur.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel | Preuve |
| --- | --- | --- | --- |
| npm ci ; lint ; typecheck ; build | Préparation et contrôles valides | exit0 chacun ; lint0 erreur/1 avertissement historique | [Campagne](../evidence/ci-20261015/README.md) |
| Catalogue et unitaires | IDs valides, règles de domaine |178 cas déclarés ;6/6 unitaires réussis | [Catalogue](../evidence/ci-20261015/catalog.json) |
| Lanceur API complet | Exécuter les assertions, transmettre l'échec, nettoyer | exit1 ;61 réussis/51 échoués/0 absent sur112 ; nettoyage effectué | [API](../evidence/ci-20261015/api.json) |
| Lanceur navigateur complet | Parcours et pannes UI vérifiés | exit1 ;38 réussis/22 échoués/0 absent sur60 ; nettoyage effectué | [E2E](../evidence/ci-20261015/e2e.json) |
| Synthèse complète | Aucun faux vert ni résultat absent dissimulé |105 réussis/73 échoués/0 absent sur178 ; échecs uniquement correction | [Bilan](../evidence/ci-20261015/issues.md) |
| Résultats absents / issue inconnue | Échec explicite |6 non exécutés / exit1 | [Contrôles](../evidence/ci-20261015/tooling-verification.json) |
| Préfixes et actionlint | Documents immuables, workflow valide |22 fiches protégées ; exit0 ; actionlint exit0 | [Campagne](../evidence/ci-20261015/README.md) |

#### Écarts et limites

Application, UI, commandes build/README, migrations et scripts d'origine préservés. Les autres issues sont testées, pas corrigées. Les rapports rouges montrent les travaux applicatifs restants. Nouveaux mécanismes de reprise/pool/hexagone à tester avec leur réalisation ; secret reporté et dépendances non qualifiées. Chromium seul, aucune mesure complète de couverture ou de charge ; tests du professeur absents. La protection de branche GitHub n'est pas configurée par ce lot. Aucun acquis de compréhension attribué à Maia.

### 19 octobre 2026 — CI-002, contrôles distincts par spec

Statut : implémentée et vérifiée localement sur le périmètre ci-dessous ; validation hébergée distincte. Demande de Maia : identifier la réussite des tests d’une spec dans ses PR. Base : `73774862cb4f1b172d2b15bdbcb00c75b7cff6c6`. Réalisation mesurée : diff localCI-002, sources fixées par le manifeste de campagne. [Spec](../../specs/CI-002-controles-par-spec.md), [preuve](../evidence/ci-specs-20261019/README.md), [revue des six PR](../revue-pr-g4bi2004-20261019.md).

#### Ce qui a été implémenté

Dix contrôles GitHub distincts SPEC-01…10, conservant les suites complètes et les IDs AUD/G. Un lot n’est plus automatiquement rouge à cause des défauts d’un autre lot : ses propres cas, sa couverture obligatoire et les prérequis communs sont vérifiés. Le bilan global reste bloquant. SPEC-11/12 restent à mesures/revue humaines, explicitement manual-review ; aucun succès fictif n’est ajouté.

Sept frontières publiques supplémentaires et quinze contrôles d’outillage ont été ajoutés. Ces tests ne corrigent aucune application : ils vérifient logs sûrs, petites valeurs, prototype du tri, grammaire/bornes, messageOCR503 et conservation du compte après panne de connexion. Les assertions précédentes sont conservées.

#### Où

| Fichier / repère | Modification | Rôle |
| --- | --- | --- |
| .github/workflows/ci.yml, jobs specs/resultat | Matrice des dix specs et synthèse globale | Checks visibles et résultat global toujours requis |
| tests/specifications.json | Correspondance specs/AUD/cas, couverture obligatoire | Définition lisible des cas du lot et des cas manquants |
| tests/reporters/specifications.mjs | Sélection, évaluation et validation commune du contexte | Même contrôle de SHA/complétude/prérequis pour synthèse et job |
| scripts/ci/catalog.mjs, report.mjs, spec-check.mjs | Catalogue enrichi et rapports par spec | Réutilise les résultats réels, sans les réexécuter artificiellement |
| tests/unit/specification-report.test.ts |15 cas d’outillage | Vérifie les refus de faux verts et le raccordement synthèse/CLI |
| tests/api/coherence.spec.ts et expenses.spec.ts |5 frontières API | Diagnostics privés et entrées monétaires/tri |
| tests/e2e/network.spec.ts et signup.spec.ts |2 frontières navigateur | Message de service occupé et panne de connexion après création |
| tests/support/database.ts et failure-server.ts | Déclencheurs fictifs et capture de diagnostics | Injection de panne limitée aux donnéesCI ; nettoyage garanti |
| docs/testing/README.md | Guide des contrôles et IDs supplémentaires | Lecture des résultats et limites de couverture |

#### Nouveau fonctionnement

PR → suites unitaires/API/navigateur complètes → artefacts du même run → contrôle de chaque spec. Le job sélectionne ses cas, compare les résultats aux titres/IDs attendus, vérifie SHA, portée et complétude des rapports, erreurs globales, prérequis et cas obligatoires. Tout manque empêche le vert ; le CLI et la synthèse emploient la même validation. Puis le résultat global exige aussi tous les contrôles fonctionnels. Une autre spec rouge reste visible dans le bilan global sans annuler à elle seule les cas réussis du lot considéré.

`npm run test:spec:report -- SPEC-01` lit les résultats disponibles et produit le bilan de la spec ; cette commande n’exécute pas les tests. Une branche de PR ancienne doit récupérer cette CI puis pousser ; relancer son ancien workflow ne change pas le code qui y est exécuté.

#### Validation et preuves

| Contrôle | Résultat réel | Preuve |
| --- | --- | --- |
| Installation/lint/types/build | exit0 chacun ;1 avertissement lint historique | [Campagne](../evidence/ci-specs-20261019/README.md) |
| Unitaires |21/21 réussis, dont15 contrôles du dispositif | [Unitaires](../evidence/ci-specs-20261019/unit.json) |
| API réelle |62 réussites/55 échecs/0 absent sur117 ; exit1 | [API](../evidence/ci-specs-20261019/api.json) |
| Navigateur réel |39 réussites/23 échecs/0 absent sur62 ; exit1 | [E2E](../evidence/ci-specs-20261019/e2e.json) |
| Synthèse complète |122 réussites/78 échecs/0 absent sur200 ; tous les échecs de type correction | [Agrégat](../evidence/ci-specs-20261019/issues.json) |
| Préfixes et snapshot avant tâche |22 fiches préservées, aucune ancienne IMPLEMENTATION réécrite | [Campagne](../evidence/ci-specs-20261019/README.md) |

#### Écarts et limites

Aucune correction applicative, modification UI, suppression/affaiblissement de test, ni fusion/modification des six PR. Les défauts et compléments sont décrits dans la revue ; la PR5 a aussi été vérifiée séparément sur ses huit scénarios d’inscription avec le harnais complété. Un job vert ne remplace pas la revue ni la preuve des mesures. Les cas futurs de pool/reprise/hexagone restent exigés lorsqu’absents ; SPEC-11/12 ne deviennent pas verts automatiquement. Aucun test du professeur fourni, aucune validation de compréhension de Maia inférée.

### 29 octobre 2026 — Priorité de l'erreur d'exécution sur l'état incomplet (CI-SPEC-014)

Statut : implémentée et vérifiée (outillage unitaire). Associée à SPEC-16.
Spec : [SPEC-16](../../specs/SPEC-16-erreurs-asynchrones-listes.md). Révision de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Réalisation : branche `feat/spec-16`, diff local du 29 octobre 2026.

#### Ce qui a été implémenté

Le test d'outillage `CI-SPEC-014` échouait (`incomplete` au lieu de `failed`) après l'ajout des huit cas unitaires `LIST-PANNE-001…008` étiquetés `[AUD-005]` pour SPEC-16. Diagnostic : `evaluateSpecification` évaluait l'état dans l'ordre `incomplete` puis `failed`, si bien qu'un ou plusieurs cas `not-run` faisaient primer `incomplete` et masquaient les erreurs d'exécution signalées (`errors`). Concrètement, CI-SPEC-014 fournit un rapport `api.json` d'un ancien SHA sans `unit.json` ; les cas unitaires de SPEC-01 devenaient `not-run`, donc le lot était annoncé `incomplete` alors que le SHA périmé aurait dû le rendre `failed`. Avant l'ajout des cas unitaires à AUD-005, SPEC-01 ne sélectionnait que des cas API, tous présents : `notRun` valait 0 et le défaut de priorité restait invisible.

Correction : une erreur d'exécution (SHA périmé, erreur globale de suite, prérequis qualité échoué, exécution partielle par issue) ou un cas en échec rend désormais le lot `failed` **en priorité**, avant les conditions d'état incomplet. L'absence de preuve sans erreur signalée (couverture obligatoire manquante, cas non exécutés seuls) reste `incomplete`. Aucune assertion de test affaiblie ou supprimée ; c'est le défaut de priorité de l'outillage qui est corrigé pour satisfaire l'assertion `CI-SPEC-014`.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| tests/reporters/specifications.mjs : `evaluateSpecification`, calcul de `status` | `failed || errors.length` évalué avant `incomplete` | Un résultat d'un SHA périmé ou une erreur globale ne peut plus être annoncé « incomplet » |

#### Nouveau fonctionnement

`summarize` calcule `specificationExecutionErrors` (dont le refus du SHA périmé) et les passe en `options.errors` à `evaluateSpecification`. Le nouvel ordre d'évaluation : si un cas est en échec ou si `errors` est non vide → `failed` ; sinon si aucun cas, couverture obligatoire manquante ou cas non exécutés → `incomplete` ; sinon `passed`. Le job `spec-check.mjs` et la synthèse partagent cette logique : tous deux refusent désormais ensemble un rapport d'ancien SHA (sortie 1, état `failed`).

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npx vitest run tests/unit/specification-report.test.ts` | CI-SPEC-001…015 verts | exit 0, 15/15 réussis (dont CI-SPEC-014 auparavant rouge) | Sortie locale 2026-10-29, Node 24.6.0 |
| Reproduction `summarize` avec `api.json` ancien SHA sans `unit.json` | SPEC-01 `failed` | `failed`, erreurs `unit/api : révision du rapport absente ou différente` conservées | Reproduction locale 2026-10-29 |
| `npm run typecheck` | exit 0 | exit 0 | Sortie locale 2026-10-29 |
| `npm run test:unit` (sur `feat/spec-16`) | CI-SPEC-014 et LIST-PANNE verts ; seuls les autres défauts LastChanges restent rouges | 70/81 réussis ; 11 échecs restants = cas correction des specs 13/14/15/17/18 non fusionnées sur cette branche | `reports/unit.json` |

#### Écarts et limites

La correction touche uniquement l'ordre d'évaluation de l'état ; les critères d'intégrité (SHA, erreur globale, prérequis, couverture) sont inchangés. Les autres cas `CI-SPEC` conservent leur comportement : couverture manquante et cas non exécutés sans erreur restent `incomplete`. Le contrôle par spec sur rapports hébergés reste à confirmer en CI.
