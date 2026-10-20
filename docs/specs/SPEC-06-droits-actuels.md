# SPEC-06 — Identité actuelle et périmètre des accès

## Identification

- Responsable : personne C. Branche : `feat/spec-06`.
- IDs : G10, AUD-006. Fiches : [G10](../audit/solutions-to-audit/G10-droits-role-actuel.md), [AUD-006](../audit/solutions-to-audit/AUD-006-manager-receipt-authorisation.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; implémentée et vérifiée sur le périmètre décrit le 19 octobre 2026 (voir Traçabilité et fin).
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

Les gardes utilisent la session et certaines lectures de reçus/affectations ne bornent pas assez le rôle actuel, le rattachement et l’entreprise. Références et lignes originales dans G10/AUD-006.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Session pour l’identité, DB pour rôle/entreprise actuels à chaque requête ; compte supprimé refusé. Toutes les listes/reçus/actions respectent la relation directe et la même entreprise, selon la matrice 2.

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
| src/lib/auth.ts et gardes serveur | identité actuelle réutilisable |
| Routes listes/reçus propriétaire, manager et RH | contrôles de périmètre |
| Routes métier protégées | rattachement au contrôle d’identité actuelle |

Coordination :

- Après SPEC-01 ; livrer l’interface d’identité aux personnes A/B/D.
- AUD-006 partage un propriétaire unique C avec SPEC-07 ; ajouts IMPLEMENTATION distincts par spec.
- D implémente les politiques DB correspondantes, sans dupliquer des règles contradictoires.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Changement de rôle/rattachement avec session conservée effectif à la requête suivante ; utilisateur supprimé refusé. |
| C2 | Manager : collaborateurs directs de même entreprise uniquement ; pas toute la descendance. |
| C3 | RH : managers racines de sa propre entreprise uniquement ; aucune permission globale ajoutée. |
| C4 | Reçus déjà décidés restent lisibles dans le périmètre autorisé ; mauvais rôle/autrui/entrepriseB refusés sans URL signée. |
| C5 | Gardes 401 manager/403 RH conservées ; pas de nouveau circuit de validation des notes RH ou employé sans manager. |

## Réalisation prévue

Ordre : Après SPEC-01 ; avant SPEC-07/08/09 et raccordement final OCR.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- DROIT-001…021, RECU, NAV-006/007/010 et AUTH ; ajouter rattachement changé, indépendance de la session et contrôles positifs correspondants.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | `test:issue -- G10` : 11/11 réussis. `test:issue -- AUD-006` : 31/32 réussis, seul échec AFF-011 (volet affectation, SPEC-07). Les 5 cas rouges de départ (DROIT-013, 014, 019, 020, 021) sont verts ; 13 cas ajoutés (DROIT-022 à 036), dont 8 échouent sur le code de `main` | Run local 2026-10-19 sur `c1af070`, DB et S3 jetables du harnais, Node 24.13.0 |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | exit 0 chacun (1 avertissement lint préexistant hors périmètre) | Run local 2026-10-19 |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | unit 6/6 ; api 79/125 ; e2e 38/60 ; bilan 123/191. Aucun cas vert sur `main` devenu rouge ; 5 cas rouge→vert ; 13 cas ajoutés verts ; les 68 échecs restants étaient déjà rouges sur `main` (autres lots) | Run local 2026-10-19 sur `a62e6c5`, Node 24.13.0 ; référence : CI de `main`, run `39037399251`. CI GitHub non exécutée pour la branche |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | `check-append-only.mjs check --snapshot …` : succès, 22 fiches | Snapshot capturé avant toute modification (2026-10-19) |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-06-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-06-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : [G10](../audit/solutions-to-audit/G10-droits-role-actuel.md#implementation) et [AUD-006, volet reçu](../audit/solutions-to-audit/AUD-006-manager-receipt-authorisation.md#implementation), ajoutées le 2026-10-19 (SHA de départ `7377486`, réalisation `6a8b971` et tests `c1af070`).
- Statut de fin : implémentée et vérifiée sur le périmètre décrit (suites complètes rapportées ci-dessus ; CI GitHub à confirmer à l'ouverture de la PR). C1 à C5 sont couverts par les cas ciblés. Le volet affectation d'AUD-006 relève de SPEC-07 (AFF-011 rouge attendu). Les pages serveur gardent le rôle de session pour l'affichage. Aucun plan de migration/retour arrière demandé.
