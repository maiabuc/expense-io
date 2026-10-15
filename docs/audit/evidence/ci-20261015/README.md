# Campagne CI — 15 octobre 2026

MESURE sur une copie isolée de la branche feat/ci, base `49e0ff395fd94c57e54213fe95434eb1e1e61869` et diff local non commité. Ce SHA est la base, pas le commit contenant les tests. Le [manifeste des sources](source-manifest.json) fixe les octets du dispositif testé ; les rapports donnent date, révision, portée et version Node. Le code applicatif reste celui de la source auditée `265924bc7274047989e708ab635c2854d376230f`.

## Environnement et méthode

Copie `/tmp/expense-io-ci-final-20261015`, dépendances installées par un `npm ci` propre à partir du lockfile final dans `/tmp/expense-io-ci-lockcheck-20261015`. Node v24.21.0, npm11.19.0, Linux x64 dans node:24-bookworm-slim ; Chromium installé par Playwright1.64.1 ; Vitest5.0.4. PostgreSQL16-alpine, LocalStack3.8.1, OCR et tessdata français réels. Aucun .env, node_modules ou .next utilisateur copié/modifié. La copie ne contient pas Git ; `SOURCE_SHA` et `SOURCE_STATE` explicitent sa provenance.

Les commandes API et E2E ont été vérifiées avec leur véritable orchestrateur `scripts/ci/run.mjs`, exécuté dans Docker avec accès au moteur Docker pour ses seuls services jetables. API : ports15435/14569/13422 et instance13423, DB expense_io_ci_api et bucket ci-api-receipts. E2E : ports15436/14570/13424, DB expense_io_ci_e2e et bucket ci-e2e-receipts. Tous les scénarios réinitialisent leurs propres fixtures : deux entreprises, dix comptes fictifs, plusieurs rôles et notes.

## Résultats réels

| Commande / contrôle | Résultat | Limites |
| --- | --- | --- |
| npm ci, lockfile final | exit0 ;481 packages | 8 alertes npm, aucune mise à jour automatique |
| npm run test:catalog | exit0 ;178 cas uniques et IDs existants | Vérifie la déclaration, pas le comportement |
| npm run lint | exit0 ;0 erreur,1 avertissement historique | CommonJS explicitement autorisé pour les preuves .cjs historiques |
| npm run typecheck | exit0 | Aucun contournement de types ajouté |
| npm run build | exit0 | Build production, application inchangée |
| npm run test:unit | exit0 ;6 réussites/6 | Domain actuel non appelé par les routes : ce succès ne prouve pas HTTP |
| npm run test:api | exit1 ;61 réussites,51 échecs,0 absent sur112 | Tous les échecs concernent des cas correction, pas des cas reference |
| npm run test:e2e | exit1 ;38 réussites,22 échecs,0 absent sur60 | Chromium seul ; tous les échecs concernent des cas correction |
| Synthèse de toutes les suites | exit1 ;105 réussites,73 échecs,0 absent sur178 | Rouge attendu avant corrections, pas une validation de celles-ci |
| Sans résultats unitaires, répertoire vide |0 réussite,6 non exécutés | Absence correctement signalée ; aucune reprise d'anciens résultats |
| Issue inconnue AUD-999 | exit1 | Aucun faux succès d'une sélection vide |
| node scripts/ci/documentation.mjs | exit0 ;22 préfixes protégés | Comparaison Git en lecture seule hors sandbox ; aucune modification des préfixes |
| Garde append-only avec snapshot avant réalisation | exit0 ;22 fiches | Contrôle du contenu historique et des ajouts précédents |
| actionlint1.7.7 .github/workflows/ci.yml | exit0 | Validation statique ; ne constitue pas une exécution sur GitHub |
| npm audit --json | exit1 ;7 high,1 critical | Collecte informative AUD-023, aucune exploitabilité déduite du compte |

[Catalogue](catalog.json), [synthèse par issue](issues.md), [résultats structurés](issues.json), [API](api.json), [navigateur](e2e.json), [unitaires](unit.json), [environnement unitaire](unit-environment.json), [contrôles de collecte](tooling-verification.json), [dépendances](dependencies.json).

Les échecs reproduisent notamment tri SQL libre, validations montant/date/reçu insuffisantes, fuites d'erreurs, diagnostic non structuré, droits périmés/interentreprises, politiques RLS, finalisation sous compte limité, décisions concurrentes, cycles de hiérarchie, panne de seed/inscription, OCR corrompu/PDF, états UI et fuseau. Cette classification par issue ne prétend pas démontrer chaque propriété future. Aucune correction applicative n'a été réalisée pour rendre la CI verte.

Exemple navigateur : NAV-020 attend le1octobre et reçoit le30septembre, comme le montre l'assertion dans e2e.json. Les captures d'échec sont produites dans test-results et seront des artefacts du workflow ; celle du contexte supplémentaire de fuseau peut être vide après sa fermeture, donc elle n'est pas retenue comme preuve. Aucune trace contenant cookies/session n'est publiée.

## Préservation, revues et limites

Les deux véritables lanceurs ont supprimé leurs conteneurs/réseaux après échec. Le serveur et le projet jetables de préparation ont aussi été arrêtés/nettoyés. Les services utilisateur sur5433/4567 sont préservés. Diff applicatif, migrations, Makefile, README et scripts seed/bucket : vide.

Deux revues distinctes ont contrôlé les standards et la spec. Les trous signalés ont conduit aux tests RLS-003/004/005, AFF-019, NOTE-029…032, NAV-021 et PANNE-003, aux métadonnées de provenance et à la suppression du résultat de suite avant préparation. La revue finale a ajouté DATE-001 : horloge du sous-processus serveur fixée à minuit Paris, aujourd’hui201 et demain400 attendus ; le code actuel accepte demain201. RLS-004 accepte aussi le refus42501 par privilèges et vérifie les données inchangées. La suite API a été rejouée intégralement après ces ajouts ; le navigateur et les unitaires sont restés inchangés. Trois ambiguïtés de sélecteurs navigateur ont été corrigées en ciblant l'alerte portant le texte attendu, sans changer les assertions métier.

La configuration GitHub est créée et validée statiquement ; l'exécution hébergée n'est pas une preuve acquise par ces mesures locales. Les tests du professeur ne sont pas disponibles. Reprise incomplete/idempotence, pool OCR40s, extraction hexagonale et qualification des dépendances restent explicitement à tester avec leurs lots. Aucun taux de couverture de code ou engagement de performance n'est annoncé. La compréhension indépendante de Maia n'a pas été évaluée pendant cette réalisation.
