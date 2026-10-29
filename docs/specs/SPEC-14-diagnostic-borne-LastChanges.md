# SPEC-14 — Diagnostic interne à coût borné

## Identification

- Objet : maîtriser le coût de l'expurgation des diagnostics sans affaiblir la confidentialité.
- Lot et ID : SPEC-14, AUD-028 ; responsable non attribué.
- Statut : préparée, non implémentée. Maia a demandé le complément et la spec avec suffixe -LastChanges ; cette intervention est documentaire.
- Fiches : [AUD-028 LastChanges](../audit/solutions-to-audit/AUD-028-diagnostic-borne-LastChanges.md), [historique immuable](../audit/solutions-to-audit/AUD-005-public-errors.md).
- Source historique : `265924bc7274047989e708ab635c2854d376230f` ; source du nouveau constat et départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.
- État local préservé : modification préexistante du lockfile, journal, index et documents d'audit/specs de cette session.

## Problème et parcours actuel

Exception dans une route → respondError → code/message/stack passés à redactDiagnostic → regex authorization potentiellement coûteuse et autres filtres → console.error JSON → réponse publique 500 générique. Aucune borne de longueur avant les filtres. Le coût du motif isolé est mesuré dans le complément ; atteignabilité HTTP et saturation non démontrées.

## Résultat attendu et parcours cible

Conserver le parcours et les réponses. À l'entrée de redactDiagnostic, vérifier string.length avant tout filtre. Choix technique : `MAX_DIAGNOSTIC_LENGTH = 16384` unités UTF-16, budget conservateur de diagnostic, pas seuil normatif.

Si le texte dépasse ce plafond, retourner un marqueur constant tel que `[diagnostic trop volumineux, omis]` pour le champ entier. Ne jamais conserver un préfixe ou suffixe brut pouvant contenir une valeur sensible coupée. Code, message et stack passent chacun par ce garde-fou ; les champs structurés operation/status/timestamp restent produits comme actuellement. Ne pas journaliser ailleurs le champ rejeté.

Sous le plafond, remplacer la reconnaissance authorization par un petit parcours déterministe : repérer la clé selon la casse actuellement admise, reconnaître le séparateur et les espaces en un passage, puis consommer la valeur citée avec ses échappements ou la valeur non citée avec son préfixe bearer/basic éventuel. Masquer clé et valeur ensemble ; conserver la protection indépendante bearer. Chaque portion est avancée sans repartir sur toutes les partitions d'espaces. Les autres formats de secrets et la protection des URLs/cookies doivent être conservés ; ne pas prétendre reconnaître un secret arbitraire sans contexte.

## Contrats et invariants

Références : [contrats 1, diagnostics](../audit/01-contrats-implementation.md), [permissions 2](../audit/02-permissions-et-transitions.md), [responsabilités 3](../audit/03-perimetre-et-dependances.md), [validation 4, AUD-005](../audit/04-reference-de-validation.md), [lots et fin 5](../audit/05-lots-et-acceptation.md).

| Situation | Résultat attendu | Effet persistant |
| --- | --- | --- |
| Exception ordinaire | Même JSON interne structuré et réponse publique générique 500 | Aucun nouvel effet DB/S3 |
| Secret reconnaissable sous le plafond | Clé et valeur masquées, aucun secret dans code/message/stack | Journal sûr selon formats couverts |
| Champ au-delà du plafond, secret ou non | Champ entier omis avec marqueur ; aucun fragment brut | Pas de journal parallèle du texte brut |
| Texte bénin court | Texte utile conservé | Diagnostic inchangé |
| Refus métier via respondRefusal | Statut et message existants conservés ; code filtré | Aucun changement de permission ou mutation |

## Périmètre de changement

| Fichier prévu | Rôle | Coordination |
| --- | --- | --- |
| src/lib/errors.ts | Borne préalable et reconnaissance authorization déterministe | SPEC-01 existante, exports et réponses conservés |
| tests/api/diagnostics.spec.ts | Nouveaux cas réels de coût borné/confidentialité | Garder PANNE-005 à 009 et toutes leurs assertions |
| tests/unit/diagnostic-borne.test.ts si utile | Frontières pures supplémentaires | Ne pas dupliquer les assertions déjà couvertes |
| tests/specifications.json | Inscrire SPEC-14 avec cas effectivement créés et AUD-028 ; conserver les cas historiques AUD-005 | SPEC-01 reste intacte ; cas du même AUD sélectionnés ensemble |
| Fiche AUD-028, spec et journal | Entrée de réalisation et preuves au moment de la correction | Texte historique conservé |

Exclus : autres producteurs de logs, autres regex signalées, inscriptions, permissions, DB, dépendances et UI. Pas de nouveaux logs contenant l'entrée brute pour diagnostiquer le filtre.

## Critères d'acceptation

| ID | Condition | Vérification |
| --- | --- | --- |
| C1 | Borne vérifiée avant regex, champ entier omis au-delà | DIAG-001 : longueur 16385, absence du texte fourni et présence du marqueur |
| C2 | Frontières 16383/16384 encore filtrées et diagnostic court conservé | DIAG-002/003, textes bénins et sensibles |
| C3 | Aucun secret coupé par la borne ne fuit | DIAG-004 : valeurs citées/non citées et échappées, secret au début, autour de la frontière et en fin |
| C4 | Formats historiques toujours masqués | PANNE-005 à 009, nouvelles variantes authorization/bearer/basic, casse, séparateurs et échappements |
| C5 | Longue suite d'espaces traitée sans retours arrière combinatoires | DIAG-005 : résultat fonctionnel + revue du parcours et mesures bornées séparées, pas d'assertion milliseconde fragile |
| C6 | Intégration réelle conserve diagnostic structuré et réponse publique | DIAG-006 avec exception contrôlée et logs capturés ; PANNE-003/004/007/009 conservés |
| C7 | CI référence et sélection par spec restent cohérentes | Catalogue, lint/types/build et suites complètes, aucun skip ou assertion affaiblie |

Les marqueurs de secrets des tests sont synthétiques. Les preuves ne contiennent aucun vrai secret. Une mesure rapide du motif ne prouve ni absence de fuite ni robustesse HTTP : vérifier chaque propriété séparément.

## Réalisation prévue

1. Capturer de nouveau les préfixes, ajouter les cas fonctionnels et caractériser les formats courts actuels.
2. Ajouter la borne et remplacer la seule reconnaissance concernée, sans refonte globale du logger.
3. Enregistrer les cas réels dans le manifeste, vérifier les logs effectivement émis et les réponses ; exécuter les contrôles pertinents.
4. Comparer avant/après sur les mêmes données synthétiques dans un processus à délai maximum ; enregistrer répétitions et durées brutes. Pas de test de charge sur les services utilisateur.
5. Ajouter une entrée IMPLEMENTATION décrivant la correction et ses résultats dans les fiches concernées ; ne pas réécrire les réalisations historiques.

## Validation à exécuter puis résultats réels

| Commande / scénario | Prévu | Réel à la préparation | Limite |
| --- | --- | --- | --- |
| node docs/audit/evidence/sonarqube-20261026/authorization-pattern-benchmark.mjs | Mesure bornée actuelle | Exit 0 ; 4 appels synthétiques | Motif seul, pas d'attaque HTTP |
| node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-audit-005-LastChanges-20261026.json | Préfixes historiques intacts | Exit 0 ; 22 fiches historiques et snapshot de 23 fiches vérifiés | Contrôle documentaire |
| npm run ci:docs | Catalogue et manifeste valides | Non exécuté | Après création des tests |
| npm run lint / npm run typecheck / npm run build | Réussite | Non exécutés | Code inchangé à la préparation |
| npm run test:unit / npm run test:issue -- AUD-028 puis AUD-005 | Tous cas liés réussis | Non exécutés | Ne pas limiter à la nouvelle spec pour masquer une régression |
| npm run test:api / npm run test:e2e / npm run test:report | Référence et nouveaux cas réussis | Non exécutés | Services jetables, deux entreprises et plusieurs rôles |
| npm run test:spec:report -- SPEC-14 | Bilan conforme aux résultats réels | Non exécuté | Après ajout des cas et du manifeste ; ne lance pas les tests |
| Mesures corrigées et intégration logs | Coût borné et confidentialité préservée | Non exécutées | Aucun gain revendiqué avant correction |

## Traçabilité et fin

Snapshot de préparation : `/tmp/arla-audit-005-LastChanges-20261026.json`, 23 fiches préexistantes. Diff documentaire local du 26 octobre 2026, sans commit. La fiche historique reçoit seulement une note de remplacement du classement. AUD-028 porte la nouvelle correction ; ajouter ses futurs tests sous [AUD-028], sans réattribuer les assertions historiques AUD-005. Journal actualisé. Restant : réalisation, mesures comparatives et validation de tous les critères ; responsable non attribué.

Correction de classement du 26 octobre : à la demande de Maia, SPEC-14 traite désormais AUD-028, nouvel ID distinct. AUD-005 reste une référence de compatibilité pour la confidentialité ; aucune correction réalisée. Snapshot de cette correction documentaire : `/tmp/arla-new-aud-028-029-20261026.json`.

## Revue de préparation — 29 octobre 2026

Périmètre confirmé par la demande de Maia : spécifier les corrections sélectionnées, en excluant les risques assumés. Cette spec couvre AUD-028 ; elle reste préparée, non implémentée. Fiche(s), code courant et critères relus : le défaut décrit est encore présent par inspection, aucune exécution applicative réalisée dans cette revue. Les mesures du 26 octobre restent des preuves historiques de leur révision.

Révision locale : `f637381f0e144fda04c0166b650279b4d9b0726a` ; documents récupérés depuis `13ffcb0c6bd4c6050557e3cc14248d90fdc8b5da`, fusion non finalisée. Aucun changement de grammaire, de plafond ou de règle métier ajouté par cette revue. Conserver les critères, scénarios et étapes de réalisation ci-dessus. [Table de suivi](CHANGEMENTS_A_SPECIFIER.md).

Snapshot de revue avant modification : `/tmp/arla-spec-lastchanges-20261029.json`. Node.js absent : capture/contrôle prescrits non exécutables ; empreintes indépendantes capturées via Python et fiches laissées intactes. Contrôles documentaires de cette revue consignés dans le journal ; lint/types/build et tests non exécutés. Aucun ajout IMPLEMENTATION applicatif ni manifeste CI fictif. Avant réalisation, actualiser le SHA et capturer à nouveau les fiches avec l’outil Node du dépôt.
