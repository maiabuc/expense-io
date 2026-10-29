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
