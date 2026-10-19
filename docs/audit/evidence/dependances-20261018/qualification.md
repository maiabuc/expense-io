# Qualification des alertes de dépendances — 18 octobre 2026

> **Révisé le 19 octobre 2026** : les conclusions « dev uniquement, hors exécution » (endpoint MCP) et « risque nul » (chaîne ESLint) sont remplacées par la [révision en fin de document](#révision-du-19-octobre-2026--après-revue), qui sépare production, CI et développement local.

SPEC-12, personne A. Départ : `7377486` (main actualisé). Commande exécutée dans ce dépôt (installation déjà isolée de tout service utilisateur, aucune modification de fichier) :

```bash
npm audit --json > docs/audit/evidence/dependances-20261018/audit.json
```

Résultat brut : [audit.json](audit.json). `metadata.vulnerabilities` : `{"high":7,"critical":1,"total":8}`, identique au rapport du 14 octobre (`../runtime-20261014/audit-dependencies.json`) — aucune dérive depuis la dernière mesure, même `package-lock.json`. Comme déjà noté dans AUD-023 : 8 lignes de rapport ne constituent pas 8 chemins d'attaque indépendants — `next` à lui seul regroupe 7 avis distincts sous une seule entrée (sévérité = la plus haute des sept), et la chaîne `@next/eslint-plugin-next → fast-glob → micromatch → braces → eslint-config-next` est une seule alerte (braces) propagée par les relations de dépendance de l'outillage ESLint.

Sources primaires consultées via l'API publique GitHub Advisory (`api.github.com/advisories/<id>`, lecture seule, aucune authentification requise ni utilisée) pour chaque avis, avec sa date de publication réelle.

## next@16.3.5 (directe) — critique (7 avis regroupés)

| Avis | Sévérité | Publié | Condition d'applicabilité réelle (source primaire) | Applicable ici ? |
| --- | --- | --- | --- | --- |
| [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) — RCE dans `next/og` `ImageResponse` | critical | 2026-09-30 | Nécessite un import `next/og` rendant une valeur contrôlée par l'attaquant dans du SVG | **Non** — recherche `grep -rn "next/og\|ImageResponse" src` : aucune occurrence |
| [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) — SSRF dans l'optimisation d'image | high | 2026-10-07 | « If no `images.remotePatterns` are configured, your app is not affected » (texte de l'avis) | **Non** — `next.config.ts` ne définit aucune clé `images` |
| [GHSA-3w37-wq28-93x7](https://github.com/advisories/GHSA-3w37-wq28-93x7) — fuite Draft Mode via `use cache` | medium | 2026-10-07 | Nécessite des remplissages `"use cache"` en attente partagés entre requêtes Draft Mode et régulières | **Non** — `grep -rln "use cache" src` et `grep -rn draftMode src` : aucune occurrence, la directive n'est jamais utilisée |
| [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) — empoisonnement de cache SSG/ISR (self-hosted, **Pages Router**) | medium | 2026-10-07 | Nécessite le **Pages Router** avec pages SSG/ISR, en self-hosted (Vercel non affecté) | **Non, doublement** — l'app n'utilise que l'**App Router** (aucun répertoire `pages/`) et `npm run build` confirme que les 20 routes sont `ƒ` (dynamiques, aucune page statique/ISR) |
| [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) — empoisonnement de cache SSG/ISR via catch-all racine | medium | 2026-10-07 | Nécessite une page catch-all racine combinée à des routes SSG/ISR | **Non** — aucune page catch-all racine (`src/app` ne contient pas de `[...slug]` à la racine) ni de route SSG/ISR |
| [GHSA-f87g-xv8r-7p7x](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) — fuite via `dynamicParams` sur les images de métadonnées (`opengraph-image`/`twitter-image`, build webpack) | medium | 2026-10-07 | Nécessite des routes `opengraph-image`/`twitter-image` avec `generateStaticParams()` | **Non** — `grep -rn generateImageMetadata\|generateStaticParams src` : aucune occurrence, aucune route de métadonnées image dans ce projet |
| [GHSA-39w2-rjm5-chcv](https://github.com/advisories/GHSA-39w2-rjm5-chcv) — fuite d'info sur l'endpoint MCP du serveur de dev | low | 2026-10-07 | « Only applications run with `next dev` are affected. Production deployments do not serve this endpoint. » (texte de l'avis) | **Dev uniquement, hors exécution** : tests/CI/production utilisent `next start` (build de production), jamais `next dev` |

**Conclusion next :** aucun des sept avis n'est applicable au code et à la configuration réels de ce dépôt — le seul qui ait une applicabilité même partielle (l'endpoint MCP) est strictement limité au serveur de développement local, jamais exécuté par la CI ni par cette application déployée. La mise à jour corrective proposée par `npm audit` (`next@16.4.2`, non majeure) reste néanmoins une proposition raisonnable de défense en profondeur, à sélectionner et tester séparément (C4) : elle ne change aucun des constats d'applicabilité ci-dessus, mais ferme les sept avis dans le rapport.

## Chaîne de développement ESLint (transitive) — high : `@next/eslint-plugin-next`, `braces`, `fast-glob`, `micromatch`, `eslint-config-next` (directe, devDependency)

| Avis | Sévérité | Publié | Condition d'applicabilité réelle | Applicable ici ? |
| --- | --- | --- | --- | --- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) — `braces` : épuisement de pile via motifs imbriqués | high | 2026-09-18 | Nécessite qu'un attaquant fournisse un motif glob traité par `braces`/`micromatch`/`fast-glob` | **Non en production** — `eslint-config-next` est en `devDependencies` (confirmé dans `package.json`), chargé seulement par `npm run lint` sur le code du dépôt (source fiable), jamais par le serveur exécuté ni par une requête utilisateur |

**Conclusion ESLint :** aucune surface d'attaque exposée à un tiers : ces paquets ne font partie d'aucun chemin exécuté par l'application en service, seulement de l'outillage de développement exécuté localement/en CI sur le code source du dépôt lui-même. Le correctif proposé automatiquement par `npm audit` (`eslint-config-next@14.2.35`) est un **retour majeur** incompatible avec Next 16.3.5 (C3 : garder Next/eslint-config-next cohérents) — non retenu. Conservation temporaire justifiée : risque nul en l'absence de surface d'attaque, en attendant une version d'`eslint-config-next` 16.x corrigeant sa dépendance à `fast-glob`/`braces` en amont.

## sharp (transitive, optionnelle via `next`) — high

| Avis | Sévérité | Publié | Condition d'applicabilité réelle | Applicable ici ? |
| --- | --- | --- | --- | --- |
| [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) — vulnérabilité dans `librsvg` (CVE-2026-96889) | high | 2026-10-06 | Décodage SVG par `sharp` (`VipsForeignLoadSvg`) sur Linux glibc, sous conditions runtime précises | **Non exercé** — aucun `require('sharp')`/import dans `src` ; `sharp` est une dépendance optionnelle de `next` (confirmée `optional: true` dans `package-lock.json`), installée pour l'optimisation d'image de `next/image` qui n'est utilisée nulle part dans ce projet (aucun `import ... from 'next/image'`) |

**Conclusion sharp :** le chemin vulnérable (décodage SVG) n'est jamais exercé par ce code. Version installée `0.35.4`, dernière publiée `0.35.5` (patché) : une épingle via le champ `overrides` de `package.json` vers `sharp@>=0.35.5` serait un correctif de défense en profondeur à coût quasi nul (patch, pas de breaking change attendu puisque le paquet n'est pas directement consommé), à appliquer dans un changement distinct (C4).

## source-map-js (transitive, build-time via PostCSS/Tailwind) — high

| Avis | Sévérité | Publié | Condition d'applicabilité réelle | Applicable ici ? |
| --- | --- | --- | --- | --- |
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — déni de service par blocage de la boucle d'événements | high | 2026-09-18 | Nécessite qu'un attaquant fournisse une source map indexée avec des décalages arbitraires, *parsée à l'exécution* | **Non en exécution** — `npm ls source-map-js` montre que ce paquet n'arrive que via la chaîne PostCSS (`@tailwindcss/postcss`, `next`'s postcss, `vite`/`vitest`) : il ne traite que des feuilles de style du dépôt pendant `npm run build`/tests, jamais une source map fournie par un utilisateur final au moment d'une requête HTTP |

**Conclusion source-map-js :** exposition uniquement au moment du build sur du contenu de confiance (le dépôt lui-même), pas à l'exécution face à un tiers. Versions installées hétérogènes (`1.2.1` la plupart des chemins, `1.2.2` déjà via `vite`) : un `overrides` vers `>=1.2.2` uniformiserait sans changement fonctionnel attendu, à appliquer dans un changement distinct (C4).

## Synthèse et priorité proposée (C1–C4)

| Paquet | Direct/transitif | Usage effectif | Applicabilité | Priorité proposée |
| --- | --- | --- | --- | --- |
| next | directe | Framework complet, en production | Aucun des 7 avis applicable au code/config actuels (dev-only pour 1 des 7) | P2 — mise à jour non majeure `16.4.2` raisonnable en défense en profondeur, à sélectionner séparément |
| eslint-config-next + 4 transitives | directe (dev) / transitives | Lint uniquement, jamais en service | Non applicable (pas de surface d'attaque exposée) | P3 — conserver, réexaminer si un correctif non majeur apparaît en amont |
| sharp | transitive, optionnelle | Jamais invoqué (aucun `next/image`) | Non exercé | P3 — patch low-risk disponible (`>=0.35.5`), sans urgence |
| source-map-js | transitive | Build uniquement, contenu de confiance | Non exercé à l'exécution | P3 — patch low-risk disponible (`>=1.2.2`), sans urgence |

**C4 — aucune mise à jour réalisée dans ce lot.** `package.json` et `package-lock.json` restent inchangés par cette qualification ; `git diff` ne montre aucune modification de ces fichiers. Les alertes ci-dessus restent ouvertes et leurs motifs consignés.

**C3 — si une mise à jour ciblée est sélectionnée plus tard**, relancer dans l'ordre : `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit`, `npm run test:api`, `npm run test:e2e`, `npm run test:report`, puis `npm audit --json` pour confirmer la fermeture des avis visés sans en introduire de nouveaux. Vérifier en particulier que `next` et `eslint-config-next` restent sur des gammes majeures cohérentes (tous deux en 16.x) si l'un des deux est mis à jour.

## Limites

Qualification fondée sur une recherche statique du code source (`grep`) et la configuration déclarée (`next.config.ts`) : elle ne remplace pas un test d'intrusion. Un chemin d'usage dynamique non détecté par cette recherche (ex. génération de code, import indirect) resterait non détecté par cette méthode. Aucune exploitation n'a été tentée. Toutes les dates de publication proviennent de l'API publique GitHub Advisory (`published_at`), consultée le 18 octobre 2026.

## Révision du 19 octobre 2026 — après revue

La [revue du 19 octobre](../../revue-pr-g4bi2004-20261019.md) relève (P2, C1/C2) deux formulations trop absolues ci-dessus : l'exposition en développement est écartée alors que le dépôt utilise `next dev`, et la chaîne ESLint est présentée comme un « risque nul ». Une recherche d'imports ne démontre pas non plus l'absence de tout chemin interne du framework. Ces passages sont conservés tels quels pour la traçabilité et sont **remplacés** par les conclusions ci-dessous, qui distinguent observation, hypothèse et incertitude.

### Trois contextes d'exécution distincts

| Contexte | Ce qui s'exécute réellement | Source |
| --- | --- | --- |
| Production | `next build` puis `next start` ; seules les dépendances de `dependencies` sont chargées en service | `package.json` (`build`, `start`) |
| CI | `npm ci`, `npm run lint` (ESLint et sa chaîne), `next build`, `next start`, Playwright ; déclenchée sur **toute** pull request, avec `permissions: contents: read` | `.github/workflows/ci.yml` |
| Développement local | `make dev` → `npm run dev` → **`next dev`** sur le poste du développeur, plus lint et build | `README.md:13,30`, `Makefile:46`, `package.json:6` |

### Conclusions révisées par avis

| Avis | Production | CI | Développement local | Niveau de certitude |
| --- | --- | --- | --- | --- |
| GHSA-39w2-rjm5-chcv — endpoint MCP de `next dev` | Non exposé : l'avis indique que les déploiements de production ne servent pas cet endpoint | Non exposé (`next start`) | **Exposé** : pendant que `next dev` tourne, un site malveillant visité par le développeur peut lire chemin du projet, extraits de code, inventaire des routes et journaux de développement (texte de l'avis) | Observation fondée sur l'avis primaire et les commandes du dépôt ; aucune exploitation tentée |
| GHSA-vfj7-8cjw-p6xm — `braces` via la chaîne ESLint | Non chargé en service (`devDependencies`) | **Exposition conditionnelle** : la CI lint le contenu de toute PR ; une contribution malveillante contrôlant un motif glob lu par ESLint (configuration, motifs d'ignorance) pourrait épuiser la pile et faire échouer le job de lint. Impact : indisponibilité de ce job, pas d'accès aux secrets (lecture seule, `persist-credentials: false`) | Même condition si le développeur lint un contenu non relu | Hypothèse fondée sur l'avis ; non reproduite |
| GHSA-68fv-2mgg-jv7q — `source-map-js` via PostCSS/Tailwind | Non exécuté par requête : PostCSS ne tourne qu'au build | **Exposition conditionnelle** au build d'une PR contenant une source map indexée forgée : blocage de la boucle d'événements du build (indisponibilité du job) | Même condition | Hypothèse ; non reproduite |
| GHSA-wq5f-xc86-pv6w — `sharp`/librsvg | Chemin interne possible : l'endpoint `/_next/image` du framework existe sans import `next/image` et peut utiliser `sharp` pour des images locales. Le décodage SVG (librsvg) n'est pas atteint par défaut : `images.dangerouslyAllowSVG` est absent de `next.config.ts` et il n'y a pas de dossier `public/` | Idem au moment de `next start` | Idem avec `next dev` | Déduction de la configuration et des valeurs par défaut documentées ; **non vérifiée par exécution** |
| GHSA-cjq9-62q9-8jv4 — SSRF optimisation d'image | Non affecté selon l'avis (aucun `images.remotePatterns`) | Idem | Idem | Condition explicite de l'avis primaire |
| GHSA-vcvr-r3jv-pc5j — `next/og` ImageResponse | Non observé : aucun import `next/og` ni route `opengraph-image`/`twitter-image` qui en créerait | Idem | Idem | Recherche statique ; un import indirect généré ne serait pas couvert |
| GHSA-3w37, GHSA-4jqv, GHSA-mcj8, GHSA-f87g — cache, Draft Mode, métadonnées | Non observé : aucune directive `"use cache"`, App Router uniquement, aucune page statique/ISR à la sortie de `next build`, aucune route d'image de métadonnées | Idem | `next dev` ne génère pas de cache SSG/ISR persistant | Recherche statique + sortie de build ; non exécuté sous charge |

### Ce qui remplace « risque nul »

Aucun avis n'a d'exploitation démontrée dans ce dépôt, mais plusieurs ne sont pas sans exposition :
- **Développement local** : un avis faible mais réel (MCP de `next dev`). Atténuation sans mise à jour : ne pas laisser `next dev` tourner en naviguant sur des sites non fiables. Correctif : la mise à jour non majeure `next@16.4.2` ferme l'avis.
- **CI** : deux expositions conditionnelles de disponibilité (`braces`, `source-map-js`), seulement avec une contribution malveillante dont le contenu est linté ou buildé. Impact : échec du job concerné, sans accès aux secrets.
- **Production** : aucune exposition observée dans la configuration actuelle. Incertitude résiduelle sur les chemins internes du framework (`/_next/image` et `sharp`), déduits de la configuration et non vérifiés par exécution.

La priorité proposée évolue : la mise à jour `next@16.4.2` devient P2 pour l'exposition en développement (et plus seulement en défense en profondeur). `braces`/`source-map-js` restent P3, avec un correctif `overrides` de faible risque. Aucune mise à jour n'est réalisée dans ce lot (C4).
