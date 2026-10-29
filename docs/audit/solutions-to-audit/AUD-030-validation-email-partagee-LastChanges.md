# AUD-030 — Réutiliser une validation d'email corrigée à l'inscription

Statut : correction et réutilisation sélectionnées par Maia le 26 octobre 2026 ; non implémentées. Nouvelle issue distincte d'AUD-027 ; source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `src/utils/validators.ts:1–4` expose isValidEmail, fondé sur la même expression à retours arrière que `src/app/actions/auth.ts:13`. La recherche dans src/tests/scripts n'identifie aucun appel d'isValidEmail ; signup utilise sa propre expression pour vérifier l'email et extraire le domaine. Le fichier validators.ts possède d'autres consommateurs, mais cela ne rend pas isValidEmail utilisé.

SonarQube : alerte 14/16, `typescript:S8786`, MAJOR, clé `db0c43c1-deb5-4273-9c6e-f6e1d57c5d76`. [Export](../evidence/sonarqube-20261026/issues.json). Le motif est identique à celui caractérisé dans [AUD-027](AUD-027-validation-email-bornee-LastChanges.md) ; aucune nouvelle mesure ni exploitation de cette fonction sans consommateur identifié n'est revendiquée.

Pourquoi examiner : réutiliser le validateur tel quel déplacerait le coût problématique sans le supprimer. Conserver deux validations indépendantes expose aussi à leur divergence lors d'une correction. Le défaut est latent dans cette fonction actuellement sans appel trouvé ; l'inscription présente déjà le parcours actif suivi par AUD-027.

## Décision et piste de solution

Maia choisit explicitement de réutiliser la fonction à l'inscription après correction, de partager une seule validation et de conserver l'extraction du domaine, puis demande un nouvel AUD. Cette issue n'est donc pas un risque assumé ; priorité P2 pour la correction commune avec AUD-027.

[SPEC-13 LastChanges](../../specs/SPEC-13-validation-email-bornee-LastChanges.md) couvre désormais AUD-027 et AUD-030 dans un résultat cohérent : corriger isValidEmail dans validators.ts, puis l'appeler depuis signup. Conserver son export et sa signature `(value: string): boolean`. L'action vérifie d'abord le type puis appelle isValidEmail ; après succès, elle extrait le domaine après l'unique @ et applique la même conversion en minuscules qu'actuellement. Aucune deuxième validation indépendante n'est conservée dans l'action.

La proposition initiale de SPEC-13 d'un fichier signup-email.ts séparé est remplacée par l'utilisation du validateur existant. Borne technique préalable de 4096 unités UTF-16 et parcours déterministe définis dans SPEC-13 ; préservation de la grammaire actuelle sous cette borne. Ce plafond est un choix de préparation, pas une norme d'email.

Alternatives : supprimer l'export inutilisé et garder une validation corrigée dans l'action (non retenu par Maia) ; conserver les deux expressions (risque de divergence) ; réutiliser la fonction sans correction (coût conservé, rejeté).

## Validation et limites

À vérifier : appel réel du validateur corrigé depuis signup, borne avant parcours, corpus positif/négatif identique pour helper/action, domaine extrait inchangé, transaction entreprise/compte, rôle et connexion après commit conservés. Ne pas supprimer ou affaiblir les assertions existantes.

Acquis : inspection et recherche de consommateurs au SHA indiqué. Aucun changement de code, aucun test de correction exécuté ; absence d'appel trouvé n'est pas une preuve formelle de non-utilisation externe. L'implémentation et la validation restent à réaliser selon SPEC-13. Pas de section IMPLEMENTATION pour cette nouvelle fiche de préparation.

## IMPLEMENTATION

### 29 octobre 2026 — SPEC-13, signup appelle le validateur partagé

Statut : implémentée et vérifiée sur le périmètre unitaire décrit ; E2E à vérifier par la CI, Docker absent localement.
Spec : [SPEC-13](../../specs/SPEC-13-validation-email-bornee-LastChanges.md). Révision de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Réalisation : branche `feat/spec-13`, diff local du 29 octobre 2026. Borne de longueur décrite dans [AUD-027](AUD-027-validation-email-bornee-LastChanges.md#implementation).

#### Ce qui a été implémenté

L'action `signup` possédait sa propre expression `EMAIL_PATTERN` indépendante du validateur partagé. Elle est supprimée : `signup` importe et appelle désormais `isValidEmail` (validateur corrigé et borné), après avoir vérifié que l'email est une chaîne. Le domaine est extrait de l'unique `@` déjà validé via `email.slice(email.indexOf('@') + 1).toLowerCase()`, sans réexécuter l'analyse ; l'adresse originale reste stockée inchangée. La transaction entreprise/compte, l'attribution de rôle, le hachage et `signIn` ne sont pas déplacés.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/app/actions/auth.ts : import `isValidEmail`, suppression de `EMAIL_PATTERN` | Une seule implémentation de format/longueur | L'action réutilise le validateur partagé |
| src/app/actions/auth.ts : `signup` (contrôle de champs, extraction domaine) | `!isValidEmail(email)` après contrôle de type ; domaine via `indexOf('@')` | Refus avant toute opération coûteuse |

#### Nouveau fonctionnement

Formulaire signup → action → `typeof email !== 'string'` (court-circuit : si l'email est absent, `isValidEmail` n'est pas appelé) → `isValidEmail(email)` → refus renvoie le message existant, sans `bcrypt.hash`, `getPool().connect()` ni `signIn`. En cas de succès, domaine = partie après `@` en minuscules, `companyName = domain.split('.')[0]`, transaction et connexion inchangées. Comportements AUD-013 (atomicité, doublon, concurrence, panne après commit) préservés.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npx vitest run tests/unit/signup-email-action.test.ts` | EMAIL-001/007/009/010 conformes | exit 0, 4/4 réussis | Sortie locale 2026-10-29, Node 24.6.0 |
| `npx vitest run tests/unit/signup-email.test.ts tests/unit/signup-email-action.test.ts` | Tous verts | exit 0, 9/9 | Sortie locale 2026-10-29 |
| `npm run typecheck` / `npm run lint` / `npm run build` | exit 0 | exit 0 | Sortie locale 2026-10-29 |
| `tests/e2e/signup.spec.ts` INS-001…008, EMAIL-008 | Parcours existants + refus borne, aucune régression | Non exécuté localement : Docker absent | À vérifier sur GitHub Actions |

#### Écarts et limites

Aucun écart avec SPEC-13 : l'expression locale est supprimée, l'extraction du domaine conserve le résultat historique (vérifié par EMAIL-010 sur casse, sous-domaines et points admis). Les cas E2E, dont la conservation des parcours AUD-013, restent à exécuter en CI avec les services jetables.


### 29 octobre 2026 — Correction de revue C7

Statut : implémentée, validation distante incomplète. Spec : [SPEC-13](../../specs/SPEC-13-validation-email-bornee-LastChanges.md). Base : `0f7edf376237bdbee2d9ac845b329da4bc2a7232`, réalisation : diff de revue du 29 octobre 2026.

#### Ce qui a été implémenté

L’ancienne entrée « aucun écart avec SPEC-13 » était trop affirmative : la regex bornée ne satisfaisait pas le parcours sans retours arrière de C7. `src/utils/validators.ts`, `isValidEmail`, utilise désormais une boucle unique avec contrôle préalable de longueur, refus des blancs et de plusieurs @, et recherche d’un point intérieur au domaine. Le parcours signup → validateur partagé → domaine → transaction reste inchangé.

#### Validation et preuves

9/9 unitaires ciblés réussis ; corpus historique enrichi pour les blancs et points aux frontières ; lint et types exit 0. Mesures synthétiques avant/après, cinq répétitions et quatre tailles : [JSON](../evidence/spec13-review-20261029/email-comparison.json), [script](../evidence/spec13-review-20261029/email-comparison.mjs). Les sorties brutes ne démontrent aucun débit HTTP.

#### Écarts et limites

Build local bloqué par l’accès Google Fonts ; EMAIL-008 et la non-régression INS doivent être exécutés en CI avec PostgreSQL/S3 jetables. Aucun résultat E2E inventé. Le préfixe de l’entrée précédente reste conservé.
