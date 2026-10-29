# SPEC-10 — Seed complet et relançable sans perte des décisions

> État courant au 29 octobre 2026 : correction intégrée dans main ; contrôle automatisé SPEC-10 réussi dans la [CI interne complète](https://github.com/maiabuc/expense-io/actions/runs/40945194492). Les préparations et mesures anciennes ci-dessous décrivent leurs dates et révisions, pas une correction encore à livrer.

## Identification

- Responsable : personne D. Branche : `feat/spec-10`.
- IDs : AUD-018. Fiches : [AUD-018](../audit/solutions-to-audit/AUD-018-reprise-seed.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; implémentée et vérifiée sur le périmètre décrit le 19 octobre 2026 (voir Traçabilité et fin).
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

scripts/seed.mjs:58–94 ne répare pas correctement tous les états où la note existe mais le reçu manque ; une relance peut laisser les démonstrations incomplètes.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Relire note, référence et objet, réparer la même note et le reçu selon état réel, conserver approved/rejected. Sortie réussie seulement si les données attendues sont complètes.

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
| scripts/seed.mjs | reprise et vérificationDB/S3 |
| Tests seed et fixtures | adaptation au schéma de SPEC-09 sans supprimer les scénarios |

Coordination :

- Après SPEC-09 pour schéma/états/droits ; même personneD pour éviter une seconde orchestration contradictoire.
- Conserver npm run seed et les commandes README ; aucune exécution sur services ou données utilisateur.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Premier lancement puis second : données complètes et aucun doublon. |
| C2 | PanneS3 puis relance répare la même note ; objet présent/référence absente et inverse couverts. |
| C3 | Décisions existantes conservées ; échec explicite si réparation impossible, pas de faux succès. |
| C4 | Compatible avec compte de préparation et invariants du nouveau schéma sans ouvrir un UPDATE propriétaire général. |

## Réalisation prévue

Ordre : Après schéma et contrats SPEC-09 ; exécution réelle isolée.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- SEED-001…003 ; ajouter variantes objet présent/référence absente et absence objet/référence présente, exécuter script original réellement en DB/S3 CI.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | AUD-018 : 10/10. SEED-002 (rouge de départ) vert ; 7 cas ajoutés (SEED-004 à 010) exécutant le vrai `scripts/seed.mjs`, dont 6 échouent sur le seed précédent | Run local 2026-10-19, DB et S3 jetables, Node 24.13.0 |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | exit 0 chacun | Run local 2026-10-19 |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | unit 22/22 ; api 139/157 ; e2e 61/62 ; bilan 222/241. Aucun cas vert sur la base `feat/spec-09` (214/234) devenu rouge ; SEED-002 rouge→vert ; les 19 échecs restants étaient rouges sur cette base (SPEC-03 : OCR-003, 004 ; SPEC-05 : INS-006 ; SPEC-07 : AFF-001 à 008, 011, 016 à 019 ; SPEC-08 : DEC-005 à 007) | `reports/issues.json` ; CI GitHub non exécutée |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | `check-append-only.mjs check --snapshot …` : succès, 22 fiches | Snapshot capturé sur `1746cdb` avant modification |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-10-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-10-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : [AUD-018](../audit/solutions-to-audit/AUD-018-reprise-seed.md#implementation), ajoutée le 2026-10-19 (SHA de départ `1746cdb`).
- Statut de fin : implémentée et vérifiée sur le périmètre décrit. C1 par SEED-001 et 010 ; C2 par SEED-002, 004, 005, 008, 009 ; C3 par SEED-003, 006, 007 ; C4 par l'exécution du script sous le compte de préparation sur le schéma de SPEC-09, sans UPDATE propriétaire ajouté (politiques inchangées, RLS-013). Limites : pas de verrou contre deux lancements simultanés ; CI GitHub non exécutée. Aucun plan de migration/retour arrière demandé.

## Mise à jour du 20 octobre 2026 — intégration avec `feat/spec-09` et `main`

- `feat/spec-09` (`eabdb41`, qui contient `main` `5dc5024`) est fusionné dans `feat/spec-10` (fusion `80319af`, départ `f08f8a7`). Aucun changement de code ; `scripts/seed.mjs` conserve son identification propre de la note (décision D3 : la spec n'exige pas la clé de demande).
- Résultats sur `80319af` : unit 41/41, api 152/168, e2e 64/64 ; AUD-018 10/10 ; statut SPEC-10 « passed ». Les 16 rouges de l'API relèvent de SPEC-07 et SPEC-08, non intégrées dans cette branche.
- Limites : pas de verrou contre deux lancements simultanés ; une note `incomplete` laissée par un seed interrompu n'est pas reprenable depuis l'écran. Relecture croisée : non faite.

## Vérification du 22 octobre 2026

Code combiné `7c7703c` : unit 42/42, API 194/194, E2E 66/66, bilan 302/302 ; SPEC-01 à SPEC-10 passed, SPEC-10 10/10. Lint/types/build/ci:docs réussis. Le seed est conservé ; ajout dans AUD-018 des résultats et des quatre repères historiques altérés par f08f8a7, sans nouvelle modification du texte reçu. Limites de concurrence et de reprise UI du seed inchangées.
