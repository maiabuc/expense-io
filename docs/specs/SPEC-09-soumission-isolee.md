# SPEC-09 — Soumission récupérable, RLS et module hexagonal simple

## Identification

- Responsable : personne D. Branche : `feat/spec-09`.
- IDs : AUD-003, AUD-009. Fiches : [AUD-003](../audit/solutions-to-audit/AUD-003-receipt-consistency.md), [AUD-009](../audit/solutions-to-audit/AUD-009-database-company-isolation.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; aucune correction réalisée par cette rédaction.
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

expense-notes/route.ts:56–110 insère puis upload puis finalise hors contexte utilisateur ; panne S3 laisse pending sans reçu. Le compte Docker peut contourner RLS et les politiques RH omettent la société. Orchestration SQL/S3 dans la route.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

La route authentifie/adapte puis appelle une unique opération soumettre/reprendre. Application indépendante Next/pg/AWS, ports métier et adaptateurs réels/test. Réserver incomplete, vérifier/écrire reçu, finaliser pending sous propriétaire et contexte RLS. Reprise même demande, état cohérent après panne.

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
| Module de soumission, ports et adaptateurs PostgreSQL/S3 | ADR-0002 |
| src/app/api/expense-notes/route.ts, lib/db.ts et storage.ts | adaptation et opérations bornées |
| Migrations nouvelles expense_notes/RLS ; compte applicatif limité et compte de préparation séparé | Définir les opérations et contraintes du lot |
| src/app/expenses/page.tsx | reprise dans le formulaire existant |
| Harnais CI DB | prouver privilèges du vrai compte applicatif ; fixtures isolées avec compte de préparation si requis |

Coordination :

- Après SPEC-01/02/04/06. Coordination obligatoire avec SPEC-08 pour incomplete et SPEC-10 pour seed.
- SPEC-04 fournit les validations pures ; ne pas réintroduire parseFloat, double grammaire ou ancien POST parallèle.
- C gère users/hiérarchie ; D coordonne le schéma et l’accès DB commun. C relit RLS/autorisation et D relit les décisions atomiques.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Idempotency-Key UUID optionnel, lié durablement à utilisateur/note ; nouvelle dépense même contenu reste distincte si nouvelle clé. Legacy sans clé → 201 conservé. |
| C2 | Même clé/contenu différent → 409 ; même demande finalisée → 200 avec décision actuelle ; première finalisation → 201 ; pas de reset vers pending. |
| C3 | Une exécution active par demande garantie en DB ; concurrent → 409 sans upload supplémentaire ; réservation/jeton/expiration sûrs même après arrêt ou résultat incertain. |
| C4 | Panne upload/finalisation conserve incomplete récupérable ; relecture après résultat incertain ; objet réutilisé seulement après empreinte/taille/contenu vérifiés. |
| C5 | Rechargement : clé en sessionStorage par compte et requestId seulement pour notes incomplete du propriétaire ; reçu absent permis seulement si objet vérifié. |
| C6 | Reprise dans l’UI existante ; incomplete en français, exclue du total métier et des décisions ; pas de nouvel écran ou nettoyage automatique. |
| C7 | Compte applicatif non superuser/non BYPASSRLS ; politiques mêmes rôle/entreprise/relation ; contexte transactionnel sans fuite de pool. |
| C8 | Finalisation propriétaire bornée permise, auto-approbation et modification libre de montant/propriétaire/statut interdites ; aucune politique permissive parallèle. |
| C9 | Module sans imports Next/pg/AWS ; injections par paramètres ; pas de réécriture hexagonale générale ; transactions courtes hors upload. |

## Réalisation prévue

Ordre : Chantier le plus lourd ; commencer conception et tests en parallèle, intégrer après validations/identité/UI, puis revalider SPEC-08/10.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- PANNE-001, RLS-001…005 et références dépôt/liste/reçus. Ajouter tous les cas différés AUD-003 : reprise/réponse perdue/objet orphelin/concurrence/contenu différent/legacy et contrats adaptateurs + navigateur.
- Ajouter contrôles SQL directs sur toutes les colonnes protégées et processus réel sous compte applicatif limité ; les fixtures admin ne prouvent pas RLS.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | Non exécuté pour cette spec | Ajouter comptes, environnement et SHA |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | Non exécuté pour cette spec | Commandes existantes |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | Non exécuté pour cette spec | Rouge historique distingué des régressions ; aucun merge final tant que requis rouge |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Non exécuté pour l’implémentation | Snapshot propre à cette intervention |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-09-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-09-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : aucune par cette préparation ; à ajouter lors de la réalisation réelle.
- Statut de fin : préparée, pas implémentée. Relire les critères et joindre les preuves avant clôture ; aucun plan de migration/retour arrière demandé.
