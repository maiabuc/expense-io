# Exécuter les E2E externes

Source : NathanPrats/expense-io#4, dépôt de tête 2-MORGAN/expense-io au SHA dfcd4a11f3925c5a64361bbb07b272c4d4e59cbc. Commande : `npm run test:upstream` (Docker et build de production requis).

Les assertions des 89 scénarios sont conservées. Les six cas JPEG/WebP/PDF utilisent maintenant des octets réellement dans le format annoncé, via les fixtures de référence existantes ; la validation applicative des formats reste active.

Le workflow Référence E2E externe exécute cette suite sur main et à la demande. La CI interne obligatoire conserve les suites unitaires, API, navigateur, lint, types, build et les contrôles par spec. Aucun résultat externe échoué n’est transformé en succès.
