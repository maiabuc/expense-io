# SPEC-11 — Performance des listes : décision conditionnée aux mesures

## Identification

- Responsable : personne B. Branche : `feat/spec-11`.
- IDs : AUD-022. Fiches : [AUD-022](../audit/solutions-to-audit/AUD-022-optimisation-simple-listes.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; aucune correction réalisée par cette rédaction.
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

Les listes ne sont pas bornées. Les mesures précédentes n’ont pas démontré de gain HTTP par l’index expérimental ; aucun index de performance définitif n’est choisi.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Mesurer après stabilisation du code corrigé. Retenir seulement une optimisation simple, utile et compatible ; si aucun bénéfice suffisant, documenter la conservation de l’existant.

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
| Routes de listes propriétaire/manager/RH | mesures des mêmes requêtes |
| Migrations additionnelles | uniquement index minimaux si justifiés par les résultats |

Coordination :

- Après SPEC-04/06/09 ; ne pas comparer des règles d’accès ou contenus différents.
- Aucune pagination, suppression de lignes, changement de total, cache ou nouvelle infrastructure autorisé.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Comparer mêmes données/version/volumes/permissions, plans SQL et index effectifs. |
| C2 | Mesurer SQL et HTTP, taille de réponse, coût d’écriture ; garder valeurs brutes et limites de la distribution. |
| C3 | Mêmesnotes/ordres/total/UI ; aucun gain SQL isolé présenté comme gainutilisateur. |
| C4 | Ne rien changer si le gain ne justifie pas le coût ; une conclusion négative documentée est recevable. |

## Réalisation prévue

Ordre : Conditionnel, après corrections fonctionnelles ; aucune optimisation complexe autorisée.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Mesurer, puis réaliser seulement une optimisation simple justifiée ; sinon consigner la conservation de l’existant.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- Campagne de mesure comparable et contrôles liste/permissions de référence ; horsgate rapide, aucun seuil arbitraire.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Mesures comparables + contrôles de référence listes/permissions | Gain utile démontré ou conservation de l’existant justifiée | Non exécuté pour cette spec | Pas de test AUD-022 exécutable dédié actuellement |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | Non exécuté pour cette spec | Commandes existantes |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | Non exécuté pour cette spec | Rouge historique distingué des régressions ; aucun merge final tant que requis rouge |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Non exécuté pour l’implémentation | Snapshot propre à cette intervention |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-11-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-11-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : aucune par cette préparation ; à ajouter lors de la réalisation réelle.
- Statut de fin : préparée, pas implémentée. Relire les critères et joindre les preuves avant clôture ; aucun plan de migration/retour arrière demandé.
