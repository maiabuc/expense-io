# SPEC-18 — Refuser l’année zéro avant soumission

> État courant au 29 octobre 2026 : correction intégrée dans main ; contrôle automatisé SPEC-18 réussi dans la [CI interne complète](https://github.com/maiabuc/expense-io/actions/runs/40945194492). Les préparations et mesures anciennes ci-dessous décrivent leurs dates et révisions, pas une correction encore à livrer.

## Identification

- Objet : complément ciblé de [SPEC-04](SPEC-04-entrees-et-affichage.md), sans remplacer son historique.
- IDs concernés : AUD-015 ; priorité P3 du signalement de Maia.
- Statut : préparée le 29 octobre 2026 ; non implémentée.
- Autorisation : vérifier les specs existantes et rédiger les manquantes, demande de Maia. Cette tâche reste documentaire.
- Fiche : [AUD-015](../audit/solutions-to-audit/AUD-015-validation-date.md).
- Source d’audit historique : `265924bc7274047989e708ab635c2854d376230f`.
- Révision actuelle de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175` ; branche locale `hacked-status`, arbre initial propre. `main` et `origin/main` locaux pointent au même SHA ; aucune actualisation distante effectuée.
- Responsable de réalisation : non attribué.

## Problème et parcours actuel

OBSERVATION au SHA de départ : `src/utils/validators.ts:79` extrait l’année mais ne refuse pas `year < 1`. `parseStrictExpenseDate('0000-01-01')` passe les contrôles de mois/jour et de futur par lecture du code. Le POST appelle ce validateur avant `soumettre`. SPEC-04 C4 exige une date réelle mais ne nomme pas cette frontière. Aucun appel de validation ni insertion PostgreSQL exécuté ici.

## Résultat attendu et parcours cible

PROPOSITION de réalisation : Formulaire multipart → authentification → validation de date → refus 400 si année zéro → aucun appel de soumission ni écriture DB/S3. Ajouter `if (year < 1) return null` avant le calcul des jours. Préserver le message existant « Date invalide », le format yyyy-mm-dd et la référence Europe/Paris. Cette borne technique n’introduit aucun seuil d’ancienneté métier.

## Contrats et invariants

Lire les [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md) et les cinq références : [contrats](../audit/01-contrats-implementation.md), [permissions/transitions](../audit/02-permissions-et-transitions.md), [responsabilités](../audit/03-perimetre-et-dependances.md), [validation](../audit/04-reference-de-validation.md), [lots/acceptation](../audit/05-lots-et-acceptation.md). Préserver fonctions, contrats, permissions, UI et assertions existantes. Aucun changement d’infrastructure, de dépendances ou de schéma prévu.

| Situation importante | Résultat attendu | Effet persistant autorisé |
| --- | --- | --- |
| `0000-01-01` ou autre date de l’année 0000 | Validateur null ; POST 400 `{ error: "Date invalide" }` | Aucune note, réservation ou objet reçu créé |
| `0001-01-01` avec aujourd’hui fixé après cette date | Chaîne inchangée ; création légitime compatible PostgreSQL | Seulement la note/reçu du parcours valide |
| Date impossible ou future | Refus existant conservé | Aucune écriture |

## Périmètre de changement

| Fichier ou module prévu | Responsabilité du changement | Dépendance / coordination |
| --- | --- | --- |
| `src/utils/validators.ts` : parseStrictExpenseDate | Borne year < 1 | Validateur partagé utilisé par la route |
| Tests de validation et tests API de notes | Année zéro, borne positive et absence de mutation | Manifeste SPEC-04 / AUD-015 |

## Critères d’acceptation

| ID local | Condition vérifiable | Moyen de vérification |
| --- | --- | --- |
| C1 | `0000-01-01` et `0000-12-31` → null avec today fixé | Tests du validateur réel |
| C2 | `0001-01-01` → chaîne inchangée ; aucun seuil arbitraire récent ajouté | Test positif, horloge déterministe |
| C3 | POST authentifié de date année zéro, autres champs valides → 400 Date invalide, sans appel au module de soumission ni mutation SQL/S3 | Test de route et test HTTP sur services isolés ; comparer l’état avant/après |
| C4 | Dates réelles, impossibles, bissextiles, aujourd’hui/demain et minuit Paris conservent les assertions existantes | Suite AUD-015 ; contrôle positif de stockage PostgreSQL pour la borne 0001-01-01 |

## Réalisation prévue

Ajouter les tests de frontière avant le garde year < 1. Garder le format, le calcul d’aujourd’hui et les statuts existants. Alternative : attendre le rejet PostgreSQL, qui survient trop tard et ne produit pas le refus d’entrée attendu. Toute autre anomalie calendaire découverte sera consignée séparément, sans élargissement silencieux de ce correctif.

Ajouter les nouveaux cas au catalogue/manifeste de la spec d’origine si nécessaire, sans retirer les assertions existantes. Convention des titres : `[AUD-015][CAS-UNIQUE][correction ou reference] …` ; attribuer des identifiants non utilisés au démarrage. Avant changement applicatif, reprendre un flux à la fois avec Maia et enregistrer sa trace et sa prédiction de frontière réelles. Compréhension : non évaluée dans cette préparation.

## Validation à exécuter puis résultats réels

| Commande / scénario | Prévu | Réel : code de sortie et compte | Preuve / limite |
| --- | --- | --- | --- |
| Scénarios C1 à C4 | Résultats des critères ci-dessus | Non exécutés ; 0 test applicatif dans cette tâche | Lecture statique au SHA de départ uniquement |
| `npm run test:issue -- AUD-015` | Cas nouveaux et référence conservés | Non exécuté | Node.js absent dans cet environnement |
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

Cette spec porte désormais SPEC-18 pour préserver les identifiants SonarQube SPEC-13 à SPEC-15 déjà attribués. Les critères et le périmètre restent inchangés. Révision de revue : HEAD `f637381f0e144fda04c0166b650279b4d9b0726a`, documents distants `13ffcb0c6bd4c6050557e3cc14248d90fdc8b5da` présents dans une fusion non finalisée. Aucun changement applicatif dans cette tâche. Les états de branche et de fichiers décrits plus haut sont ceux de la préparation initiale.
