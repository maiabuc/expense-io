# Tests préalables aux corrections LastChanges — 29 octobre 2026

Demande explicite de Maia : tests d’abord sur feat/ci, push direct sur main, puis correction par spec et MR. Ce push de tests ne déclare pas les corrections terminées ; la CI expose volontairement les défauts existants sans skip ou assouplissement.

## Réalisation

45 cas ajoutés : 39 unitaires, 5 API, 1 E2E dans le parcours inscription existant. Les vérifications API utilisent les services CI jetables et couvrent pannes SQL manager/RH, année zéro sans mutation, année 0001 PostgreSQL et reprise depuis empreinte historique. Seul E2E nouveau : EMAIL-008, refus côté serveur avant création entreprise/compte, contraintes HTML neutralisées. Aucun service utilisateur lancé, migré ou arrêté.

Alias @ vers src ajouté à Vitest pour importer les vrais gestionnaires et actions avec dépendances contrôlées. Six sélections SPEC-13 à 18 ajoutées au manifeste et à la matrice CI existante. Leurs cas obligatoires correspondent aux 45 cas réellement créés. Les suites de référence restent inchangées.

Le lockfile récupéré n’avait pas d’entrée d’installation du binding Linux x64 glibc de Rolldown, pourtant déclaré optionnel par rolldown@1.2.14. npm ci réussissait mais Vitest échouait avant collecte. Entrée exacte restaurée (version 1.2.14, intégrité npm pack), sans modification de package.json ni mise à niveau. Node 24.6.0 téléchargé dans /tmp pour les vérifications locales ; Node de la CI reste inchangé.

## Résultats réels

- npm ci --ignore-scripts : exit 0, 552 paquets installés ; audit informatif 4 alertes, aucune correction de dépendance appliquée.
- npm run ci:docs : exit 0, 347 tests identifiés (302 historiques + 45 nouveaux), préfixes historiques conservés.
- npm run typecheck : exit 0.
- Tests unitaires des sept fichiers ajoutés : exit 1, 39 exécutés, 24 réussis et 15 échoués sur les défauts visés ; [résultats](baseline-unit.json). Ce résultat précède tout changement applicatif.
- API/E2E réels : non exécutés localement, Docker absent ; à vérifier par GitHub Actions sur les MR.

Premiers essais sandbox bloqués par spawnSync git EPERM ; relance hors sandbox pour les contrôles nécessaires. Tous les secrets des scénarios sont fictifs. Les timings de tests ne prouvent pas une capacité de production.
