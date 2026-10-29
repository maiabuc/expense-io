# AUD-026 — Mot de passe par défaut du compte manager de démonstration

Statut : risque assumé par Maia le 26 octobre 2026, justifié par le maintien d'un usage local ; aucune correction ni spec prévue. Source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `scripts/seed.mjs:20` définit un mot de passe par défaut pour le manager de démonstration lorsque SEED_MANAGER_PASSWORD n'est pas renseigné. La valeur n'est pas reproduite ici. Le seed utilise la base indiquée par DATABASE_URL et crée le compte manager avec un mot de passe haché par bcrypt. Il n'impose pas de garde explicite limitant son exécution à un environnement local ou interdisant la production.

MEASUREMENT : SonarQube signale la ligne avec `javascript:S2068`, sévérité MAJOR, alerte 10/16, clé `394c4368-76d4-493b-8ee3-2ee929f62caf`. Voir l'[export](../evidence/sonarqube-20261026/issues.json).

Pourquoi examiner : si une instance contenant ce compte est accessible à une personne connaissant les identifiants par défaut, celle-ci peut tenter une connexion comme manager et utiliser les droits associés. Le hachage protège la représentation du mot de passe en base ; il n'empêche pas une connexion avec le mot de passe connu. Aucun accès non autorisé n'est démontré par cette observation.

## Décision et justification

Réponse explicite de Maia : « Nous assumons mais important: on le justifie car on reste en local ».

Le risque est accepté parce que le projet reste utilisé en local pour la démonstration. Classement retenu dans ce périmètre : faible/P3, aucune correction et aucune spec prévue. La justification est le périmètre local déclaré par Maia ; elle ne repose pas sur une garantie technique du seed empêchant un autre usage.

Cette décision ne vaut pas acceptation pour une instance exposée sur le réseau, un hébergement public ou un environnement partagé non maîtrisé. Un usage local n'empêche pas par principe tout accès par un autre utilisateur ou processus de la machine.

Alternative non sélectionnée pour cet usage local : imposer des mots de passe fournis par configuration privée, sans valeur par défaut, ou générer des identifiants propres à la démonstration. La possibilité existante de fournir SEED_MANAGER_PASSWORD ne supprime pas le risque du défaut lorsqu'elle n'est pas utilisée.

AUD-025 reste distinct : il concerne les comptes PostgreSQL du harnais de test. AUD-010 concerne le secret de protection des sessions. AUD-026 porte sur le compte applicatif manager de démonstration.

## Validation et limites

Code du seed et alerte SonarQube relus au SHA indiqué. Tests de connexion non autorisée exécutés pour cette qualification : 0. Aucun seed, aucune migration et aucun changement des comptes ou services existants. Le caractère local est une contrainte d'usage confirmée par Maia ; l'exposition réseau effective n'a pas été mesurée dans cette qualification.

Réexaminer avant toute ouverture réseau ou mise en ligne, réutilisation de ces identifiants ailleurs, ou utilisation dans un environnement partagé non maîtrisé. Les autres comptes de démonstration ne sont pas automatiquement qualifiés ou acceptés par cette décision. Cette fiche documente une acceptation de risque, pas une correction implémentée.
