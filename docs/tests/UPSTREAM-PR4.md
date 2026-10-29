# E2E de référence importés

Source : https://github.com/NathanPrats/expense-io/pull/4 ; dépôt de tête `2-MORGAN/expense-io`, SHA `dfcd4a11f3925c5a64361bbb07b272c4d4e59cbc`.

Les dix fichiers de scénarios, leurs supports, leur global setup et leurs deux images sont conservés sans modification ; 89 tests découverts. Documentation originale : [E2E.md](E2E.md). Ni CLAUDE.md ni les modifications des manifests ou Makefile du contributeur ne sont importés.

`npm run test:upstream` utilise le harnais Docker jetable existant avec un projet et une base dédiés, puis le serveur de production sous le compte applicatif limité. La configuration Playwright dédiée désactive les traces contenant des cookies. Les assertions ne sont ni modifiées ni ignorées. Le job Actions dédié est bloquant dans Résultat CI requis ; les rapports de cette suite restent séparés des cas AUD du projet.

Validation locale : catalogue 89 tests / 10 fichiers, types et lint exit 0 (un avertissement historique). Exécution réelle uniquement en CI : Docker absent localement. Aucun résultat fonctionnel revendiqué avant le run distant.
