# Tests et CI

La suite protège les parcours légitimes et vérifie les corrections décidées dans l'audit. Chaque cas porte son issue et un identifiant unique : `[AUD-007][DEC-001][correction] …`. Une issue peut nécessiter plusieurs tests et plusieurs suites. Un sous-ensemble vert ne certifie pas que toute la solution est réalisée.

## Résultats de référence au 29 octobre 2026

| Suite interne obligatoire | Exécutés | Réussis | Échoués / ignorés |
| --- | ---: | ---: | --- |
| Unitaires | 81 | 81 | 0 / 0 |
| API avec PostgreSQL/S3 | 199 | 199 | 0 / 0 |
| Navigateur | 67 | 67 | 0 / 0 |
| Total | 347 | 347 | 0 / 0 |

[Run 40945194492](https://github.com/maiabuc/expense-io/actions/runs/40945194492), révision `ec82bc8af02ba0f8f4aaa32b635265afb06e5575`, intégrée à main par `2e76fe1` : les 26 jobs internes réussissent, dont lint/types/build/documentation et 16 contrôles de spec. Le résultat est daté et lié à cette révision.

Les 89 scénarios de [NathanPrats/expense-io#4](https://github.com/NathanPrats/expense-io/pull/4) sont exécutables séparément avec `npm run test:upstream`. [Run externe](https://github.com/maiabuc/expense-io/actions/runs/40944955422) : **86 réussis, 3 échoués, aucun ignoré**, sur le même code applicatif et les mêmes tests. Les fixtures JPEG/WebP/PDF utilisent de vrais octets dans ces formats ; les assertions ne sont pas affaiblies.

Les trois différences acceptées sont ORG-07 (texte d’erreur de manager, statut 409 conservé), OCR-03 et OCR-07 (PDF refusé 400 par l’analyse, là où la référence attend un succès vide puis une invitation de saisie). Le dépôt de PDF reste accepté. Le workflow externe tourne sur main et à la demande ; ses échecs restent visibles et ne sont pas convertis en succès. Il est distinct du résultat CI interne obligatoire. Cette suite fournie n’est pas une garantie de connaître tous les tests de correction du professeur.

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

Deux comptes PostgreSQL sont utilisés : `DATABASE_URL` (compte de préparation, propriétaire des tables, utilisé par les migrations, le seed, les fixtures et les contrôles administratifs) et `CI_APP_DATABASE_URL` (compte applicatif limité `ci_app_login`, membre de `expense_app`, non superutilisateur et sans `BYPASSRLS`). Le serveur de production CI et les instances de panne tournent avec le compte applicatif ; `appDb()` des tests s'y connecte pour prouver la RLS. Les nouveaux essais de protection doivent s'exécuter avec ce compte : une fixture du compte de préparation ne prouve pas la RLS.

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

Les premières campagnes étaient rouges avant les corrections applicatives ; le résultat courant est celui de la table datée en tête de ce guide. Ne pas affaiblir une assertion pour obtenir du vert. À chaque correction : garder le cas existant, compléter les scénarios propres au nouveau mécanisme, exécuter les suites concernées et ajouter IMPLEMENTATION dans la fiche AUD sans modifier son texte préexistant.

## Contrôles visibles par spec

La CI affiche seize jobs de lot : SPEC-01 à SPEC-10 et SPEC-13 à SPEC-18. SPEC-11 et SPEC-12 restent en revue humaine. Ils réutilisent les vrais résultats unitaires/API/navigateur du même run et du même SHA : aucune suite supplémentaire factice. Un job peut passer quand les cas de sa spec réussissent, même si une autre spec fait échouer la suite globale. Lint, types, documentation, unitaires et build restent des prérequis communs ; le résultat global exige tous les jobs fonctionnels et les suites complètes.

Le manifeste `tests/specifications.json` relie les specs aux AUD et aux IDs de cas. Les tests nouveaux liés à ces AUD rejoignent la sélection automatiquement. Des exceptions explicites répartissent AUD-006 entre SPEC-06 (consultation/droits actuels) et SPEC-07 (affectation). Les tests d’outillage AUD-011 restent dans le contrôle unitaire commun.

Pour lire un lot après exécution des suites :

```bash
npm run test:spec:report -- SPEC-01
```

Cette commande **lit les résultats**, elle ne lance pas les tests. Elle produit `reports/SPEC-01.json` et `.md`. La synthèse complète ajoute `reports/specifications.json` et `.md` et la table GitHub. Absence, doublon, ancien SHA, suite tronquée, erreur globale, exécution filtrée par issue ou prérequis échoués ne donnent pas de vert. Une simple relance d’un ancien workflow ne récupère pas ce nouveau code : actualiser la branchePR avec le main contenant le dispositif.

La couverture obligatoire empêche de valider une spec uniquement avec un sous-ensemble ancien. Un cas attendu absent est signalé comme couverture incomplète, sans faux test ignoré. Les IDs sont des conventions opérationnelles des critères existants ; pour les renommer, adapter le manifeste avec une justification et conserver une preuve équivalente.

Les listes de couverture future ci-dessous sont historiques (préparation des premiers lots). Pour les cas réellement présents aujourd’hui, utiliser le [catalogue](../../scripts/ci/catalog.mjs), le [manifeste des specs](../../tests/specifications.json) et les [limites encore déclarées](../../tests/deferred-coverage.json). Leurs IDs anciens ne sont pas tous des manques actuels.


| Cas supplémentaires | Critère existant protégé |
| --- | --- |
| PANNE-004 | SPEC-01 : exception avec jeton/URL signée, aucun secret public ou journalisé |
| NET-033 | SPEC-02 : message sûr du serviceOCR 503 conservé |
| OCR-POOL-001…004 | SPEC-03 : réutilisation sans file, saturation, arrêt réel 40 s et remplacement ; à fournir avec le mécanisme |
| ENTREE-001…004 | SPEC-04 : petits montants, prototype du tri, grammaire et borne après arrondi |
| INS-008 | SPEC-05 : panne de connexion après commit conserve entreprise et compte |
| DROIT-022 | SPEC-06 : rattachement changé, session conservée et contrôles positif/négatif ; à ajouter |
| DEC-008 | SPEC-08 : incomplete non décidable sous les droits effectifs ; à ajouter avec cet état |
| REPRISE-001…008, HEXA-001/002 | SPEC-09 : clé/contenu, répétition et décision conservée, demandes distinctes, concurrence, pannes, rechargement, contrats adaptateurs et imports ; à fournir avec le module |
| SEED-004/005 | SPEC-10 : objet/référence divergents dans les deux sens, même note/décision conservée ; à ajouter |

SPEC-11 et SPEC-12 restent `manual-review` dans la synthèse : mesures comparatives et qualification d’avis ne deviennent pas des tests fonctionnels verts par présence d’un fichier. Elles nécessitent leurs preuves et une revue humaine. Un job automatique vert ne remplace pas non plus la revue des autres specs : les six PR examinées montrent pourquoi des tests anciens réussis ne suffisent pas à conclure.

Le 22 octobre, les identifiants de couverture future REPRISE-001…008 / HEXA-001…002 de SPEC-09 sont remplacés dans le manifeste par les cas effectivement exécutables : SOUM-001/004/005/007/008/009/012, NAV-030/031 et SOUM-015/120…123. Le contrôle exige aussi SOUM-017/124/125, RLS-014/015 et NAV-032/033 (exclusion après expiration, versions S3, protections SQL et reprise sans stockage navigateur). Aucun faux test ni assertion de référence supprimée.

Le remplacement conditionnel d'un reçu exige un stockage compatible `PutObject If-Match`. LocalStack 3.8.1 ignore cette condition ; les fichiers Compose épinglent donc 4.0.3. Les commandes README restent identiques ; les services utilisateur existants ne sont pas migrés ou redémarrés par les tests. [Implémentation LocalStack 4.0.3](https://github.com/localstack/localstack/blob/v4.0.3/localstack-core/localstack/services/s3/provider.py) ; [écritures conditionnelles S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html).
