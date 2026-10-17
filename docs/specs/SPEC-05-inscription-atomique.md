# SPEC-05 — Inscription atomique et convention de domaine conservée

## Identification

- Responsable : personne B. Branche : `feat/spec-05`.
- IDs : AUD-013, AUD-019. Fiches : [AUD-013](../audit/solutions-to-audit/AUD-013-signup-consistency.md), [AUD-019](../audit/solutions-to-audit/AUD-019-inscription-domaine.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; aucune correction réalisée par cette rédaction.
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

src/app/actions/auth.ts:44–69 crée entreprise puis utilisateur par deux écritures indépendantes ; une panne peut laisser l’entreprise sans premier RH.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Créer entreprise et premier RH sur une connexion et transaction communes ; commit avant connexion automatique. Le domaine existant continue à créer un employé selon la convention actuelle.

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
| src/app/actions/auth.ts | signup et transactions |
| Écran signup | uniquement adaptation nécessaire du contrat existant |

Coordination :

- ADR-0001 et contrat inscription font référence. Peut avancer en parallèle de SPEC-04.
- Coordonner le compte DB effectif avec SPEC-09 ; ne pas ajouter invitation, preuve de possession du domaine ou changement de rôles.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Échec de création RH annule seulement les écritures de la tentative, sans entreprise orpheline. |
| C2 | Concurrence même domaine : un premier RH et un employé, pas deux RH ni entreprise dupliquée. |
| C3 | Email déjà pris et champs invalides refusés sans doublon ; panne de connexion après commit conserve le compte. |
| C4 | AUD-019 reste une limite pédagogique conservée, pas un défaut à corriger. |

## Réalisation prévue

Ordre : Indépendant après accord sur les helpers ; revalider avec les droits DB de SPEC-09.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- INS-001…007 ; ajouter échec de connexion après commit et assertions de transaction.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | Non exécuté pour cette spec | Ajouter comptes, environnement et SHA |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | Non exécuté pour cette spec | Commandes existantes |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | Non exécuté pour cette spec | Rouge historique distingué des régressions ; aucun merge final tant que requis rouge |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Non exécuté pour l’implémentation | Snapshot propre à cette intervention |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-05-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-05-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : aucune par cette préparation ; à ajouter lors de la réalisation réelle.
- Statut de fin : préparée, pas implémentée. Relire les critères et joindre les preuves avant clôture ; aucun plan de migration/retour arrière demandé.
