# G10 — Droits selon le rôle actuel

Source : `265924bc7274047989e708ab635c2854d376230f`. Discussion du 14 octobre 2026. Sujet distinct du secret AUD-010, toujours reporté.

OBSERVATION : `src/lib/auth.ts:45–55` conserve le rôle dans le token puis la session sans relecture DB dans ces callbacks. La route `src/app/api/hr/users/route.ts:8–17` autorise selon cette copie, puis interroge users sans recontrôler le rôle actuel du demandeur. Une modification du rôle en base peut laisser le contrôle de route fondé sur une ancienne permission. Effets runtime non testés ; ne pas généraliser à toutes les routes ni supposer RLS effectivement active.

## Règle retenue

Les accès doivent évoluer selon le rôle actuel : chaque nouvelle requête protégée doit être autorisée selon les permissions actuelles, sans attendre une déconnexion. Garder les contrôles entreprise, rattachement manager et ressource. Aucune interface de modification de rôle sélectionnée. La révocation de liens S3 déjà émis et les requêtes déjà en cours sont des frontières distinctes.

## Mécanisme retenu

Utiliser la session pour identifier le demandeur, puis relire son rôle actuel côté serveur avant d'autoriser l'action. Si le compte n'existe plus, refuser. Ne pas accepter un rôle fourni par le navigateur et ne pas considérer sa copie en session comme l'autorité. Préserver les contrats publics et l'UI. Méthode SQL et garanties en cas de changement concurrent à définir ; ne pas promettre une révocation instantanée d'une action déjà engagée.

Alternative : conserver le rôle jusqu'à reconnexion, incompatible avec la règle retenue. Révocation/versionnement des sessions possible mais plus d'état ; cache de rôle retarde la prise en compte, non sélectionné. Relecture : accès DB supplémentaire à chaque requête.

Statut : règle et mécanisme acceptés. Relire le rôle actuel côté serveur à chaque requête protégée et autoriser selon ce rôle, en conservant l'identité authentifiée et les périmètres entreprise/manager/ressource. Validation prévue sur environnement isolé : session inchangée, rôle modifié, prochaine action conforme aux nouveaux droits ; contrôles positifs et périmètres entreprise/manager conservés. 0 test exécuté, aucune implémentation. Le contrôle couvre les nouvelles requêtes ; le comportement des actions déjà engagées et liens déjà émis reste distinct.

## Actualisation des preuves — campagne du 14–15 octobre

Rôle manager rétrogradé en DB, session conservée : nouvelle liste manager toujours 200. Correction de lecture du rôle actuel non implémentée. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-19 — SPEC-06, personne C

Statut : implémentée, validation incomplète (les suites complètes api/e2e sont rapportées dans une entrée suivante de cette section).
Spec : [SPEC-06](../../specs/SPEC-06-droits-actuels.md). Révision de départ : `7377486`. Réalisation : `6a8b971` (correction) et `c1af070` (tests), branche `feat/spec-06`.

#### Ce qui a été implémenté

Les gardes serveur des 13 routes API qui appelaient `auth()` utilisent désormais `currentSession()`. La session ne fournit que l'identité ; le rôle et l'entreprise sont relus en base à chaque requête protégée. Un changement de rôle, d'entreprise ou de rattachement est donc effectif à la requête suivante sans reconnexion, et un compte supprimé est refusé. Les codes de refus existants sont conservés (401 pour les routes employé et manager, 403 pour les routes RH). Les pages serveur (`hr/page.tsx`, `manager/page.tsx`, `layout.tsx`) et `src/lib/auth.ts` ne sont pas modifiés : le menu et le message d'accès restent fondés sur la copie de session jusqu'à la reconnexion, mais aucune donnée n'est servie sans passer par une API contrôlée.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/lib/current-session.ts, `currentSession` (l. 20) | Nouvelle fonction : identité par `auth()`, puis `SELECT id, role, company_id FROM users WHERE id = $1` ; `null` si le compte n'existe plus | Source unique du rôle et de l'entreprise actuels pour les gardes |
| src/app/api/expense-notes/route.ts (GET, POST), src/app/api/expense-notes/[id]/receipt-url/route.ts, src/app/api/expense-notes/receipt-suggestion/route.ts | `await auth()` remplacé par `await currentSession()` | Un compte supprimé n'est plus authentifié côté employé |
| src/app/api/manager/expense-notes/route.ts, .../[id]/approve, .../[id]/reject, .../[id]/receipt-url | idem | Le rôle manager est celui de la base |
| src/app/api/hr/expense-notes/route.ts, .../[id]/approve, .../[id]/reject, .../[id]/receipt-url, src/app/api/hr/users/route.ts, src/app/api/hr/users/[id]/manager/route.ts | idem | Le rôle RH est celui de la base |

#### Nouveau fonctionnement

Requête protégée → `currentSession()` lit l'identité de la session puis la ligne `users` correspondante → pas de session ou ligne absente : refus 401 (employé, manager) ou 403 (RH) → rôle de la base différent du rôle exigé : même refus → sinon la route poursuit avec le rôle et l'entreprise de la base, sans modifier ses requêtes d'autorisation propres. Si la lecture en base échoue, la route échoue en 500 : aucun accès n'est accordé. Une action déjà engagée et un lien de reçu déjà émis ne sont pas révoqués, conformément à la règle retenue. Coût : une lecture supplémentaire par requête protégée.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:issue -- G10` (DB et S3 jetables du harnais) | 3 cas d'origine rouges verts, nouveaux cas verts | exit 0 ; 11/11 réussis : DROIT-019 à 021 (origine) et DROIT-022 à 027, 034, 035 (ajoutés) | Sortie locale 2026-10-19, `reports/issues.json` |
| Les mêmes nouveaux cas sur le code de `main` (clone jetable) | Les cas `correction` échouent | DROIT-022 à 027 : 6 échecs sur 6 ; DROIT-034 et 035 réussis (cas `reference`) | Sortie locale 2026-10-19 |
| `npm run lint` ; `npm run typecheck` ; `npm run build` | exit 0 | exit 0 chacun (1 avertissement lint préexistant dans `docs/audit/evidence/comment-audit/controle.cjs`) | Sortie locale 2026-10-19 |
| Suites unitaire, api et e2e complètes | Aucune régression | Non exécutées au moment de cette entrée | À ajouter dans une entrée suivante |

#### Écarts et limites

Écart : les pages serveur conservent le rôle de session pour l'affichage (voir plus haut). Non prouvé : la révocation d'actions en cours et de liens déjà émis, hors périmètre retenu. Tests du professeur absents. Les tests injectent les changements de rôle par SQL direct avec le compte superuser du harnais ; ils prouvent le comportement des routes, pas l'effet des politiques RLS (SPEC-09).

### 2026-10-19 — SPEC-06 : suites complètes et classement des échecs

Statut : implémentée et vérifiée sur le périmètre décrit (compléments d'exécution de l'entrée précédente).
Spec : [SPEC-06](../../specs/SPEC-06-droits-actuels.md). Révision exécutée : `a62e6c5` (code applicatif identique à `6a8b971`, puis tests `c1af070` et documentation).

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:unit` | 6/6 | exit 0 ; 6/6 réussis | `reports/unit.json`, 2026-10-19 |
| `npm run test:api` (suite complète) | Aucune régression ; DROIT-019 à 021 verts | exit 1 ; 79 réussis, 46 échoués sur 125 (référence `main` : 61/112). G10 : 11/11 réussis | `reports/issues.json` |
| `npm run test:e2e` (suite complète) | Aucune régression | exit 1 ; 38 réussis, 22 échoués sur 60 (référence `main` : 38/60, mêmes cas) | `reports/issues.json` |
| `npm run test:report` | Bilan agrégé | exit 1 ; 123 réussis, 68 échoués sur 191 | `reports/issues.json` |

Comparaison avec la CI de `main` au même SHA de départ (run `39037399251`, 105/178 réussis) : aucun cas vert sur `main` n'est rouge ; 5 cas passent du rouge au vert (DROIT-013, 014, 019, 020, 021) ; 13 cas ajoutés, tous verts ; les 68 échecs restants étaient déjà rouges sur `main` et appartiennent à d'autres lots (AUD-003/004/005/008/009/013/014/015/016/017/018/020/021, G14, AFF-011 d'AUD-006, AUD-007). Exécution locale sous Node 24.13.0 (la CI GitHub utilise 24.21.0) ; la CI GitHub n'a pas été exécutée pour cette branche.
