# SPEC-08 — Décisions atomiques manager et RH

## Identification

- Responsable : personne C. Branche : `feat/spec-08`.
- IDs : AUD-007. Fiches : [AUD-007](../audit/solutions-to-audit/AUD-007-decision-concurrency.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; implémentée et vérifiée sur le périmètre décrit le 19 octobre 2026 (voir Traçabilité et fin).
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

Les quatre routes approve/reject lisent pending puis écrivent séparément ; deux décisions simultanées peuvent toutes deux réussir et s’écraser.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Inclure autorisation actuelle et état pending dans l’écriture atomique. Après zéro ligne modifiée, distinguer ressource interdite404 et note autorisée non pending409, sans révéler l’état d’une note interdite.

## Contrats et invariants

Lire les [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md), puis les cinq références : [1 — contrats](../audit/01-contrats-implementation.md), [2 — permissions/états](../audit/02-permissions-et-transitions.md), [3 — responsabilités](../audit/03-perimetre-et-dependances.md), [4 — validation](../audit/04-reference-de-validation.md), [5 — lots/exclusions](../audit/05-lots-et-acceptation.md). L’[organisation commune](README.md) fixe la coordination.

| Situation | Attendu | Effet persistant autorisé |
| --- | --- | --- |
| Succès | Contrat public et parcours légitime préservés | Seulement l’effet prévu par ce lot |
| Refus | Statut et message du contrat ; aucune donnée technique publique | Aucune mutation interdite |
| Panne / répétition / concurrence | Critères spécifiques ci-dessous ; résultat incertain relu | Invariants d’état, droits et cohérence maintenus |

## Périmètre de changement

| Fichier ou module prévu | Responsabilité |
| --- | --- |
| src/app/api/manager/expense-notes/[id]/approve et reject | transition atomique |
| src/app/api/hr/expense-notes/[id]/approve et reject | même protection avec périmètre RH distinct |

Coordination :

- Après SPEC-06 et catalogue SPEC-01. D doit fournir l’état incomplete de SPEC-09 pour le test supplémentaire de refus.
- Préparer la transition pending atomique sans attendre tout le module ; vérification finale après schéma/RLS SPEC-09.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Décisions concurrentes opposées/identiques : une seule transition gagnante ; perdant409 sans écrasement. |
| C2 | Répétition séquentielle même ou autre décision409 ; décision initiale conservée. |
| C3 | Hors périmètre/absent404 ; gardes existantes ; pas d’autorisation plus large pour partager le code. |
| C4 | Incomplete non décidable ; contrôles exécutés sous compte applicatif effectif, pas seulement superuser. |

## Réalisation prévue

Ordre : Après SPEC-06 ; finaliser l’intégration avec SPEC-09.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- DEC-001…007 et NAV-011…014 ; ajouter incomplete, autorisation réévaluée à l’écriture et validation avec SPEC-09.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | AUD-007 : 21/21. DEC-005, 006, 007 (rouges de départ) verts ; 8 cas ajoutés (DEC-010 à 017), tous verts, dont 2 échouent sur les routes précédentes | Run local 2026-10-19 sur `1127b8e`, DB et S3 jetables, serveur sous le compte applicatif limité, Node 24.13.0 |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | exit 0 chacun | Run local 2026-10-19 |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | unit 22/22 ; api 142/158 ; e2e 61/62 ; bilan 225/242. Aucun cas vert sur la base `feat/spec-09` (214/234) devenu rouge ; 3 cas rouge→vert ; les 17 échecs restants étaient rouges sur cette base (SPEC-03 : OCR-003, 004 ; SPEC-05 : INS-006 ; SPEC-07 : AFF-001 à 008, 011, 016 à 019 ; SPEC-10 : SEED-002) | `reports/issues.json` ; CI GitHub non exécutée |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | `check-append-only.mjs check --snapshot …` : succès, 22 fiches | Snapshot capturé sur `1746cdb` avant modification |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-08-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-08-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : [AUD-007](../audit/solutions-to-audit/AUD-007-decision-concurrency.md#implementation), ajoutée le 2026-10-19 (SHA de départ `1746cdb`, réalisation `4153242`, tests `1127b8e`).
- Statut de fin : implémentée et vérifiée sur le périmètre décrit, y compris l'état `incomplete` et le compte applicatif limité de SPEC-09. C1 par DEC-005 à 007 et 014 ; C2 par DEC-001, 002, 010 ; C3 par DEC-003, 004, 013, 016, 017 ; C4 par DEC-011 et 012. Limite : relation modifiée pendant l'attente du verrou de ligne non réévaluée (voir l'entrée IMPLEMENTATION). CI GitHub non exécutée. Aucun plan de migration/retour arrière demandé.

## Mise à jour du 20 octobre 2026 — intégration avec `feat/spec-09` et `main`

- `feat/spec-09` (`eabdb41`, qui contient `main` `5dc5024`) est fusionné dans `feat/spec-08` (fusion `6069039`, départ `da21c48`). Aucun changement de code : la vérification avec `incomplete` et le compte applicatif limité (DEC-011, DEC-012) est refaite sur la version à jour de SPEC-09.
- Résultats sur `6069039` : unit 41/41, api 155/169, e2e 64/64 ; AUD-007 21/21. Les 14 rouges de l'API relèvent de SPEC-07 (AFF-001 à 008, 011, 016 à 019) et de SPEC-10 (SEED-002), non intégrées dans cette branche.
- `DEC-008`, attendu par `tests/specifications.json`, n'existe pas (cas équivalent : DEC-011) : statut « incomplete » attendu, non traité.
- Limite documentée dans la fiche AUD-007 : une relation modifiée pendant l'attente du verrou de ligne n'est pas réévaluée. Relecture de la concurrence : non faite.
