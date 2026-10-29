# AUD-025 — Identifiants PostgreSQL fixes dans le harnais de tests

Statut : risque assumé par Maia le 26 octobre 2026 ; aucune correction ni spec prévue. Source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `scripts/ci/run.mjs:12` définit DATABASE_URL avec un utilisateur et un mot de passe fixes pour préparer la base de test. Les valeurs ne sont pas reproduites ici. Le script lance un projet Docker dédié via `tests/infra/compose.yml`, prépare le schéma et les fixtures, puis prévoit le nettoyage des services et volumes de ce projet. Ce compte sert à la préparation ; l'application testée utilise un autre compte limité.

MEASUREMENT : l'alerte SonarQube 8/16 porte la règle `secrets:S6698`, sévérité BLOCKER, clé `94c10ec0-1098-4a5c-9ddf-6134f56eed21`. Voir l'[export](../evidence/sonarqube-20261026/issues.json).

Pourquoi examiner : tout lecteur du dépôt connaît ce mot de passe. S'il peut atteindre la base correspondante, il peut tenter de se connecter avec les droits de ce compte. La présence de ce mot de passe ne prouve ni accès distant ni compromission.

## Décision et justification

Réponse explicite de Maia : « Ok risque assumé , next ». Classement retenu : risque faible et conditionnel, P3, accepté pour le harnais de tests isolé ; aucune correction et aucune spec prévue.

La configuration Compose publie PostgreSQL uniquement sur `127.0.0.1`, utilise une base de test et place ses données en tmpfs. Le script crée un projet distinct et prévoit son nettoyage. Ces dispositions réduisent l'exposition ; elles ne prouvent pas qu'un autre processus local ou un conteneur ayant accès au réseau de test ne peut pas se connecter. L'acceptation suppose des données de test jetables et l'absence de réutilisation de ces identifiants dans un environnement réel.

Alternative non sélectionnée : générer des identifiants propres à chaque exécution et les transmettre au service et aux scripts. Le coût de préparation supplémentaire n'est pas retenu pour ce périmètre.

Cette fiche concerne l'authentification à la base de test. Elle ne qualifie pas le chiffrement en transit ou au repos, non évalué ici. AUD-010 reste distinct : il concerne le secret de protection des sessions applicatives.

## Validation et limites

Code et configuration relus ; alerte vérifiée dans l'export, au SHA indiqué. Tests de connexion non autorisée exécutés pour cette qualification : 0. L'isolation effective et le nettoyage d'une exécution précise ne sont pas revérifiés par cette lecture. Aucun service lancé, aucune migration exécutée, aucun code modifié.

Réexaminer en cas de publication réseau élargie, de données sensibles dans les fixtures, de réutilisation des identifiants ou d'exécution sur un hôte partagé non maîtrisé. Les autres alertes sur des identifiants restent à décider séparément. La présente fiche documente la décision, sans prétendre à une correction implémentée.

## Qualification complémentaire — 26 octobre 2026 — alerte 9/16

OBSERVATION : `scripts/ci/run.mjs:14` définit CI_APP_DATABASE_URL avec un mot de passe fixe pour le compte applicatif de test `ci_app_login`. Ce compte est préparé par `scripts/ci/prepare-app-role.mjs` et utilisé par le serveur de test ; il est distinct du compte de préparation de la base. Source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. SonarQube : règle `secrets:S6698`, BLOCKER, clé `6ccd9937-fdd1-43cd-a896-4ae0184f493f`. Aucune valeur de mot de passe reproduite.

Décision explicite de Maia : « risque assumé ». Cette occurrence rejoint AUD-025 : risque faible et conditionnel, P3, sans correction, nouvelle fiche ou spec. Le périmètre reste la base de test dédiée publiée sur l'interface locale. Une personne pouvant atteindre la base et utilisant ces identifiants peut agir avec les droits limités de ce compte ; ces droits réduisent l'impact sans garantir l'absence d'accès aux données.

Code et export relus lors de la présentation de l'alerte ; 0 test d'accès non autorisé, aucun changement du code ni des services. Cette acceptation ne s'étend pas aux autres alertes ou au chiffrement, non évalué.
