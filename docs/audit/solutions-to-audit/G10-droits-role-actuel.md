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
