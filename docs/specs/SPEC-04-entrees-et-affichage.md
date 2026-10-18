# SPEC-04 — Tri sûr, validation des notes et dates stables

## Identification

- Responsable : personne B. Branche : `feat/spec-04`.
- IDs : AUD-004, AUD-014, AUD-015, AUD-017, G14. Fiches : [AUD-004](../audit/solutions-to-audit/AUD-004-sort-input.md), [AUD-014](../audit/solutions-to-audit/AUD-014-validation-montant.md), [AUD-015](../audit/solutions-to-audit/AUD-015-validation-date.md), [AUD-017](../audit/solutions-to-audit/AUD-017-affichage-date.md), [G14](../audit/solutions-to-audit/G14-controle-recus.md).
- Statut : préparée pour l’équipe le 17 octobre 2026 ; implémentée et vérifiée le 18 octobre 2026 (voir Traçabilité et fin).
- Autorisation : répartition et préparation demandées par Maia ; directions déjà retenues dans l’audit. Les conditions propres aux sujets 11/12 restent applicables.
- Source d’audit : `265924bc7274047989e708ab635c2854d376230f`.
- Départ documentaire : `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, fusion CI dans main. Le développeur enregistrera son vrai SHA de départ actualisé avant réalisation.

## Problème et parcours actuel

expense-notes/route.ts:42 concatène le tri, POST:56–110 utilise parseFloat et ne contrôle pas entièrement date/contenu. Les trois écrans formatent new Date(expenseDate), ce qui décale le jour selon le fuseau.

Les emplacements détaillés et preuves originales restent dans les fiches liées. Le 17 octobre, le diff entre la source auditée et le code applicatif/migrations/scripts originaux est vide ; aucun comportement à l’exécution n’a été rejoué pendant cette préparation.

## Résultat attendu et parcours cible

Valider intégralement avant création ou upload ; n’autoriser que les tris nommés. Conserver la représentation décimale exacte jusqu’à PostgreSQL et la date calendaire sans décalage. Fournir à D des validations réutilisables indépendantes de Next/pg/AWS.

## Contrats et invariants

Lire les [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md), puis les cinq références : [1 — contrats](../audit/01-contrats-implementation.md), [2 — permissions/états](../audit/02-permissions-et-transitions.md), [3 — responsabilités](../audit/03-perimetre-et-dependances.md), [4 — validation](../audit/04-reference-de-validation.md), [5 — lots/exclusions](../audit/05-lots-et-acceptation.md). L’[organisation commune](README.md) fixe la coordination.

| Situation | Attendu | Effet persistant autorisé |
| --- | --- | --- |
| Succès | Contrat public et parcours légitime préservés | Seulement l’effet prévu par ce lot |
| Refus | Statut et message du contrat ; aucune donnée technique publique | Aucune mutation interdite |
| Panne / répétition / concurrence | Critères spécifiques ci-dessous ; résultat incertain relu | Invariants d’état, droits et cohérence maintenus |

## Périmètre de changement

| Fichier ou module prévu | Responsabilité |
| --- | --- |
| src/app/api/expense-notes/route.ts | GET et adaptation initiale de validation POST |
| Module de validation pur partagé avec SPEC-09 | montant/date/reçu |
| expenses/page.tsx, PendingApprovalsPanel.tsx, AdminConsole.tsx | formatage date uniquement |

Coordination :

- Après catalogue SPEC-01 ; intégrer les écrans après SPEC-02. Avant extraction de la route dans SPEC-09.
- D conserve ensuite ces validations : pas de deuxième grammaire ni vérification de fichier concurrente différente.

Préserver commandes README/build, contrats, permissions, styles et disposition ; nouveaux messages/commentaires en français. Pas de refonte REST, notification activée, nouveau circuit métier ou architecture supplémentaire.

## Critères d’acceptation

| ID | Condition vérifiable |
| --- | --- |
| C1 | Tri absent conserve created_at DESC ; newest/amount_asc/amount_desc insensibles à la casse ; inconnu/expression SQL →400 avant SQL. |
| C2 | Montant décimal complet positif : point ou virgule unique, + facultatif et formes .5/1. admises ; suffixes/exposants/NaN/Infinity refusés. |
| C3 | Transmettre une chaîne décimale normalisée, sans arrondi JS ; préserver arrondi numeric(10,2), petites valeurs admises et contrôler dépassement après arrondi. |
| C4 | Date yyyy-mm-dd exacte/réelle, aujourd’hui au plus selon Europe/Paris ; bissextiles et minuit testés ; même jour affiché Paris/UTC/LosAngeles. |
| C5 | PDF/PNG/JPEG/WebP réels jusqu’à10 MiB ; détecter les octets et cohérence MIME ; refus avant écriture ; aucun OCR PDF ajouté. |

## Réalisation prévue

Ordre : Après SPEC-01/02 ; finaliser la validation partagée avant SPEC-09 et SPEC-03.

1. Actualiser la branche et relire les fichiers ; capturer les fiches avant modification.
2. Compléter les tests aux frontières publiques et conserver les assertions existantes liées aux AUD.
3. Réaliser la correction ciblée ; séparer corrections, extraction structurelle et formatage.
4. Tester aussi les refus, pannes et concurrents pertinents ; intégrer les dépendances partagées avant de conclure.

## Validation à exécuter puis résultats réels

Cas ciblés :

- LIST, NOTE, DATE-001 et NAV-018…021 ; compléter +/.5/1., exposants, petites valeurs, bords d’arrondi et formats déguisés.

| Commande / scénario | Prévu | Réel | Preuve / limite |
| --- | --- | --- | --- |
| Tests par issue + nouveaux critères | Tous les cas du lot réussissent | `test:issue` AUD-004 6/6, AUD-014 12/12, AUD-015 7/7, G14 11/11, AUD-017 4/4 | `reports/issues.json`, run local 2026-10-18 |
| npm run lint ; npm run typecheck ; npm run build | exit 0 chacun | exit 0 chacun (1 avertissement lint préexistant hors périmètre) | Sortie locale 2026-10-18 |
| npm run test:unit ; test:api ; test:e2e puis test:report | Suite complète exécutée, aucun test masqué | unit 6/6 ; api 82/112 (0 échec sur AUD-004/014/015/G14 ; 30 échecs hors périmètre : specs C/D non réalisées, AUD-005 partiellement dépendant de SPEC-01 non mergée) ; e2e 39/60 (0 échec AUD-017 ; 21 échecs hors périmètre : AUD-016/013, dépendances SPEC-02/05 non mergées sur cette branche) | `reports/issues.json` |
| Garde append-only avec snapshot avant travail | Préfixes strictement conservés | Vérifié : `check-append-only.mjs check --snapshot /tmp/arla-spec-04-gf.json` | Sortie locale 2026-10-18 |

Tests sur services CI isolés, deux entreprises et plusieurs rôles. Les cas CI existants sont un point de départ : ils ne couvrent pas automatiquement tous les mécanismes futurs. Aucun test du professeur fourni ; aucune réussite inférée d’un fichier listé.

## Traçabilité et fin

- Capturer avant l’implémentation : `node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-04-<identifiant-unique>.json`.
- Chaque fiche concernée reçoit un ajout daté sous `## IMPLEMENTATION` ; conserver absolument tout le texte et les ajouts antérieurs. Indiquer quoi/où/nouveau fonctionnement, tests réels et limites. Pour AUD-019, documenter seulement la convention conservée ; pour 11/12, ne pas inventer de correction.
- Vérifier : `node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-04-<identifiant-unique>.json`.
- Mettre à jour cette spec et le [journal](../audit/DECISION_LOG.md) avec les vrais résultats et le commit livré.
- Entrées IMPLEMENTATION : [AUD-004](../audit/solutions-to-audit/AUD-004-sort-input.md#implementation), [AUD-014](../audit/solutions-to-audit/AUD-014-validation-montant.md#implementation), [AUD-015](../audit/solutions-to-audit/AUD-015-validation-date.md#implementation), [AUD-017](../audit/solutions-to-audit/AUD-017-affichage-date.md#implementation), [G14](../audit/solutions-to-audit/G14-controle-recus.md#implementation), ajoutées le 2026-10-18 (SHA de départ `7377486`, réalisation `c445659`).
- Statut de fin : implémentée et vérifiée sur le périmètre décrit. Critères C1/C2/C3/C4/C5 relus avec les preuves ci-dessus ; branche basée sur `main` sans `feat/spec-01`/`feat/spec-02`/`feat/spec-05` encore mergées (voir écarts dans chaque entrée IMPLEMENTATION) ; aucun plan de migration/retour arrière demandé.
