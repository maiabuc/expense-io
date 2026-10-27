# AUD-024 — Recherche d'exécutables via PATH dans les outils CI

Statut : risque assumé à la demande de Maia le 26 octobre 2026 ; aucune correction et aucune spec prévues. Source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `scripts/ci/dependencies.mjs:5` appelle `spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' })`. Le script écrit ensuite le résultat de l'audit des dépendances dans un rapport informatif associé à AUD-023.

PATH est la liste ordonnée des dossiers où le système recherche un exécutable. L'appel donne le nom `npm`, sans chemin absolu ni environnement de recherche explicite : Node utilise le PATH hérité. Voir la [documentation Node](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options).

MEASUREMENT : SonarQube signale cette ligne avec la règle `javascript:S4036`, sévérité `MINOR`, impact sécurité `LOW`, clé `31deb1d6-13e1-46a6-880c-bfdcaa3136cb`. [Résultats bruts](../evidence/sonarqube-20261026/issues.json).

HYPOTHÈSE : si un attaquant peut déposer un faux exécutable npm dans un dossier recherché avant celui de l'outil attendu, le script peut lancer ce programme avec les droits du processus CI ou local. Aucun contrôle de ce PATH par un utilisateur applicatif n'est établi ; aucune exploitation n'a été exécutée.

## Décision et justification

Maia demande de conserver cette issue dans `assumed_issues/`, sans traitement ni création de spec. Classement retenu pour le suivi : risque faible et conditionnel, priorité P3.

Le job `dependances` de `.github/workflows/ci.yml` utilise un runner `ubuntu-24.04`, configure Node avec `actions/setup-node`, puis lance ce script. Commande et arguments sont fixes. La lecture du dépôt ne prouve toutefois pas l'intégrité des dossiers du PATH lors d'une exécution donnée. Le risque est accepté dans ce périmètre d'outillage ; l'alerte n'est pas déclarée fausse ou corrigée.

Alternative non sélectionnée : contrôler explicitement les dossiers de recherche ou la provenance de l'exécutable, avec un coût de configuration et de portabilité. Une nouvelle exposition démontrée peut justifier de rouvrir la décision.

## Validation et limites

Code, appel et workflow relus au SHA indiqué ; source de l'alerte vérifiée dans l'export SonarQube. Tests exécutés pour cette qualification : 0. PATH effectif du runner, permissions des dossiers et substitution d'exécutable non testés. Aucun code applicatif ou CI modifié.

Réexaminer si une partie non fiable peut influencer un dossier prioritaire du PATH ou si ce script est lancé dans un environnement partagé moins maîtrisé. Les autres occurrences de S4036 restent à classifier séparément avec Maia ; elles ne sont pas automatiquement acceptées par cette fiche.

La création de cette fiche documente une décision ; elle ne constitue pas une implémentation. La question de compréhension posée précédemment n'a pas reçu de réponse : aucune compréhension indépendante n'est attribuée à Maia.

## Qualification complémentaire — 26 octobre 2026 — alerte 2/16

OBSERVATION : `scripts/ci/documentation.mjs:11` lance `execFileSync('git', ['rev-parse', '--verify', `${base}^{commit}`], ...)` pour vérifier la référence de comparaison documentaire. SonarQube : `javascript:S4036`, MINOR, clé `78f48782-b774-4263-a984-abef297b315a`. Source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Le nom git est fixe et la référence est limitée à HEAD ou un SHA hexadécimal de 40 caractères ; la recherche de l'exécutable repose sur PATH. Une substitution malveillante reste conditionnée à une influence sur un dossier prioritaire, non démontrée ici.

Décision explicite de Maia : « Aussumed, next ». Cette occurrence rejoint AUD-024 : risque faible et conditionnel, P3, assumé ; aucune correction ni spec prévue. Aucun nouveau dossier AUD distinct. Code relu et alerte vérifiée dans l'export ; 0 test d'exploitation, aucun changement du code. Cette décision ne vaut pas acceptation des occurrences suivantes ni preuve de compréhension indépendante.

## Qualification complémentaire — 26 octobre 2026 — alerte 3/16

OBSERVATION : `scripts/ci/documentation.mjs:14` appelle `spawnSync('git', ['cat-file', '-e', `${base}:${item.chemin}`], ...)` pour vérifier l'existence d'une fiche dans le commit de référence. Source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Alerte `javascript:S4036`, MINOR, clé `4b07cc9a-eb77-4c49-bdc3-13827accc06c` dans l'export SonarQube. Le même risque conditionnel de substitution de git via PATH s'applique ; aucune influence d'un attaquant sur cette recherche n'est démontrée.

Décision explicite de Maia : « rattacher à AUD-024 comme risque assumé , next ». Occurrence rattachée : faible/P3, sans correction ni spec prévue. Code et export relus ; 0 test d'exploitation ; aucun code modifié. Les occurrences suivantes restent à décider séparément.

## Qualification complémentaire — 26 octobre 2026 — alertes 4 à 6/16

Maia accepte l'alerte 4 et demande de rattacher les autres occurrences du même mécanisme : « rattachement à AUD-024 comme risque assumé, next ( s'il y en à d'&autres du style rattache les stp ) ». Cette décision complète le traitement occurrence par occurrence décrit précédemment.

OBSERVATION : trois autres appels à git dans `scripts/ci/documentation.mjs` dépendent du PATH hérité. Source relue : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Tous portent la règle `javascript:S4036`, MINOR.

| Alerte | Ligne et rôle | Clé SonarQube |
| --- | --- | --- |
| 4/16 | 16 : git show lit le contenu historique d'une fiche pour calculer son empreinte | 2c5e8293-fd7b-4148-93b8-78ac109a437a |
| 5/16 | 20 : git ls-tree énumère les fiches du commit de référence | d61a8784-b1a6-4e99-be99-838fdd274c65 |
| 6/16 | 22 : git show lit les fiches supplémentaires du commit de référence | 0f11b68f-4018-4bec-b763-d2d221a1744f |

Décision : ces trois occurrences rejoignent AUD-024 comme risques assumés, faibles/P3, sans correction ni spec. Les six alertes S4036 de cet export sont désormais rattachées à cette fiche. Même condition d'exploitation : influence sur la recherche d'exécutable, non démontrée. Code et export relus ; 0 test d'exploitation et aucun changement du code. Aucune acceptation des alertes portant sur d'autres mécanismes n'est déduite.
