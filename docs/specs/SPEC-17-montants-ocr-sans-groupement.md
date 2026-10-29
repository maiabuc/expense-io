# SPEC-17 — Préserver les centimes des montants OCR non groupés

## Identification

- Objet : complément ciblé de [SPEC-03](SPEC-03-ocr-borne.md), sans remplacer son historique.
- IDs concernés : AUD-008 ; priorité P2 du signalement de Maia.
- Statut : préparée le 29 octobre 2026 ; non implémentée.
- Autorisation : vérifier les specs existantes et rédiger les manquantes, demande de Maia. Cette tâche reste documentaire.
- Fiche : [AUD-008](../audit/solutions-to-audit/AUD-008-ocr-resource-bounds.md).
- Source d’audit historique : `265924bc7274047989e708ab635c2854d376230f`.
- Révision actuelle de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175` ; branche locale `hacked-status`, arbre initial propre. `main` et `origin/main` locaux pointent au même SHA ; aucune actualisation distante effectuée.
- Responsable de réalisation : non attribué.

## Problème et parcours actuel

OBSERVATION au SHA de départ : `src/lib/ocr.ts:204` limite le début du motif décimal à un à trois chiffres, suivis éventuellement de groupes de milliers. `TOTAL 1234,56 EUR` ne correspond pas au motif décimal ; le repli entier de `parseAmount` sélectionne 1234. SPEC-03 traite les ressources et erreurs du moteur ; aucun critère explicite ne protège ce montant. Relecture du code uniquement, parseur non exécuté ici.

## Résultat attendu et parcours cible

PROPOSITION de réalisation : Reçu → route authentifiée et validation du fichier → moteur OCR → texte → `parseAmount` → suggestion facultative `amount` → formulaire modifiable. Reconnaître entièrement les montants décimaux non groupés de quatre chiffres ou plus, sans perdre les formats groupés existants. `TOTAL 1234,56 EUR` doit suggérer le nombre JSON 1234.56. Cette suggestion n’enregistre aucune note ; la validation de soumission reste distincte.

## Contrats et invariants

Lire les [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md) et les cinq références : [contrats](../audit/01-contrats-implementation.md), [permissions/transitions](../audit/02-permissions-et-transitions.md), [responsabilités](../audit/03-perimetre-et-dependances.md), [validation](../audit/04-reference-de-validation.md), [lots/acceptation](../audit/05-lots-et-acceptation.md). Préserver fonctions, contrats, permissions, UI et assertions existantes. Aucun changement d’infrastructure, de dépendances ou de schéma prévu.

| Situation importante | Résultat attendu | Effet persistant autorisé |
| --- | --- | --- |
| Total décimal non groupé | Montant entier et centimes conservés | Aucune persistance |
| Formats groupés déjà reconnus | Même suggestion | Aucune persistance |
| Succès sans montant | Champ amount absent à la sérialisation JSON, succès sans champ toujours valide | Aucune persistance |
| Moteur occupé / délai / panne | 503 / 504 / 500 existants | Aucune persistance |

## Périmètre de changement

| Fichier ou module prévu | Responsabilité du changement | Dépendance / coordination |
| --- | --- | --- |
| `src/lib/ocr.ts` : motif décimal et `parseAmount` | Reconnaître le nombre complet | Préserver pool, classement des candidats, repli entier et dates |
| Tests de parsing OCR, fichier dédié si utile | Entrées textuelles déterministes | Passer par suggestFields avec moteur contrôlé ou extraction pure minimale |
| Tests API OCR / manifeste SPEC-03 | Compatibilité du contrat public | Ne pas dépendre uniquement d’une reconnaissance réelle variable |

## Critères d’acceptation

| ID local | Condition vérifiable | Moyen de vérification |
| --- | --- | --- |
| C1 | `TOTAL 1234,56 EUR` et `TOTAL 1234.56 EUR` → 1234.56 | Tests déterministes du parseur réel |
| C2 | `TOTAL 12345,67 EUR` → 12345.67 ; `TOTAL 1 234,56 EUR` et `TOTAL 1.234,56 EUR` → 1234.56 | Tableau de non-régression ; pas de capture partielle |
| C3 | `TOTAL 12,34 EUR` → 12.34 ; `TOTAL 1234 EUR` → 1234 ; texte sans nombre → aucune suggestion de montant | Contrôles formats existants et absence de montant |
| C4 | Dates, choix de ligne total, priorité décimale, succès vide et erreurs du pool conservés ; réponse API amount numérique | Suites OCR existantes et test du contrat ; conserver reçu lisible réel de référence |

## Réalisation prévue

Écrire les exemples textuels qui échouent avant correction. Élargir le motif par une alternative pour chiffres non groupés et conserver les nombres groupés ; vérifier les limites pour éviter une capture de suffixe. Préférer ce changement local à une bibliothèque monétaire ou une refonte OCR. Ne pas exposer un nouveau contrat HTTP pour rendre le parseur testable.

Ajouter les nouveaux cas au catalogue/manifeste de la spec d’origine si nécessaire, sans retirer les assertions existantes. Convention des titres : `[AUD-008][CAS-UNIQUE][correction ou reference] …` ; attribuer des identifiants non utilisés au démarrage. Avant changement applicatif, reprendre un flux à la fois avec Maia et enregistrer sa trace et sa prédiction de frontière réelles. Compréhension : non évaluée dans cette préparation.

## Validation à exécuter puis résultats réels

| Commande / scénario | Prévu | Réel : code de sortie et compte | Preuve / limite |
| --- | --- | --- | --- |
| Scénarios C1 à C4 | Résultats des critères ci-dessus | Non exécutés ; 0 test applicatif dans cette tâche | Lecture statique au SHA de départ uniquement |
| `npm run test:issue -- AUD-008` | Cas nouveaux et référence conservés | Non exécuté | Node.js absent dans cet environnement |
| `npm run ci:docs`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build` | Tous réussis | Non exécutés | À lancer dans un environnement Node 24 préparé |
| `npm run test:api`, `npm run test:e2e`, `npm run test:report` | Comptes réels et aucune régression inexpliquée | Non exécutés | PostgreSQL/S3 jetables, deux entreprises et plusieurs rôles ; aucun service utilisateur touché |

Les contrôles par spec restent ceux du parent ; ce complément documentaire ne crée pas automatiquement une nouvelle sélection CI. Aucun résultat hérité n’est une preuve du correctif proposé.

## Traçabilité et fin

- Snapshot avant écriture : `/tmp/arla-spec-complements-20261029.json`, empreintes capturées via Python car `node` est introuvable. Aucune fiche AUD modifiée.
- Commande prescrite `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-complements-20261029.json` : échec 127 (node absent). Contrôle Node à reprendre avant réalisation ; comparaison indépendante des empreintes pour cette rédaction.
- Entrée IMPLEMENTATION : aucune, préparation documentaire seulement.
- [Journal des décisions](../audit/DECISION_LOG.md) : vérification et compléments du 29 octobre 2026.
- Réalisation : diff documentaire local du 29 octobre 2026, aucun commit créé ni code applicatif modifié.
- Restant : implémentation et validation des critères ; statut préparée.

## Clarification du 29 octobre 2026 après récupération distante

Cette spec porte désormais SPEC-17 pour préserver les identifiants SonarQube SPEC-13 à SPEC-15 déjà attribués. Les critères et le périmètre restent inchangés. Révision de revue : HEAD `f637381f0e144fda04c0166b650279b4d9b0726a`, documents distants `13ffcb0c6bd4c6050557e3cc14248d90fdc8b5da` présents dans une fusion non finalisée. Aucun changement applicatif dans cette tâche. Les états de branche et de fichiers décrits plus haut sont ceux de la préparation initiale.
