# SPEC-02 — Récupération des interfaces après erreur

> État courant au 29 octobre 2026 : correction intégrée dans main ; contrôle automatisé SPEC-02 réussi dans la [CI interne complète](https://github.com/maiabuc/expense-io/actions/runs/40945194492). Les préparations et mesures anciennes ci-dessous décrivent leurs dates et révisions, pas une correction encore à livrer.

## Identification

- Responsable : personne A. Branche : `feat/spec-02`.
- IDs : AUD-016. Fiches : [AUD-016](../audit/solutions-to-audit/AUD-016-erreurs-reseau-ui.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; implémentée le 18 octobre 2026 ; corrigée après revue le 19 octobre 2026 (message `error` sûr affiché, voir Traçabilité et fin).
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

expenses/page.tsx:58/81/115/146, PendingApprovalsPanel:28/44/56 et AdminConsole:44/54/74/93/105 contiennent12 appels fetch ; certaines exceptions laissent les actions ou chargements bloqués.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Chaque action libère son état actif dans tous les chemins, affiche une erreur française de repli si transport/JSON échoue, conserve les saisies et ne rejoue pas une écriture automatiquement.

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
| src/app/expenses/page.tsx | quatre appels et récupération du formulaire |
| src/components/PendingApprovalsPanel.tsx | trois appels manager |
| src/components/AdminConsole.tsx | cinq appels RH |

Coordination :

- Après SPEC-01. Intégrer avant le formatage date de SPEC-04 puis avant la reprise de SPEC-09.
- Les changements de couleurs, polices, positions et nouveaux écrans restent exclus.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Les12 appels sont vérifiés en succès, erreur HTTP, rejet réseau et réponse illisible si le corps est consommé. |
| C2 | Les neuf états actifs sont libérés ; les erreurs de lecture des reçus sont visibles. |
| C3 | Montant/date/description/fichier restent utilisables après échec ; aucune répétition automatique de POST/PUT. |

## Réalisation prévue

Ordre : Après SPEC-01 ; coordonner les trois écrans avec B puis D.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- NET-001…032 ; compléter les cas liés à la reprise et aux nouveaux statuts OCR lors de leur intégration.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | `npm run test:issue -- AUD-016` : NET-001…032 → 32/32 réussis | `reports/issues.json`, run local 2026-10-18 |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | exit 0 chacun (1 avertissement lint préexistant hors périmètre) | Sortie locale 2026-10-18 |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | unit 6/6 ; api 61/112 (AUD-016 non applicable côté api ; AUD-005 à 0/3 car SPEC-01 non mergée dans cette branche, pas une régression de SPEC-02) ; e2e 58/60 (AUD-016 32/32, 0 échec ; 2 échecs restants hors périmètre sur AUD-013/017) | `reports/issues.json` |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Vérifié : `check-append-only.mjs check --snapshot /tmp/arla-spec-02-gf.json` | Sortie locale 2026-10-18 |
| Correction 19 octobre : suites complètes + `test:spec:report -- SPEC-02` | Contrôle par spec vert, NET-033 compris | unit 21/21 ; SPEC-02 `passed` 33/33 ; autres specs identiques à la référence `main` | `reports/SPEC-02.json`, run local 2026-10-19 |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-02-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-02-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : [AUD-016](../audit/solutions-to-audit/AUD-016-erreurs-reseau-ui.md#implementation), ajoutée le 2026-10-18 (SHA de départ `7377486`, réalisation `16cb7ad`). Entrée de correction ajoutée le 2026-10-19 après la revue.
- Statut de fin : implémentée et vérifiée sur le périmètre décrit. Le 18 octobre, plusieurs chemins masquaient le champ `error` sûr (relevé par la revue du 19 octobre) ; corrigé le 19 octobre. Contrôle `SPEC-02 — tests du lot` vert en local (33/33). La sûreté du message affiché suppose SPEC-01 intégrée. Aucun plan de migration/retour arrière demandé.
