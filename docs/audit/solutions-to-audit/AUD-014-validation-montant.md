# AUD-014 — Validation stricte du montant

Direction retenue le 14 octobre 2026 ; détails techniques à préparer. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuves

OBSERVATION : `src/app/api/expense-notes/route.ts:69` utilise `Number.parseFloat`, puis les lignes 71–79 vérifient un montant fini et positif. Ce parsing accepte un préfixe numérique : `12abc` devient `12`. Le champ HTML numérique (`src/app/expenses/page.tsx:179–182`) ne protège pas les appels directs à l'API. Le stockage utilise `numeric(10,2)` (`migrations/1700000000001_init-schema.sql:28`). Aucun appel HTTP ni test de persistance exécuté.

## Solution retenue

- Rejeter les montants mal formés tels que `12abc` côté serveur.
- Accepter `1.2` et `1,2` comme le même montant.
- Autoriser au maximum un séparateur décimal, point ou virgule. Rejeter les séparateurs répétés ou mélangés.
- Valider la chaîne complète avant normalisation et conversion ; ne pas utiliser `parseFloat` comme validation.
- Conserver la règle existante du montant strictement positif. La validation front aide la saisie mais ne remplace pas celle du serveur.

PROPOSITION technique : vérifier une syntaxe décimale explicite, remplacer ensuite l'éventuelle virgule par un point, puis utiliser une représentation adaptée au stockage monétaire. Le choix de représentation n'est pas encore arrêté. Une conversion seule avec `Number` ne définit pas suffisamment le format accepté.

## Alternatives et points ouverts

### Décimales : préserver l'existant

Décision : conserver le comportement actuel plutôt qu'ajouter une nouvelle règle d'arrondi ou un rejet des décimales supplémentaires. OBSERVATION au SHA de référence : aucun arrondi explicite ni limite de décimales dans la route ; insertion dans `numeric(10,2)`. La [documentation PostgreSQL 16](https://www.postgresql.org/docs/16/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL) indique que cette colonne arrondit à deux décimales les valeurs de précision supérieure. Conséquence attendue du schéma : `1.234` stocké comme `1.23`, `1.235` comme `1.24`. Ce comportement n'a pas été mesuré sur l'application locale ; le schéma effectivement installé reste à vérifier. Ne pas ajouter un arrondi JavaScript ou un rejet à deux décimales. Conserver l'arrondi du stockage et caractériser les cas limites avant implémentation.

Front uniquement : contournable par un appel direct. Conversion sans validation complète : risque d'accepter des formats non souhaités. Validation complète côté serveur : décision retenue.

Gestion des espaces, bornes du montant et représentation interne restent à préciser. Ne pas introduire une limite à deux décimales côté serveur. L'acceptation de la virgule doit être comparée au contrat existant et aux tests du professeur avant implémentation ; aucun changement du contrôle HTML n'est sélectionné.

## Validation prévue

API : refuser `12abc`, `1.2.3`, `1,2,3` et `1,2.3` ; vérifier l'équivalence de `1.2` et `1,2` et préserver les montants valides existants. Caractériser les décimales supplémentaires et l'arrondi existant au stockage, puis compléter les limites techniques. Tests exécutés : 0. Code applicatif inchangé.

## Actualisation des preuves — campagne du 14–15 octobre

POST réel : 12abc accepté 201 ; 1,2 retourne montant 1. Validation stricte et arrondi compatible de la cible restent à tester. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
