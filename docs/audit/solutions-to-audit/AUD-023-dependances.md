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
