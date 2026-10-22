# AUD-023 — Qualifier les alertes de dépendances

Statut : observation nouvelle lors de l'installation propre du 14 octobre 2026 ; qualification et proposition, aucune mise à jour sélectionnée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème, localisation et fonctionnement original

`package.json:20–21` fixe Next à 16.3.5 et déclare Auth.js ; `package-lock.json` fixe les versions transitives réellement installées. `package.json:37` fixe également eslint-config-next à 16.3.5. Les versions proviennent du dépôt ; npm ci les installe sans les corriger automatiquement.

MEASUREMENT : npm ci isolé réussit, mais npm audit signale huit packages (sept high, un critical) et sort avec 1. [Rapport brut](../evidence/runtime-20261014/audit-dependencies.json). Packages signalés : next, sharp, source-map-js et la chaîne de développement eslint-config-next/@next/eslint-plugin-next/fast-glob/micromatch/braces. Plusieurs lignes sont liées à la même alerte, pas à huit chemins d'attaque indépendants.

Pourquoi examiner : des défauts de bibliothèques peuvent affecter les frontières du framework ou l'outillage, même si le code métier est correct. Mais une version dans une plage signalée ne prouve pas qu'un chemin vulnérable est accessible ici.

## Qualification initiale et proposition

L'[avis publié par Next](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) concerne l'ImageResponse Node avec valeurs attaquant contrôlées rendues dans SVG. La recherche source n'identifie aucun import next/og ou ImageResponse dans src. Cela réduit l'applicabilité de ce chemin précis ; ne pas annoncer une RCE démontrée dans Expense.io. Les autres avis, les routes implicites du framework et le mode développement restent à qualifier. [Avis sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [avis braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) : sources consultées, aucune exploitation exécutée.

PROPOSITION : examiner chaque avis et son usage, retenir des mises à jour compatibles de sécurité, puis relancer installation, lint/types/build et parcours de référence. Garder framework et eslint-config-next cohérents. Ne pas suivre aveuglément les recommandations automatiques du scanner : il propose notamment un retour majeur d'eslint-config-next vers 14.2.35, alors que Next est en 16.3.5. Aucune version cible ni régression acceptable n'est choisie dans cette fiche.

Alternatives : conserver temporairement une version avec justification précise si un chemin n'est pas applicable ; mettre à jour les dépendances ciblées ; changement majeur plus coûteux seulement si nécessaire. Une alerte ne justifie pas de réécrire les routes, changer le style REST ou modifier l'UI.

## Validation et priorité

Priorité proposée : P1 pour qualifier les alertes de production, P2 pour le traitement ciblé de l'outillage selon exposition. Aucun exploit, patch ou bénéfice vérifié. Rapporter les avis résolus/restants et pourquoi, ainsi que les résultats des contrôles, sans ignorer les tests de référence. Ce nouveau point provient d'une mesure effectivement demandée, pas d'un élargissement fonctionnel décidé.

## IMPLEMENTATION

### 2026-10-18 — SPEC-12, personne A

Statut : qualification réalisée pour les 8 lignes du rapport (7 avis `next` inclus) ; **aucune mise à jour de dépendance effectuée dans ce lot**, conformément au périmètre (C4). Ceci est une qualification/proposition, pas une correction applicative.
Spec : [SPEC-12](../../specs/SPEC-12-qualification-dependances.md). Révision de départ : `7377486`. Réalisation (qualification documentaire seulement) : diff local daté 2026-10-18, aucun commit de code.

#### Ce qui a été implémenté

`npm audit --json` relancé dans ce dépôt (installation déjà isolée, lecture seule) : même résultat que la campagne du 14 octobre (7 high/1 critical/8 au total), confirmant l'absence de dérive. Chaque avis a été relu à sa source primaire (API publique GitHub Advisory, `published_at` réel) puis confronté à une recherche effective dans `src` et à la configuration déclarée (`next.config.ts`, sortie de `npm run build`) pour établir l'applicabilité réelle plutôt que la seule présence dans la plage de version signalée.

#### Où

| Fichier et repère | Modification | Rôle |
| --- | --- | --- |
| docs/audit/evidence/dependances-20261018/audit.json | Nouveau | Rapport brut `npm audit --json` du 18 octobre |
| docs/audit/evidence/dependances-20261018/qualification.md | Nouveau | Qualification avis par avis, sources primaires, applicabilité, priorité proposée |
| package.json, package-lock.json | **Aucune** | Aucune mise à jour sélectionnée dans ce lot |

#### Nouveau fonctionnement

Aucun changement de comportement applicatif : ce lot est une qualification documentaire. Résumé des conclusions (détails et sources dans [qualification.md](../evidence/dependances-20261018/qualification.md)) :

- **next@16.3.5** (critique, 7 avis regroupés) : aucun des sept n'est applicable au code/config réels — RCE `next/og` (aucun import), SSRF image (aucun `images.remotePatterns`), fuite Draft Mode/`use cache` (directive jamais utilisée), deux empoisonnements de cache SSG/ISR (app 100 % App Router et dynamique, aucune page statique/ISR, aucun catch-all racine), fuite métadonnées image (aucune route `opengraph-image`/`generateStaticParams`), fuite endpoint MCP de dev (`next dev` uniquement, jamais exécuté en test/CI/production). Mise à jour non majeure `16.4.2` disponible, raisonnable en défense en profondeur mais non appliquée ici.
- **Chaîne ESLint** (`@next/eslint-plugin-next`/`braces`/`fast-glob`/`micromatch`/`eslint-config-next`, high) : `eslint-config-next` est en `devDependencies`, jamais chargée par le serveur en service — aucune surface d'attaque exposée. Le correctif automatique proposé (`eslint-config-next@14.2.35`) est un retour majeur incompatible avec Next 16.3.5 (C3) : non retenu.
- **sharp** (transitive, optionnelle de `next`, high) : chemin vulnérable (décodage SVG) jamais exercé, `next/image` n'étant utilisé nulle part. Patch `0.35.5` disponible, à faible risque, non appliqué dans ce lot.
- **source-map-js** (transitive via PostCSS/Tailwind/Vite, high) : exposition seulement au moment du build sur le contenu du dépôt, jamais à l'exécution face à un tiers. Patch `1.2.2` disponible, à faible risque, non appliqué dans ce lot.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm audit --json` | Compte réel des avis, pas d'invention | 8 lignes de rapport (7 high/1 critical), identique au 14 octobre | [audit.json](../evidence/dependances-20261018/audit.json) |
| Sources primaires par avis | Date et condition d'applicabilité réelle, pas seulement le titre | 12 avis distincts relus (7 `next` + 1 braces + 1 sharp + 1 source-map-js, plus recoupement) via `api.github.com/advisories/<id>` | [qualification.md](../evidence/dependances-20261018/qualification.md) |
| `npm run lint` ; `npm run typecheck` ; `npm run build` | exit 0 chacun (aucun changement attendu) | exit 0 chacun ; build confirme 100 % routes dynamiques (`ƒ`), aucune SSG/ISR | Sortie locale 2026-10-18 |
| `git status` sur package.json/package-lock.json | Aucune modification | Confirmé : fichiers non touchés par ce lot | Sortie locale 2026-10-18 |

#### Écarts et limites

Qualification fondée sur une recherche statique (`grep`) et la configuration déclarée, pas sur un test d'intrusion ; un chemin d'usage dynamique non détecté par cette méthode resterait non couvert. Aucune mise à jour sélectionnée ni appliquée (conforme à C4) : les alertes restent ouvertes, avec leurs motifs d'applicabilité consignés. Si une mise à jour ciblée est décidée plus tard, la liste des contrôles à relancer est donnée dans [qualification.md](../evidence/dependances-20261018/qualification.md).

### 2026-10-19 — SPEC-12, qualification nuancée après revue (personne A)

Statut : qualification révisée ; **aucune mise à jour de dépendance effectuée** (C4).
Spec : [SPEC-12](../../specs/SPEC-12-qualification-dependances.md). Révision de départ : `feat/spec-12` actualisée avec `main` `651b067`. Réalisation : commit documentaire de cette entrée.

#### Ce qui a été implémenté

La [revue du 19 octobre](../revue-pr-g4bi2004-20261019.md) relève (P2, C1/C2) deux conclusions trop absolues dans l'entrée du 18 octobre et dans la qualification :
- L'avis MCP de `next dev` était classé « hors exécution ». Or le dépôt documente `make dev` / `npm run dev`, donc `next dev` tourne sur les postes de développement.
- La chaîne ESLint était qualifiée de « risque nul ». Or la CI lint le contenu de toute pull request.

Une recherche d'imports ne prouve pas non plus l'absence de chemins internes au framework. Ces affirmations du 18 octobre sont conservées et corrigées ici. La [qualification](../evidence/dependances-20261018/qualification.md#révision-du-19-octobre-2026--après-revue) reçoit une révision qui sépare production, CI et développement local, et qui indique pour chaque avis s'il s'agit d'une observation, d'une hypothèse ou d'une incertitude.

#### Nouveau fonctionnement

Conclusions révisées, sans changement applicatif :
- **Développement local** : GHSA-39w2-rjm5-chcv est **applicable**. Un site malveillant visité pendant que `next dev` tourne peut lire des données de développement. Sévérité faible ; fermé par `next@16.4.2` (non majeure), désormais proposée en P2.
- **CI** : `braces` et `source-map-js` sont des expositions **conditionnelles** de disponibilité. Elles supposent une contribution malveillante dont le contenu est linté ou buildé, avec pour effet l'échec du job, sans accès aux secrets (droits en lecture seule).
- **Production** : aucune exposition observée dans la configuration actuelle. Une incertitude résiduelle demeure sur `/_next/image` et `sharp` : le chemin interne existe sans import `next/image`, mais le décodage SVG n'est pas activé (`dangerouslyAllowSVG` absent). C'est déduit de la configuration, non vérifié par exécution.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| Relecture des commandes réellement exécutées par contexte | Production, CI et développement distingués | `package.json` (`dev`, `build`, `start`), `README.md:13,30`, `Makefile:46`, `.github/workflows/ci.yml` (déclenchée sur `pull_request`, `contents: read`) | [Révision](../evidence/dependances-20261018/qualification.md#révision-du-19-octobre-2026--après-revue) |
| Avis primaire GHSA-39w2-rjm5-chcv | Condition d'exposition explicite | « Only applications run with `next dev` are affected » : exposition des postes de développement confirmée, pas de la production | Avis consulté via l'API GitHub Advisory |
| `package.json` / `package-lock.json` | Inchangés | Inchangés | `git diff` |
| Garde append-only | Préfixes conservés | `check` réussi avec `/tmp/arla-spec-12-review-gf.json` | Sortie locale 2026-10-19 |

#### Écarts et limites

Aucune exploitation tentée. Les expositions CI sont des hypothèses fondées sur le texte des avis, non reproduites. La conclusion sur `sharp` repose sur la configuration et les valeurs par défaut du framework, pas sur une exécution. SPEC-12 reste `manual-review` : la qualification doit être relue humainement, aucun test automatique ne la valide.

### 2026-10-22 — SPEC-12 : précision du comptage et des limites CI

Statut : qualification documentaire relue ; aucune dépendance mise à jour. Référence : `3c8af43`, diff documentaire local du 22 octobre.

#### Ce qui a été précisé et où

`docs/audit/evidence/dependances-20261018/qualification.md` reçoit une précision : 10 identifiants GHSA distincts (sept Next, braces, sharp, source-map-js), et huit entrées de paquets npm. La mention historique « 12 avis distincts » était erronée ; elle est conservée et corrigée ici. La synthèse de SPEC-12 reprend les conclusions nuancées du 19 octobre, plutôt que l'ancienne absence générale d'applicabilité.

#### Fonctionnement et validation

Aucun parcours applicatif ne change. Relecture manuelle des identifiants listés, de `package.json` et de `.github/workflows/ci.yml` : pas de modification du manifeste ni du verrou de dépendances ; le workflow ne référence pas de secret utilisateur. Les droits GitHub en lecture seule ne constituent pas une preuve générale d'absence de secrets ; la conclusion est limitée aux effets décrits par les avis. Aucun nouvel audit réseau ni test d'exploitation réalisé. SPEC-12 conserve son mode `manual-review` ; aucune réussite automatique n'est attribuée à cette qualification.

#### Limites

Les versions proposées sont celles de la collecte datée, à revalider avant mise à jour. Cette relecture ne transforme pas les hypothèses d'exposition en résultats d'exploitation. Le texte historique est intégralement conservé.
