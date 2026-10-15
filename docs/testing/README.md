# Tests et CI

La suite protège les parcours légitimes et vérifie les corrections décidées dans l'audit. Chaque cas porte son issue et un identifiant unique : `[AUD-007][DEC-001][correction] …`. Une issue peut nécessiter plusieurs tests et plusieurs suites. Un sous-ensemble vert ne certifie pas que toute la solution est réalisée.

## Exécuter

Prérequis : Node 24, npm, Docker avec Compose ; `npm ci`. Les commandes README et build existantes sont conservées.

```bash
npm run ci:docs
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:api
npx --no-install playwright install --with-deps chromium
npm run test:e2e
npm run test:report
```

`test:api` et `test:e2e` démarrent le build de production, PostgreSQL et LocalStack S3 dédiés, préparent le schéma et le bucket avec les scripts originaux, exécutent les scénarios puis détruisent uniquement leurs services jetables. Ne pas lancer les tests Playwright directement contre une application habituelle : les fixtures remettent à zéro les données de la DB de test. Le garde exige `ARLA_TEST_RUN=1`, une DB locale `expense_io_ci_*`, un bucket `ci-*` et interdit les ports locaux usuels 5433/4567. Les deux entreprises et tous les mots de passe sont fictifs.

Ports par défaut : 15434 (DB), 14568 (S3), 13420 (application), 13421 (instance de panne/droits limités). Pour des exécutions simultanées, affecter des valeurs distinctes à `CI_DB_PORT`, `CI_S3_PORT`, `CI_APP_PORT` (réserver aussi le port suivant). Chaque exécution possède son projet Compose ; les services utilisateur existants sont préservés. Utiliser aussi des copies de travail distinctes pour des lancements locaux simultanés : les rapports et le répertoire Playwright sont remplacés à chaque passage. GitHub utilise des machines séparées.

Pour travailler sur une issue :

```bash
npm run build
npm run test:issue -- AUD-007
```

Cette commande sélectionne les cas liés dans les suites concernées. Une issue inconnue ou sans test exécutable provoque un échec explicite. Les mécanismes futurs et choix reportés figurent dans `tests/deferred-coverage.json` : les ajouter avec leur implémentation, sans test vide ou ignoré. L'agrégateur respecte `TEST_ISSUE` lorsqu'il est défini ; sans sélection, il attend toutes les suites.

## Lire les résultats

`reports/catalog.json` donne la correspondance cas → issues → fichier. `reports/unit.json`, `api.json` et `e2e.json` contiennent les résultats bruts. `reports/issues.json` et `issues.md` donnent le bilan par issue, les cas manquants et les couvertures futures. Les résultats API/navigateur et la synthèse indiquent SHA, date, Node, portée et environnement sans identifiants de connexion. Le rapport unitaire a un compagnon `unit-environment.json`. Une exécution locale non commitée est désignée comme telle ; `SOURCE_SHA` et `SOURCE_STATE` permettent de tracer une copie isolée sans dossier Git.

Chaque lancement remplace le résultat de sa suite avant préparation : un échec de migration ou de démarrage ne réutilise pas un ancien succès. Un test échoué, absent, ignoré, dupliqué, une suite vide ou une erreur globale rendent le bilan rouge. Les tests de correction rouges indiquent les défauts audités attendus ; un échec de référence demande une analyse. Cette classification est une aide, pas une preuve automatique de la cause.

Les traces/vidéos sont désactivées car elles enregistreraient les cookies. Les captures d'échec utilisent exclusivement les données fictives ; URLs signées et entêtes sensibles sont filtrés dans les messages. Ne pas ajouter de secrets aux diagnostics.

## GitHub Actions

Le workflow distingue installation, lint/types/documentation/unitaires, build, API, navigateur, dépendances informatives et résultat requis. Le build ne dépend pas de tests unitaires verts : les autres preuves restent disponibles même avec un défaut. API et navigateur disposent de machines et données séparées ; aucun échec n'est marqué « attendu » ou ignoré. La synthèse et les artefacts sont publiés après échec. Les audits de dépendances restent informatifs tant qu'AUD-023 n'a pas qualifié leur applicabilité.

Pour une future protection de branche, le contrôle global s'appelle `Résultat CI requis`. Cette configuration de protection n'est pas modifiée ici. Les images Docker sont fixées sur leur version majeure/mineure documentée, pas sur un digest immuable ; les dépendances npm et la version Node CI sont verrouillées.

La suite actuelle peut être rouge avant les corrections applicatives. Ne pas affaiblir une assertion pour obtenir du vert. À chaque correction : garder le cas existant, compléter les scénarios propres au nouveau mécanisme, exécuter les suites concernées et ajouter IMPLEMENTATION dans la fiche AUD sans modifier son texte préexistant.
