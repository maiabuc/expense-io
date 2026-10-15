# AUD-022 — Optimiser les listes si la solution reste simple

Statut : optimisation simple retenue sous condition le 14 octobre 2026 ; non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Localisation initiale et problème

`src/app/api/expense-notes/route.ts:45–49`, `src/app/api/manager/expense-notes/route.ts:26–33` et `src/app/api/hr/expense-notes/route.ts:26–34` récupèrent toutes les notes du périmètre autorisé, sans pagination. `src/app/expenses/page.tsx:155` calcule le total sur les notes reçues et les lignes 282–285 commencent leur affichage intégral.

OBSERVATION : aucune création explicite d'index secondaire trouvée dans les migrations relues ; les contraintes de clé primaire et d'unicité restent distinctes. Cela ne prouve pas l'absence d'index ajoutés dans une base existante. HYPOTHÈSE : un volume croissant pourrait augmenter le coût SQL, le transfert et le rendu. Aucune lenteur ni amélioration mesurée à ce stade.

## Décision et piste de solution

Réponse réelle de Maia : « Non, on peut passer directement à l'optimisation si et seulement si c'est simple. Next ? » L'optimisation n'est donc pas reportée par principe à la constatation d'une lenteur ; elle reste conditionnée à sa simplicité et aux contraintes fonctionnelles existantes.

PROPOSITION : commencer par les index adaptés aux filtres et tris réellement utilisés. Par exemple, un index sur `(user_id, created_at)` est un candidat pour la liste propriétaire et son tri par défaut. Vérifier les index effectifs et les plans SQL avant de fixer le jeu minimal ; ne pas ajouter tous les index possibles. Un index ne borne ni la taille de réponse ni le nombre de lignes rendues, et a un coût de stockage et d'écriture.

Préserver les mêmes notes, les permissions, les tris, le total, les contrats API, l'UI et les commandes existantes. Pagination, limitation silencieuse et changement de calcul du total ne sont pas sélectionnés. Aucun cache ou nouvelle infrastructure retenu. Si une solution exige un changement plus complexe, revenir avec son coût et son impact plutôt que l'appliquer automatiquement.

## Validation prévue

Sur données isolées de deux entreprises et plusieurs rôles : comparer résultats, ordre, total et permissions avant/après ; mesurer plans SQL, temps de requête et HTTP sur volumes fixes. Rapporter aussi le coût des écritures et les limites côté transfert/rendu. Aucun index créé, migration lancée ou benchmark effectué pendant cette décision. L'implémentation suit la phase de preuves prévue pour l'audit.

## Actualisation des preuves — campagne du 14–15 octobre

10 000 notes ajoutées : 10 007 notes et 2 620 680 octets par réponse. Dix appels avant/après index expérimental : médianes HTTP 142,94/145,08 ms ; aucun gain HTTP démontré. SQL EXPLAIN 4,176/2,981 ms, une mesure par cas. Index supprimé ; coût des écritures/rendu et distribution réaliste non mesurés. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
