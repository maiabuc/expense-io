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

## IMPLEMENTATION

### 2026-10-18 — SPEC-04, personne B

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-04](../../specs/SPEC-04-entrees-et-affichage.md). Révision de départ : `7377486`. Réalisation : `c445659`.

#### Ce qui a été implémenté

`parseStrictAmount` (src/utils/validators.ts) valide la chaîne complète par motif (`^\+?(?:\d+(?:[.,]\d*)?|[.,]\d+)$`) avant toute conversion : un seul séparateur point ou virgule, jamais les deux, signe `+` facultatif, formes `.5` et `1.` admises ; `12abc`, `1.2.3`, `1,2,3`, `1,2.3`, `NaN`, `Infinity`, `-1` sont rejetés par construction (pas de `-` dans le motif). La borne (montant strictement positif et dépassement `numeric(10,2)`) est vérifiée via une arithmétique entière sur les centimes (`BigInt`), en reproduisant l'arrondi au centime à partir du troisième chiffre décimal — sans jamais utiliser `parseFloat` ni un arrondi flottant JS. La fonction renvoie la chaîne normalisée (virgule convertie en point, signe `+` retiré) **non arrondie**, transmise telle quelle à PostgreSQL : c'est la colonne `numeric(10,2)` qui applique l'arrondi au stockage, inchangé.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/utils/validators.ts : `AMOUNT_PATTERN`, `AMOUNT_MAX_CENTS`, `parseStrictAmount` | Validation syntaxique + borne après arrondi | Refus avant toute écriture, sans arrondi JS |
| src/app/api/expense-notes/route.ts : `POST` | Remplace `Number.parseFloat`/vérifications ad hoc par `parseStrictAmount` | Le paramètre SQL devient la chaîne normalisée, pas un nombre JS |

#### Nouveau fonctionnement

POST avec `amount` → `parseStrictAmount(amountRaw)` : motif complet vérifié → normalisation (virgule→point, `+` retiré) → calcul des centimes en `BigInt` avec arrondi au chiffre suivant → rejet si ≤ 0 ou > 9999999999 centimes (99 999 999,99) → HTTP 400 "Montant invalide" si `null`, sinon la chaîne normalisée est liée au paramètre `$2` de l'`INSERT` → PostgreSQL stocke avec son propre arrondi `numeric(10,2)` → la réponse relit la valeur déjà arrondie en base (`Number.parseFloat(row.amount)`, inchangé).

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:issue -- AUD-014` | NOTE-006…015, NOTE-029/030 réussis | 12/12 réussis (dont `1.235`→1.24, `99999999.99` accepté, `100000000` refusé sans écriture) | `reports/issues.json`, run local 2026-10-18 |
| `npm run test:api` (suite complète) | Aucune régression | 82/112 (AUD-014 0 échec) | `reports/issues.json` |

#### Écarts et limites

L'arrondi JS interne ne regarde que le troisième chiffre décimal pour décider d'un report de centime (standard pour un arrondi au centime) ; au-delà de la troisième décimale, seule PostgreSQL applique l'arrondi définitif de stockage — cohérent avec la chaîne non arrondie transmise. Espaces internes à la chaîne non testés spécifiquement (le motif les rejette déjà, aucun cas CI ne les couvre explicitement).

### 2026-10-19 — SPEC-04, correction après revue (personne B)

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-04](../../specs/SPEC-04-entrees-et-affichage.md). Révision de départ : `feat/spec-04` actualisée avec `main` `651b067`. Réalisation : commit de cette entrée sur `feat/spec-04`.

#### Ce qui a été implémenté

La [revue du 19 octobre](../revue-pr-g4bi2004-20261019.md) relève (P1, C3) que l'entrée du 18 octobre contrôlait la positivité *après* l'arrondi au centime : `0.001` donnait 0 centime et était refusé, alors que le contrat admet les petites valeurs positives avant l'arrondi de PostgreSQL. `parseStrictAmount` contrôle désormais la positivité sur la chaîne saisie (au moins un chiffre non nul) et la borne `numeric(10,2)` sur la valeur arrondie au centime. `0.001` et `0.004` sont admis (stockés 0.00 par PostgreSQL), `0`, `0.00` et `.0` restent refusés, `99999999.994` est admis et `99999999.995` (arrondi à 100 000 000,00) refusé.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/utils/validators.ts : `parseStrictAmount` | Positivité testée sur les chiffres saisis avant arrondi ; seule la borne haute reste testée après arrondi | Conforme à C3 |

#### Nouveau fonctionnement

Motif complet vérifié (inchangé) → normalisation → au moins un chiffre non nul dans la partie entière ou décimale saisie, sinon refus → centimes calculés en `BigInt` avec arrondi au chiffre suivant → refus si supérieur à 9 999 999 999 centimes → chaîne normalisée non arrondie transmise à PostgreSQL (inchangé).

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:api` (suite complète) | ENTREE-001/003/004 et NOTE-006…015/029/030 réussis | Tous réussis, dont ENTREE-001 (`0.001`, `0.004` → 201, montant 0) et ENTREE-004 (borne après arrondi) | `reports/api.json` |
| `npm run test:spec:report -- SPEC-04` | Contrôle par spec vert | `passed`, 44/44 | `reports/SPEC-04.json` |

#### Écarts et limites

Un montant positif inférieur à un demi-centime est accepté puis stocké à 0,00 : c'est le comportement demandé par le contrat (C3) et vérifié par ENTREE-001, pas une nouvelle règle métier.
