# SPEC-15 — Normalisation du montant sans recherche quadratique

## Identification

- Objet : retirer les zéros décimaux terminaux en temps linéaire sans changer les montants ou empreintes.
- Lot et ID : SPEC-15, AUD-029 ; responsable non attribué.
- Statut : préparée, non implémentée. Maia demande la fiche et spec LastChanges, puis précise qu'un nouvel AUD est requis au lieu du rattachement à AUD-003.
- Fiche : [AUD-029 LastChanges](../audit/solutions-to-audit/AUD-029-normalisation-montant-LastChanges.md).
- Source historique : 265924bc7274047989e708ab635c2854d376230f ; constat actuel/départ : 2e9e30cf9f21a240c1213da6baec7f4c61618175.
- Travail local préservé : lockfile préexistant modifié, documents de l'audit SonarQube et specs de cette session. Aucun code applicatif changé.

## Problème et parcours actuel

POST de soumission authentifié → validation du montant → empreinteContenu → montantCanonique → suppression des zéros de fraction avec /0+$/ → recherche/réservation de demande et reprise. Le montant canonique est aussi utilisé par l'adaptateur PostgreSQL. Des fractions valides constituées de nombreux zéros suivis de 1 déclenchent des recherches répétées. Voir mesures indicatives et limites dans AUD-029.

## Résultat attendu et parcours cible

Conserver ce parcours. Dans montantCanonique, initialiser un index en fin de fraction, le reculer tant que le caractère précédent est 0, puis conserver la tranche avant cet index. Ne modifier ni la suppression des zéros de partie entière ni le format canonique. Le travail est au plus linéaire dans la longueur, sans boucle imbriquée, nouvelle limite métier ou conversion flottante.

## Contrats et invariants

Références : [contrats 1, montant et comparaison avant arrondi](../audit/01-contrats-implementation.md), [permissions 2](../audit/02-permissions-et-transitions.md), [responsabilités 3](../audit/03-perimetre-et-dependances.md), [validation 4, AUD-003/014](../audit/04-reference-de-validation.md), [lots et fin 5](../audit/05-lots-et-acceptation.md).

| Situation | Résultat attendu | Effet persistant |
| --- | --- | --- |
| Montants équivalents avant arrondi | Même montant canonique et même empreinte qu'avant | Même demande retrouvée |
| Montants distincts avant arrondi, même arrondi DB | Empreintes distinctes, conflit conservé si même clé | Aucun écrasement |
| Ancienne demande reprise | Comparaison avec empreinte/montant canonique persistés conservée | Aucun doublon ou nouvelle empreinte substituée |
| Fraction longue valide | Même acceptation et résultat, calcul linéaire | Même règle d'arrondi DB |
| Refus d'entrée, droits, décision déjà prise | Contrats existants inchangés | Aucun droit ou effet nouveau |

## Périmètre de changement

| Fichier prévu | Rôle | Coordination |
| --- | --- | --- |
| src/modules/soumission/empreinte.ts | Remplacer la suppression terminale par parcours arrière | Export et format canonique inchangés |
| tests/unit/soumission.test.ts | Cas d'équivalence, différence et grandes fractions | Garder les tests existants ; nouveaux titres [AUD-029][CANON-xxx][correction] |
| tests/api/soumission.spec.ts si nécessaire | Reprise sur empreinte produite par l'ancienne version | Fixtures isolées, pas de réécriture de l'historique réel |
| tests/specifications.json | Ajouter SPEC-15 et cas réellement créés | Ne pas réattribuer les tests AUD-003 existants |
| AUD-029, spec et journal | Résultats et entrée IMPLEMENTATION lors de la correction | Préfixes historiques intacts |

Exclus : borne du nombre de décimales, arrondi/précision, schéma DB, RLS, stockage, autres regex et UI. AUD-003 et SPEC-09 sont des références de compatibilité ; le nouvel ID de suivi est AUD-029.

## Critères d'acceptation

| ID | Condition | Vérification |
| --- | --- | --- |
| C1 | Résultat canonique historique conservé | CANON-001, corpus court comparé à l'ancienne fonction, zéros, point absent/fraction vide et décimales internes |
| C2 | Équivalence 012.500/12.5, .5/0.5, 5./5 et distinction 12.345/12.35 | CANON-002, assertions explicites |
| C3 | Nombreux zéros suivis de 1 conservés, zéros terminaux entièrement retirés | CANON-003, grandes fractions synthétiques sans temps machine imposé |
| C4 | empreinteContenu identique à celle d'avant correction | CANON-004, empreintes de référence produites sur le code actuel avant modification |
| C5 | Reprise utilisant une ancienne empreinte retrouve la même note | CANON-005, scénario réel du harnais avec même clé et formes décimales équivalentes |
| C6 | Coût linéaire par construction et mesures compatibles | Revue du parcours ; protocole avant/après isolé borné, mêmes entrées et Node, répétitions et sorties brutes |
| C7 | Référence et contrats inchangés | Tests AUD-003/AUD-014, lint/types/build, API/E2E et bilan sans nouvelle régression |

## Réalisation prévue

Capturer les fiches avant l'implémentation. Produire les références d'empreintes et tests avant modification, remplacer la seule opération concernée, puis inscrire les cas effectifs dans le manifeste. Comparer les deux versions avec processus à délai maximum, sans faire tourner un ancien motif non borné dans la suite normale. Préserver toutes les assertions existantes. Ajouter ensuite IMPLEMENTATION à AUD-029 et actualiser la spec avec révision et résultats réels.

## Validation à exécuter puis résultats réels

| Commande / scénario | Prévu | Réel à la préparation | Limite |
| --- | --- | --- | --- |
| Microbenchmark de présentation | Caractériser le coût actuel | 4 appels, fractions inchangées ; sorties observées dans la session | Pas de preuve HTTP ni fichier brut, mesures indicatives |
| Contrôle append-only avec snapshot de préparation | Préfixes conservés | Exit 0 ; 22 fiches historiques et snapshot de 24 fiches vérifiés | Documentation seulement |
| npm run ci:docs | Catalogue et manifeste cohérents | Non exécuté | Après création des tests |
| npm run lint / npm run typecheck / npm run build | Réussite | Non exécutés | Code inchangé |
| npm run test:unit | Référence et nouveaux cas verts | Non exécuté | Assertions existantes conservées |
| npm run test:issue -- AUD-029, puis AUD-003 et AUD-014 | Sélections non vides et cas verts | Non exécuté | Les tests AUD-029 restent à créer |
| npm run test:api / npm run test:e2e / npm run test:report | Reprise/arrondi et référence conservés | Non exécutés | Services jetables, deux entreprises et plusieurs rôles |
| npm run test:spec:report -- SPEC-15 | Bilan correspondant aux cas réels du même SHA | Non exécuté | Après manifeste ; cette commande ne lance pas les tests |
| Mesures avant/après | Même résultat et amélioration sur entrées adverses | Non exécutées | Pas de gain annoncé avant réalisation |

## Traçabilité et fin

Snapshot : `/tmp/arla-new-aud-028-029-20261026.json` (24 fiches au début de la correction documentaire). Aucun ajout de réalisation applicative dans AUD-003 ; celui-ci n'a pas été modifié par le rattachement interrompu. Nouvelle fiche AUD-029 sans IMPLEMENTATION tant que la correction est absente. Diff documentaire local du 26 octobre, aucun commit créé. Journal et index actualisés. Restant : implémentation et tous les critères de correction ; aucune maîtrise individuelle inférée de l'accord.
