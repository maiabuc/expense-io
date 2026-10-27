# AUD-027 — Borner le coût de validation de l'email à l'inscription

Statut : correction sélectionnée, spec préparée à la demande de Maia le 26 octobre 2026 ; non implémentée. Source actuelle : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Le constat est nouveau sur cette révision, pas une observation réattribuée à la baseline historique.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `src/app/actions/auth.ts:13` déclare `/^[^\s@]+@([^\s@]+\.[^\s@]+)$/`. L'action signup l'exécute ligne 30 sur l'email reçu, sans contrôle préalable de longueur. Elle extrait ensuite le domaine, hache le mot de passe, puis crée ou retrouve l'entreprise et crée le compte dans une transaction. La validation est donc sur le parcours serveur d'inscription avant les accès DB.

SonarQube : alerte 11/16, `typescript:S8786`, MAJOR, clé `49d44925-6047-43d6-8d67-57e453963af3`. [Export](../evidence/sonarqube-20261026/issues.json).

Pourquoi examiner : les classes répétées peuvent absorber les points du domaine. Une entrée invalide comportant de nombreux points conduit le moteur à essayer plusieurs répartitions avant le refus : retours arrière. Cette opération synchrone consomme le temps du processus serveur.

## Mesure et portée

MEASUREMENT : quatre appels bornés de l'expression extraite du fichier actuel, après un échauffement, sur Node v24.6.0. Entrée synthétique : `'a@' + 'a.'.repeat(n) + '@'`.

| Caractères | Temps local (ms) | Résultat |
| --- | ---: | --- |
| 1003 | 0.841 | Refus |
| 2003 | 2.294 | Refus |
| 4003 | 7.304 | Refus |
| 8003 | 30.213 | Refus |

[Protocole exécutable](../evidence/sonarqube-20261026/email-pattern-benchmark.mjs), [résultats avec SHA et empreinte du fichier](../evidence/sonarqube-20261026/email-pattern-benchmark.json). Ces valeurs proviennent d'une nouvelle capture documentaire ; les mesures annoncées précédemment dans la conversation étaient une autre exécution.

OBSERVATION : croissance nettement supérieure à celle de la longueur sur ces échantillons. HYPOTHÈSE : une entrée volumineuse ou des appels répétés pourraient ralentir le serveur. Aucun test HTTP, aucune saturation ni capacité maximale démontrés. Le coût du moteur de validation est mesuré, pas l'exploitabilité complète de l'application ; les limites du framework en amont n'ont pas été mesurées.

## Décision et piste de solution

Maia demande : « Nouvelle fiche AUD , avec une spec stp rajoute dans le nom du fichier -LastChanges ». Priorité retenue pour la préparation : P2, robustesse de l'inscription. [SPEC-13](../../specs/SPEC-13-validation-email-bornee-LastChanges.md) définit la correction ; sa rédaction n'est pas une implémentation.

Choix technique proposé par la spec : borne conservatrice de 4 096 unités UTF-16 (`string.length`) contrôlée avant analyse, puis parcours sans retours arrière pour conserver la grammaire actuelle et l'extraction du domaine. Cette borne est un budget technique proposé, pas une exigence de cours ou une limite normative de validité des emails. Les entrées au-delà sont intentionnellement refusées ; toute compatibilité externe identifiée à cette frontière doit être examinée avant réalisation.

Alternatives : conserver l'expression (coût observé inchangé) ; ajouter seulement une borne (coût borné mais ambiguïté conservée) ; ajouter une bibliothèque de validation complète (risque de modification de grammaire et dépendance supplémentaire). Une petite validation déterministe garde le contrôle sur le contrat sans introduire de nouvelle règle de possession d'email.

Préserver messages de formulaire, domaine et casse stockés selon l'existant, unicité, transaction entreprise/compte, rôles et connexion après commit. Pas de refonte UI, modification de secret, invitation ou validation de possession d'adresse. Les autres alertes d'expressions régulières restent à qualifier séparément.

## Validation et limites

Acquis : lecture du code, alerte et quatre mesures de l'expression isolée. Tests de correction exécutés : 0 ; code non modifié. À réaliser : frontières de longueur, équivalence sur corpus courts, entrées adverses, refus sans hachage/DB, tests réels d'inscription sur fixtures isolées de deux entreprises et plusieurs rôles, lint/types/build et suites de référence.

La question demandant pourquoi la borne doit précéder l'analyse n'a pas reçu de réponse explicative ; aucune compréhension indépendante n'est inférée de la demande de spec. Pas de section IMPLEMENTATION tant qu'aucune correction applicative n'est réalisée.

## IMPLEMENTATION

### 26 octobre 2026 — Actualisation documentaire, correction non implémentée

Maia sélectionne la réutilisation d'isValidEmail après correction et demande un nouvel [AUD-030 LastChanges](AUD-030-validation-email-partagee-LastChanges.md). [SPEC-13](../../specs/SPEC-13-validation-email-bornee-LastChanges.md) couvre désormais les deux issues distinctes : corriger le validateur existant puis l'appeler depuis signup, conserver l'extraction du domaine et retirer la validation indépendante de l'action. Cette décision remplace la proposition précédente de helper signup-email.ts séparé ; la borne technique et les invariants restent décrits dans la spec. Aucun code modifié, aucun test de correction exécuté ; ce paragraphe ne constitue pas une implémentation applicative.
