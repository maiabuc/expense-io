# SPEC-01 — Erreurs API sûres et diagnostics internes

Mise à jour du 20 octobre 2026 : correction complémentaire des secrets JSON/cités dans les diagnostics, PANNE-008/009 ajoutés. [Ajout AUD-005](../audit/solutions-to-audit/AUD-005-public-errors.md#2026-10-20--spec-01-secrets-json-et-valeurs-citées) et [preuves](../audit/evidence/spec01-fix-20261020/checks.json). Lint/types/build et 21 unitaires réussis ; contrôle SPEC-01 9/9 sur suite API complète (71/122, 51 échecs hors lot, aucune référence en échec). CI distante à confirmer après push ; aucune fusion applicative vers main avant correction. Les anciens comptes ci-dessous décrivent leurs révisions historiques.

## Identification

- Responsable : personne A. Branche : `feat/spec-01`.
- IDs : AUD-005. Fiches : [AUD-005](../audit/solutions-to-audit/AUD-005-public-errors.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; implémentée le 18 octobre 2026 ; corrigée après revue le 19 octobre 2026 (journal interne expurgé, voir Traçabilité et fin).
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

src/lib/errors.ts:1–6 expose le message et la stack de l’exception. Les routes le réutilisent. Une panne stockage/SQL divulgue donc des détails au client.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

La route traduit les erreurs attendues et inattendues en statut et message contrôlés ; les journaux internes structurés gardent code, operation, status et diagnostic sûr. Le client reçoit error:string, sans stack ni code technique imposé.

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
| src/lib/errors.ts | réponse et journalisation communes |
| Routes API | adaptation des erreurs retenues, sans refonte des succès |

Coordination :

- Catalogue commun à publier avant SPEC-02/03/04/06/07/09 ; chaque propriétaire adapte ensuite ses routes.
- Ne pas changer le secret Auth.js ni les gardes 401/403 pour uniformiser le code.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Une panne DB/S3 donne une réponse sûre sans SQL brut/stack, avec error:string. |
| C2 | Un diagnostic interne structuré est présent avec code/opération/statut, sans cookie, secret, URL signée ou contenu de reçu. |
| C3 | Les refus métier gardent leurs statuts ; aucune transformation universelle en500. |

## Réalisation prévue

Ordre : Avant les autres corrections, en publiant d’abord le mécanisme commun.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- PANNE-002/003 et NOTE-022 ; compléter les autres familles d’erreurs des contrats.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | `npm run test:issue -- AUD-005` : PANNE-002, PANNE-003, NOTE-022 → 3/3 réussis | `reports/issues.json`, run local 2026-10-18 |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | exit 0 chacun (1 avertissement lint préexistant hors périmètre) | Sortie locale 2026-10-18 |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | unit 6/6 ; api 64/112 (0 échec AUD-005, 48 échecs hors périmètre sur AUD-003/004/006/007/008/009/014/015/018/020/021/G10/G14) ; e2e 38/60 (0 échec AUD-005, 22 échecs hors périmètre sur AUD-013/016/017) | `reports/issues.json` ; rouge historique distingué des régressions, aucune assertion retirée |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Vérifié : `check-append-only.mjs check --snapshot /tmp/arla-spec-01-gf.json` | Sortie locale 2026-10-18 |
| Correction 19 octobre : suites complètes + `test:spec:report -- SPEC-01` | Contrôle par spec vert, PANNE-004 compris | unit 21/21 ; api 69/120 ; e2e 39/62 ; SPEC-01 `passed` 7/7 (PANNE-002…007, NOTE-022) ; autres specs identiques à la référence `main` | `reports/SPEC-01.json`, run local 2026-10-19 |
| Garde append-only (correction) | Préfixes conservés, entrée du 18 intacte | Vérifié : `check --snapshot /tmp/arla-spec-01-review-gf.json` | Sortie locale 2026-10-19 |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-01-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-01-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : [AUD-005](../audit/solutions-to-audit/AUD-005-public-errors.md#implementation), entrée du 2026-10-18 (départ `7377486`, réalisation `a8411b9`) puis entrée de correction du 2026-10-19 (départ `ef32e97`).
- Statut de fin : implémentée et vérifiée sur le périmètre décrit. Le 18 octobre, C2 n'était pas satisfait (secrets recopiés dans le journal, relevé par la revue du 19 octobre) ; corrigé le 19 octobre. Contrôle `SPEC-01 — tests du lot` vert en local : 7/7 cas AUD-005 dont PANNE-004, aucune couverture manquante. Aucun plan de migration/retour arrière demandé.
