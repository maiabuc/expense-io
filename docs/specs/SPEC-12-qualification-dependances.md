# SPEC-12 — Qualification des dépendances avant mise à jour choisie

## Identification

- Responsable : personne A. Branche : `feat/spec-12`.
- IDs : AUD-023. Fiches : [AUD-023](../audit/solutions-to-audit/AUD-023-dependances.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; qualification réalisée le 18 octobre 2026, révisée après revue le 19 octobre 2026 ; aucune mise à jour sélectionnée (voir Traçabilité et fin).
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

Le rapport npm historique indique 8 packages, mais les chaînes d’alertes ne constituent pas 8 exploits. Aucune version cible de correction n’a été sélectionnée.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Examiner les avis et chemins réellement utilisés, proposer une correction ciblée compatible ou une justification de conservation ; une mise à jour est un changement distinct à sélectionner avant réalisation.

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
| package.json et package-lock.json | inventaire des versions, sans modification automatique |
| docs/audit/evidence | qualification par avis, usages et limites |
| Rapport informatif npm de la CI | conserver la collecte et son statut réel |

Coordination :

- Qualification peut avancer indépendamment ; tests de compatibilité de toute cible après stabilisation des lots.
- Pas de npm audit fix/force, downgrade majeur automatique, ni seuil bloquant nouveau sans décision.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Sources primaires et dates des avis, dépendances directes/transitives et usage effectif identifiés. |
| C2 | Applicabilité/exploitabilité/incertitude distinguées ; aucun secret dans les preuves. |
| C3 | Toute version cible proposée garde Next/eslint-config-next cohérents et liste les tests à relancer. |
| C4 | Aucune mise à jour réalisée dans ce seul lot de qualification ; conserver les alertes non traitées et leurs motifs. |

## Réalisation prévue

Ordre : Qualification autorisée ; choix et implémentation d’une mise à jour restent distincts.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Rédiger la qualification et la proposition ciblée ; ne modifier aucune dépendance avant sélection de cette proposition.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- npm audit --json en copie isolée ; recherches et qualification, pas d’exploitation improvisée. Après mise à jour distincte : npm ci/lint/types/build et parcours complets.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| npm audit --json et qualification des avis | Compte réel, applicabilité argumentée et versions proposées | 8 entrées de paquets dans le rapport, couvrant 10 identifiants GHSA distincts ; qualification révisée le 19 octobre : exposition en développement, expositions conditionnelles CI et incertitudes de production | [qualification.md](../audit/evidence/dependances-20261018/qualification.md), [audit.json](../audit/evidence/dependances-20261018/audit.json) |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | exit 0 chacun (1 avertissement lint préexistant hors périmètre) ; build confirme 0 page SSG/ISR | Sortie locale 2026-10-18 |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | Non ré-exécuté : aucun code applicatif modifié par ce lot de qualification, rien à vérifier en régression | `package.json`/`package-lock.json` inchangés (`git status`) |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Vérifié : `check-append-only.mjs check --snapshot /tmp/arla-spec-12-gf.json` | Sortie locale 2026-10-18 |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-12-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-12-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : [AUD-023](../audit/solutions-to-audit/AUD-023-dependances.md#implementation), ajoutée le 2026-10-18 (qualification documentaire, aucun commit de code applicatif). Entrée de révision ajoutée le 2026-10-19 après la revue.
- Statut de fin : qualification révisée le 19 octobre. Les conclusions du 18 octobre étaient trop absolues : l'exposition en développement était écartée alors que le dépôt utilise `next dev`, et le « risque nul » attribué à l'outillage ne tenait pas compte de la CI. Les trois contextes sont désormais séparés et chaque conclusion est qualifiée d'observation, d'hypothèse ou d'incertitude. `next@16.4.2` est proposée en P2 pour l'exposition en développement. Aucune mise à jour réalisée (C4). SPEC-12 reste en revue humaine (`manual-review`).
