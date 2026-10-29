# AUD-029 — Coût de suppression des zéros décimaux du montant

Statut : correction sélectionnée, spec préparée le 26 octobre 2026, non implémentée. Source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `src/modules/soumission/empreinte.ts:12` utilise `fraction.replace(/0+$/, '')` pour retirer les zéros terminaux avant comparaison des contenus d'une soumission. Sur une longue suite de zéros suivie d'un chiffre non nul, le moteur peut recommencer sa recherche depuis plusieurs positions. L'entrée peut rester un montant syntaxiquement valide, par exemple une fraction positive très petite ; parseStrictAmount ne borne pas le nombre de décimales et conserve la représentation avant arrondi.

SonarQube : alerte 13/16, typescript:S8786, MAJOR, clé `958763bc-5c3c-41fb-93ed-ca3182e5cc72`. [Export](../evidence/sonarqube-20261026/issues.json).

MEASUREMENT de présentation, Node v24.6.0, quatre appels du motif isolé sur des zéros suivis de 1 : 1000 → 0,734 ms ; 2000 → 2,654 ms ; 4000 → 9,839 ms ; 8000 → 41,032 ms. Chaque remplacement laisse la fraction inchangée. Ces sorties ont été observées dans la session, sans fichier brut conservé ; elles restent indicatives, un appel par taille. Aucun test de saturation HTTP ou de coût total de soumission exécuté.

## Décision et piste de solution

Après une première proposition de rattachement à AUD-003, Maia exige un nouvel AUD pour ce nouveau constat. AUD-029 est donc distinct d'AUD-003 ; ce dernier reste une contrainte de compatibilité, pas la destination de cette issue. Priorité P2. [SPEC-15 LastChanges](../../specs/SPEC-15-normalisation-montant-LastChanges.md).

Parcourir la fraction depuis sa fin tant que les caractères sont des zéros, puis découper une seule fois. Préserver exactement montantCanonique et empreinteContenu pour les montants admis ; aucun arrondi, passage par Number ou nouvelle limite de décimales. Les empreintes et montants canoniques déjà persistés doivent rester comparables lors des reprises.

Alternatives : conserver le motif (coût observé), limiter les décimales (changement des entrées admises, non retenu), convertir en nombre flottant (perte de précision, non retenu). Un parcours arrière simple corrige le mécanisme sans changer la règle métier.

## Validation et limites

Régression à vérifier : 012.500 et 12.5 identiques ; .5 et 0.5 identiques ; 5. et 5 identiques ; 12.345 et 12.35 distincts ; zéros finaux retirés mais zéros internes conservés ; reprise d'une demande historique avec empreinte inchangée. Conserver SOUM-015 et toutes les assertions de référence après vérification des identifiants réels.

Code, route d'entrée et usages du montant canonique relus. Tests de correction : 0 ; aucun code, service ou donnée modifié. L'influence est sur le parcours authentifié de soumission ; exploitation HTTP et capacité serveur non démontrées. Une re-mesure comparative reproductible sera requise lors de la réalisation.

## IMPLEMENTATION

### 29 octobre 2026 — SPEC-15, retrait linéaire des zéros terminaux

Statut : implémentée et vérifiée sur le périmètre unitaire décrit ; suite API de reprise/soumission à vérifier par la CI, Docker absent localement.
Spec : [SPEC-15](../../specs/SPEC-15-normalisation-montant-LastChanges.md). Révision de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Réalisation : branche `feat/spec-15`, diff local du 29 octobre 2026. Compatibilité : [AUD-003](AUD-003-receipt-consistency.md), [AUD-014](AUD-014-validation-montant.md).

#### Ce qui a été implémenté

`montantCanonique` retirait les zéros décimaux terminaux avec `fraction.replace(/0+$/, '')`, expression signalée pour un risque de retours arrière coûteux sur une longue fraction (AUD-029). Remplacement par un parcours arrière linéaire : un index part de la fin de la fraction et recule tant que le caractère précédent est `0`, puis la tranche avant cet index est conservée. Le retrait des zéros de tête de la partie entière (`/^0+/`, ancré, déjà linéaire) et le format canonique sont inchangés. Aucune nouvelle limite de décimales, conversion flottante ni modification d'empreinte.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/modules/soumission/empreinte.ts : montantCanonique | Parcours arrière linéaire au lieu de `/0+$/` | Forme canonique du montant, base de l'empreinte et de l'adaptateur PostgreSQL |

#### Nouveau fonctionnement

POST de soumission → validation du montant → `empreinteContenu` → `montantCanonique` : séparation entier/fraction → zéros de tête retirés (inchangé) → index reculé sur les `0` terminaux de la fraction → tranche conservée → `JSON.stringify([canonique, date, description])` puis SHA-256. Résultat canonique et empreinte strictement identiques à la version précédente : montants équivalents avant arrondi (`012.500`/`12.5`) partagent l'empreinte, montants distincts (`12.345`/`12.35`) restent séparés, reprise sur empreinte historique conservée. Calcul au plus linéaire.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npx vitest run tests/unit/montant-canonique.test.ts` | CANON-001…004 verts | exit 0, 4/4 réussis (dont empreintes de référence SHA-256 figées et grande fraction 8000 zéros) | Sortie locale 2026-10-29, Node 24.6.0 |
| `npx vitest run tests/unit/soumission.test.ts` | Reprise/idempotence/empreintes conservées | exit 0, 17/17 réussis | Sortie locale 2026-10-29 |
| Équivalence ancienne/nouvelle fonction sur 16 entrées (zéros, point absent, fraction longue) | Sorties identiques | 0 différence | Script d'équivalence local 2026-10-29 |
| `npm run typecheck` / `npm run lint` / `npm run build` | exit 0 | exit 0 (1 avertissement lint préexistant hors périmètre) | Sortie locale 2026-10-29 |
| `npm run test:unit` (suite complète) | Aucune régression ; 16 échecs restants inchangés (autres specs LastChanges + spec-report préexistant) | 65/81 réussis ; 16 échecs (branche partie de feat/ci, aucune régression introduite) | `reports/unit.json` |
| `tests/api/soumission.spec.ts` (reprise sur empreinte produite par l'ancienne version) | Même note retrouvée | Non exécuté localement : Docker/Compose absents | À vérifier sur GitHub Actions |

#### Écarts et limites

Aucun écart avec SPEC-15 : seule l'opération de retrait terminal est remplacée, format et empreinte conservés. Comme la correction préserve exactement le résultat, les cas CANON étaient déjà verts ; ce lot retire le motif quadratique sans changer le comportement observable. Le microbenchmark comparatif avant/après et la reprise API dépendant des services jetables restent à exécuter en CI ; aucun gain de débit HTTP revendiqué.
