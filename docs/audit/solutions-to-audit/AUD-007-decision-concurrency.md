# AUD-007 — Protéger une décision contre une écriture concurrente

Direction acceptée : `UPDATE` conditionnel sur l'état `pending` et périmètre autorisé conservé. Non implémenté ; contrat des réponses à préparer. Source originale : `265924bc7274047989e708ab635c2854d376230f`.

## Problème, localisation et fonctionnement original

[Approbation manager:14](../../../src/app/api/manager/expense-notes/[id]/approve/route.ts#L14) lit la note ; ligne 24 contrôle le statut lu ; lignes 28–30 écrivent par ID sans imposer que l'état enregistré soit toujours `pending`. [Rejet manager:14–30](../../../src/app/api/manager/expense-notes/[id]/reject/route.ts#L14) suit le même ordre. Les routes RH analogues doivent être vérifiées aussi. [db.ts:35–38](../../../src/lib/db.ts#L35) entoure chaque opération d'une transaction ; cela ne prouve pas à lui seul que deux requêtes ne se chevauchent pas.

## Pourquoi c'est un problème

Deux onglets ou clients peuvent lire `pending` avant qu'un seul ait écrit. Le premier approuve ; le second rejette à partir de sa lecture ancienne et peut écraser l'approbation. **OBSERVATION :** écriture sans condition d'état. **HYPOTHÈSE :** résultat de cette course à reproduire sur DB réelle selon l'isolation et les permissions. Aucun incident concurrent mesuré dans la preuve initiale.

La règle acceptée est qu'une deuxième décision ne doit pas écraser une première décision enregistrée. Réponse à une répétition identique, conflit et note inexistante/non autorisée restent à définir.

## Fonctionnement retenu

Écrire avec un `UPDATE` atomique exigeant l'état courant `pending` et le périmètre autorisé. Une ligne renvoyée confirme la transition ; zéro ligne ne doit pas être traité comme une décision réussie. Ce résultat ne distingue pas à lui seul état déjà décidé, ressource absente et refus d'accès : définir une réponse sans divulguer une note non autorisée.

La vérification décisive se fait au moment de l'écriture, plutôt que seulement avant. `await` ordonne le travail d'une requête ; il ne coordonne pas plusieurs connexions, clients ou instances. Désactiver les boutons réduit des doubles clics, mais les appels directs et autres onglets restent possibles.

Les transitions légitimes `pending` → `approved`/`rejected` sont conservées, sans nouveau statut ni schéma nécessaire pour ce contrôle seul. L'issue concurrente perdante est intentionnellement empêchée ; réponses exactes et UI doivent respecter le contrat retenu.

## Alternative et définition du verrou

Un `SELECT FOR UPDATE` dans une transaction verrouille la ligne sélectionnée ; des écritures concurrentes attendent normalement commit/rollback. Le verrou n'est pas une interdiction permanente : après sa libération, la règle métier doit toujours protéger l'état.

Cette séquence explicite lecture/verrou/écriture est viable pour une décision à plusieurs étapes coordonnées, mais ajoute attente et gestion transactionnelle. Non retenue pour la transition actuelle d'une ligne ; le `UPDATE` conditionnel emploie déjà le verrouillage interne PostgreSQL et vérifie la condition au point d'écriture. Réexaminer si des règles multi-lignes ou effets externes apparaissent. Rendre les handlers synchrones ou cacher les boutons ne protège pas l'état partagé.

## Validation requise

Données isolées, état initial `pending` connu : provoquer deux requêtes qui se chevauchent avec ordre contrôlé ; vérifier les réponses et l'état final. Couvrir manager et RH, décisions opposées, répétitions identiques, droits et périmètres. Documenter isolation et rôle DB effectifs ; ne pas conclure depuis des mocks que PostgreSQL applique la règle. Aucun code modifié ni test de correction réalisé dans cette fiche.

## Actualisation des preuves — campagne du 14–15 octobre

Deux transactions avec lectures chevauchées reproduisant le source : approved est écrasé par rejected. Contrôle séquentiel HTTP : approbation 200 puis nouvelle décision 409. Course HTTP simultanée non exécutée. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
