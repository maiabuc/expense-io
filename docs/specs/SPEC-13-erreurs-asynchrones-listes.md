# SPEC-13 — Intercepter les erreurs asynchrones des listes manager et RH

## Identification

- Objet : complément ciblé de [SPEC-01](SPEC-01-erreurs-api.md), sans remplacer son historique.
- IDs concernés : AUD-005 ; priorité P2 du signalement de Maia.
- Statut : préparée le 29 octobre 2026 ; non implémentée.
- Autorisation : vérifier les specs existantes et rédiger les manquantes, demande de Maia. Cette tâche reste documentaire.
- Fiche : [AUD-005](../audit/solutions-to-audit/AUD-005-public-errors.md).
- Source d’audit historique : `265924bc7274047989e708ab635c2854d376230f`.
- Révision actuelle de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175` ; branche locale `hacked-status`, arbre initial propre. `main` et `origin/main` locaux pointent au même SHA ; aucune actualisation distante effectuée.
- Responsable de réalisation : non attribué.

## Problème et parcours actuel

OBSERVATION au SHA de départ : `src/app/api/manager/expense-notes/route.ts:25` et `src/app/api/hr/expense-notes/route.ts:25` renvoient `withUserScope(...)` sans attendre sa résolution dans le bloc `try`. Un rejet asynchrone quitte donc le gestionnaire sans passer dans son `catch`. SPEC-01 C1 couvre le principe d’erreur sûre, mais ne décrit pas ces deux chemins de rejet. Aucun appel HTTP de panne exécuté dans cette revue.

## Résultat attendu et parcours cible

PROPOSITION de réalisation : Lecture de liste → identité et rôle actuels → `withUserScope` (contexte SQL de l’utilisateur) → SELECT → réponse JSON. Attendre la promesse dans le `try` avec `return await withUserScope(...)` dans chacune des deux routes : tout rejet rejoint le `catch`, puis `respondError(error, operation)` produit le diagnostic expurgé et la réponse sûre existante.

## Contrats et invariants

Lire les [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md) et les cinq références : [contrats](../audit/01-contrats-implementation.md), [permissions/transitions](../audit/02-permissions-et-transitions.md), [responsabilités](../audit/03-perimetre-et-dependances.md), [validation](../audit/04-reference-de-validation.md), [lots/acceptation](../audit/05-lots-et-acceptation.md). Préserver fonctions, contrats, permissions, UI et assertions existantes. Aucun changement d’infrastructure, de dépendances ou de schéma prévu.

| Situation importante | Résultat attendu | Effet persistant autorisé |
| --- | --- | --- |
| Panne asynchrone de contexte ou de requête | 500, `{ error: string }` du mécanisme existant, sans stack ni détail SQL public ; diagnostic avec opération propre à chaque route | Aucune écriture métier |
| Succès | 200, même tableau, ordre ASC, champs et périmètre | Aucune écriture métier |
| Session absente / mauvais rôle | 401 manager, 403 RH comme actuellement | Aucun accès à la liste |

## Périmètre de changement

| Fichier ou module prévu | Responsabilité du changement | Dépendance / coordination |
| --- | --- | --- |
| `src/app/api/manager/expense-notes/route.ts` | Attendre le contexte dans GET | SPEC-01 et SPEC-06 |
| `src/app/api/hr/expense-notes/route.ts` | Même correction, garde RH conservée | SPEC-01 et SPEC-06 |
| Tests de routes et `tests/api/diagnostics.spec.ts` ou fichier dédié | Rejets différés, réponse et diagnostic | Ajouter les cas au manifeste SPEC-01 selon convention CI |

## Critères d’acceptation

| ID local | Condition vérifiable | Moyen de vérification |
| --- | --- | --- |
| C1 | Chacune des deux routes convertit un rejet différé de `withUserScope` en réponse 500 sûre, sans rejet non traité | Tests des vrais GET avec session contrôlée et promesse rejetée après un tour asynchrone |
| C2 | Une panne de SELECT sur PostgreSQL isolé suit le même chemin HTTP ; réponse sans détail interne et diagnostic expurgé avec la bonne opération | Test HTTP pour manager et RH ; erreur contrôlée, secrets uniquement fictifs |
| C3 | Succès, refus, tri et séparation A/B restent identiques | Contrôles positifs et négatifs de listes avec deux entreprises et plusieurs rôles |

## Réalisation prévue

Ajouter d’abord les tests de rejet différé ; vérifier qu’ils détectent le défaut initial. Ajouter uniquement `await` aux deux retours. Conserver le mécanisme commun d’erreurs et les requêtes SQL ; aucune extraction commune nécessaire. Alternative : intercepter les rejets avec `.catch(...)`, plus répétitif sans bénéfice ici.

Ajouter les nouveaux cas au catalogue/manifeste de la spec d’origine si nécessaire, sans retirer les assertions existantes. Convention des titres : `[AUD-005][CAS-UNIQUE][correction ou reference] …` ; attribuer des identifiants non utilisés au démarrage. Avant changement applicatif, reprendre un flux à la fois avec Maia et enregistrer sa trace et sa prédiction de frontière réelles. Compréhension : non évaluée dans cette préparation.

## Validation à exécuter puis résultats réels

| Commande / scénario | Prévu | Réel : code de sortie et compte | Preuve / limite |
| --- | --- | --- | --- |
| Scénarios C1 à C3 | Résultats des critères ci-dessus | Non exécutés ; 0 test applicatif dans cette tâche | Lecture statique au SHA de départ uniquement |
| `npm run test:issue -- AUD-005` | Cas nouveaux et référence conservés | Non exécuté | Node.js absent dans cet environnement |
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
