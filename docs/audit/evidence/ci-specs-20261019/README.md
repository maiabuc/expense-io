# Validation CI par spec — 19 octobre 2026

Base : `73774862cb4f1b172d2b15bdbcb00c75b7cff6c6` et diff local CI-002. Ce SHA fixe la code applicatif inchangée et le départ, pas le commit contenant le nouveau harnais. Le [manifeste des fichiers](source-manifest.json) et les rapports fixent le dispositif testé. Demande et critères : [CI-002](../../../specs/CI-002-controles-par-spec.md). Les six PR sont examinées dans une [preuve séparée](../../revue-pr-g4bi2004-20261019.md).

## Exécutions

Copie isolée `/tmp/expense-io-spec-ci-20261019`, sans .env/.git/node_modules/.next utilisateur copiés. Installation propre npm ci dans Node24.21.0 / npm11.19.0, Docker Linux x64 ; PostgreSQL 16-alpine, LocalStack 3.8.1, Playwright 1.64.1 et Vitest 5.0.4. Chromium réel installé avec les dépendances système. OCR/authentification réels. Comptes/mots de passe/réservations fictifs uniquement.

Lanceur API : DB15445 / S314585 / app13440 et instance13441, DB expense_io_ci_api, bucket ci-api-receipts. Lanceur navigateur : DB15446 / S314586 / app13442, DB expense_io_ci_e2e, bucket ci-e2e-receipts. Les services jetables et leurs réseaux sont supprimés par les lanceurs après échec ; aucun service utilisateur seedé, migré ou arrêté.

| Contrôle | Résultat réel |
| --- | --- |
| npm ci isolé | exit 0 ; 481 packages ; 8 alertes, aucune mise à jour automatique |
| Catalogue |200 cas finaux, titres AUD/G et cas uniques ; manifeste de 12 specs chargé |
| npm run test:unit | exit 0 ;21/21, dont 15 contrôles d’outillage et 6 règles existantes |
| npm run lint | exit 0 ;0 erreur,1 avertissement historique |
| npm run typecheck | exit 0 sur les fichiers finaux |
| npm run build | exit 0 ; code applicatif inchangée, aucun contournement |
| npm run test:api | exit 1 ;62/117 réussis,55 échoués,0 absent |
| npm run test:e2e | exit 1 ;39/62 réussis,23 échoués,0 absent |
| npm run test:report | exit 1 ;122 réussis/78 échoués/0 absent sur 200 |
| actionlint 1.7.7, workflow final | exit 0 ; matrice et expressions valides |
| Comparaison ajout uniquement |22 fiches historiques et snapshot avant tâche conservés ; aucun texte précédent réécrit |

Tous les échecs de la campagne sur main sont des cas correction attendus sur cette code applicatif non corrigée ; aucun cas reference en échec. ENTREE-001 et INS-008 protègent deux comportements légitimes et réussissent déjà sur main. PANNE-004, ENTREE-002/003/004 et NET-033 rendent les frontières manquantes visibles. Les fichiers bruts sont [API](api.json), [navigateur](e2e.json), [unitaires](unit.json), [métadonnées unitaires](unit-environment.json), [agrégat](issues.json), [bilan par spec](specifications.md).

## Contrôleur et cohérence des sorties

Les tests CI-SPEC-001…015 vérifient notamment : indépendance d’une autre spec rouge ; résultat absent/ignoré/dupliqué ou titre différent ; cas obligatoire absent ; erreur globale ; distinction SPEC-06/07 ; nouveaux tests liés à un AUD ; manifeste dupliqué/vide ; ancien SHA ; prérequis ; sélection partielle ; suite tronquée. CI-SPEC-014 traverse réellement summarize puis le CLI sur les mêmes faux rapports d’outillage pour prouver un statut failed identique avec un SHA périmé. Ces jeux synthétiques ne sont pas présentés comme des tests applicatifs.

Deux revues en lecture seule (Standards/Spec) ont repéré une divergence initiale entre synthèse et job individuel. Elle a été corrigée en centralisant provenance/prérequis/complétude dans specificationExecutionErrors ; le CLI reprend le même agrégat. Les deux suivis confirment la correction à lecture, sans prétendre avoir lancé les tests du parent.

## Limites

Le nouveau workflow n’est pas réputé exécuté sur GitHub par ces résultats locaux. Les PR doivent actualiser leur branche avec le main contenant cette CI, puis pousser pour obtenir les nouveaux checks. Aucun de leurs heads n’a été modifié. Les contrôles verts restent bornés par les assertions et complétés par la revue ; les scénarios futurs absents restent incomplets. SPEC-11/12 sont des mesures/qualifications humaines, pas des réussites automatiques. Tests du professeur absents ; aucune mesure de couverture globale ou charge garantie.
