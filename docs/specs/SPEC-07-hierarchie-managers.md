# SPEC-07 — Affectations valides et hiérarchie sans boucle

## Identification

- Responsable : personne C. Branche : `feat/spec-07`.
- IDs : AUD-006, AUD-020, AUD-021. Fiches : [AUD-006](../audit/solutions-to-audit/AUD-006-manager-receipt-authorisation.md), [AUD-020](../audit/solutions-to-audit/AUD-020-validation-affectation.md), [AUD-021](../audit/solutions-to-audit/AUD-021-boucles-managers.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; aucune correction réalisée par cette rédaction.
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

src/app/api/hr/users/[id]/manager/route.ts:5–62 peut confondre contenu invalide/retrait, et ne protège pas tous les cycles ou affectations concurrentes.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Vérifier le JSON, la cible et la chaîne de managers ; sérialiser contrôle et écriture dans une transaction, par verrou de la ligne companies concernée. Null explicite est le seul retrait volontaire.

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
| src/app/api/hr/users/[id]/manager/route.ts | validation et transaction |
| Migrations additionnelles concernant users | contraintes nécessaires |
| AdminConsole.tsx | contrat existant avec récupération SPEC-02 |

Coordination :

- Après SPEC-01/06. Utiliser le même ordre de verrous pour tous les chemins d’affectation.
- C réserve les migrations users ; D réserve expense_notes/RLS. Noms de migrations uniques et revue croisée avant intégration.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | JSON illisible, non objet, champ absent et valeur invalide →400, messages distincts et aucune mutation. |
| C2 | Null explicite retire le manager ; UUID valide désigne un manager actuel de la même entreprise ; cible autorisée. |
| C3 | Auto-affectation, cycles à deux/longs et création concurrente de cycle refusés ; liens valides conservés. |
| C4 | Cible hors périmètre404 ; manager interdit/cycle409 selon contrat1 ; aucune mutation après refus. |

## Réalisation prévue

Ordre : Après SPEC-06 ; peut être préparé pendant les autres lots, sans modification concurrente de la route par une autre personne.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- AFF-001…019 et NAV-015 ; PostgreSQL réel pour transactions/concurrence et test positif après refus.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | Non exécuté pour cette spec | Ajouter comptes, environnement et SHA |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | Non exécuté pour cette spec | Commandes existantes |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | Non exécuté pour cette spec | Rouge historique distingué des régressions ; aucun merge final tant que requis rouge |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Non exécuté pour l’implémentation | Snapshot propre à cette intervention |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-07-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-07-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : aucune par cette préparation ; à ajouter lors de la réalisation réelle.
- Statut de fin : préparée, pas implémentée. Relire les critères et joindre les preuves avant clôture ; aucun plan de migration/retour arrière demandé.
