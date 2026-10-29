# Expense.io

Application de gestion de notes de frais multi-entreprises : employés, managers et RH, dépôt de reçus, suggestion OCR et décisions d’approbation/rejet.

## État vérifié au 29 octobre 2026

Les corrections fonctionnelles et les compléments SPEC-13 à SPEC-18 sont intégrés dans `main` par la [PR #20](https://github.com/maiabuc/expense-io/pull/20), commit `2e76fe1c96749bc8151c3782cde2cc698218111c`.

| Validation | Résultat mesuré | Preuve |
| --- | --- | --- |
| CI interne obligatoire | **347/347** : 81 unitaires, 199 API, 67 navigateur ; aucun échec ni test ignoré | [Run complet](https://github.com/maiabuc/expense-io/actions/runs/40945194492), 26 jobs réussis, dont lint, types, build, documentation et 16 contrôles par spec |
| Scénarios externes issus de NathanPrats/expense-io#4 | **86/89**, sans test ignoré | [Exécution des 89 scénarios](https://github.com/maiabuc/expense-io/actions/runs/40944955422), sur le même code applicatif et les mêmes tests que la PR intégrée |

Les trois différences externes acceptées concernent le libellé d’erreur d’affectation manager et deux attentes liées à la suggestion sur PDF. Elles restent visibles dans le workflow externe séparé ; la CI interne garde ses assertions et ses contrôles obligatoires. Ces résultats sont attachés aux révisions exécutées, pas une mesure de couverture exhaustive ni de capacité de production.

## Architecture et parcours de lecture

Monolithe Next.js/TypeScript, PostgreSQL avec isolation entre entreprises, reçus dans S3/LocalStack et OCR Tesseract local. La soumission est isolée dans `src/modules/soumission` avec ports et adaptateurs ; les autres parcours restent dans le monolithe. Une soumission récupérable conserve une identité stable après une panne, sans dupliquer la note ni contourner les autorisations.

- [Specs et état d’intégration](docs/specs/README.md).
- [Audit, constats initiaux et preuves de correction](docs/audit/README.md).
- [Commandes et isolation des tests](docs/testing/README.md).
- [Décisions d’architecture](docs/adr/README.md).
- [Guide de correctif ciblé](AGENT_Files/SKILLS/quick_fix.md).
- [Instructions de contribution](docs/development/INSTRUCTIONS_IMPLEMENTATION.md) et [modèle de spec](docs/development/MODELE_SPEC.md).


## Prérequis

- Node.js 24+
- Docker (Postgres + LocalStack en local)

## Démarrage

```bash
make dev
```

Ceci installe les dépendances, démarre Postgres et LocalStack, applique les
migrations, crée le bucket de stockage, peuple des comptes de démonstration
(voir "Comptes" plus bas), puis lance le serveur de développement sur
http://localhost:3000.

Sans `make`, l'équivalent manuel :

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run migrate:up
npm run ensure-bucket
npm run seed
npm run dev
```

## Comptes

`make dev` (ou `npm run seed`) crée trois comptes de la même entreprise,
avec chacun une note de frais en attente pour les deux derniers —
relançable sans dupliquer quoi que ce soit :

| Rôle | Email | Mot de passe |
|---|---|---|
| RH | `hr@expense.io` | `hr1234` |
| Manager (racine, sans manager assigné) | `manager@expense.io` | `manager1234` |
| Employé (rattaché au manager ci-dessus) | `demo@expense.io` | `demo1234` |

Tu peux aussi créer d'autres comptes via `/signup` : le premier compte créé
sur un domaine email donné fonde une nouvelle entreprise et en devient RH ;
les comptes suivants sur le même domaine la rejoignent comme employés. Le
rôle `manager` n'est en revanche jamais assignable depuis l'interface —
seulement via le script de seed ou directement en base.

## Variables d'environnement

Voir `.env.example`.

## Autres commandes

```bash
make build   # build de production
make start   # build puis démarre en production
make lint
make typecheck
make down    # arrête Postgres/LocalStack
make clean   # arrête et supprime les données locales
```


## Vérifier les changements

```bash
npm ci
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

Les suites API et navigateur utilisent des services Docker jetables, pas les données de développement. `npm run test:upstream` exécute les scénarios externes avec le même harnais isolé ; voir le [guide des tests](docs/testing/README.md).
