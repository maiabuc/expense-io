# Revues du lot CI

Base fixe :49e0ff395fd94c57e54213fe95434eb1e1e61869, avec fichiers nouveaux du diff local. Deux agents en lecture seule ; aucun service lancé par les revues. Les résultats runtime restent ceux de la campagne, pas des déductions de revue.

## Standards

Deux constats initiaux : rapports sans révision/environnement ; résultats anciens réutilisables après échec de préparation. Corrigés : provenance partagée (SHA, état local, date, Node et cibles sans credentials), compagnon unitaire et suppression du résultat de la suite avant préparation. La revue de suivi confirme ces deux corrections à la lecture et l'agrégation des suites sélectionnées par issue. Aucun autre blocage concret identifié.

Conformités relevées : application préservée, commandes conservées, IDs et cas uniques, aucun test ignoré, données et services isolés, mécanismes futurs explicites, traces contenant les cookies désactivées. Le contrôle append-only protège les fiches historiques ; AUD-011 reçoit son ajout daté.

## Spec

Cinq constats initiaux : couverture RLS incomplète ; erreurs d'affectation non différenciées dans les assertions ; frontières numériques/date/MIME manquantes ; diagnostic interne absent des contrôles ; provenance manquante. Ajouts correspondants : RLS-003/004/005, AFF-019, NOTE-029…032, NAV-021, PANNE-003 et métadonnées des rapports.

Deux réserves du suivi ont été traitées avant clôture : NAV-021 ne testait que le navigateur, donc DATE-001 vérifie aussi aujourd'hui/demain à minuit Paris dans un sous-processus serveur à horloge fixée ; RLS-004 accepte le refus42501 par privilèges de colonnes avec SAVEPOINT et vérifie les données inchangées, en plus du refus RLS par zéro ligne. La suite API complète a été rejouée après ces changements :61 réussites/51 échecs sur112, aucun cas reference en échec.

Les fonctionnalités futures restent nommées dans deferred-coverage.json ; leurs tests sont à livrer avec le mécanisme. La CI locale rouge et le diagnostic des défauts ne valent pas réalisation des corrections ni validation des tests du professeur. L'exécution hébergée GitHub reste distincte.

Bilan :2 constats Standards corrigés ;5 constats Spec complétés, puis2 réserves ciblées traitées. Aucune garantie d'absence de tout défaut n'est inférée de ces revues.
