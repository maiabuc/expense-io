# AUD-015 — Validation de la date

Décisions du 14 octobre 2026, non implémentées. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuves

OBSERVATION : [route:74](../../../src/app/api/expense-notes/route.ts#L74) vérifie seulement que la date est une chaîne. Le [formulaire:195](../../../src/app/expenses/page.tsx#L195) utilise type=date et transmet FormData sans changement (`:79–83`). Selon [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date), la valeur transmise est yyyy-mm-dd, même si l'affichage dépend de la langue. L'OCR produit aussi année-mois-jour (`src/lib/ocr.ts:75`). Aucun scénario HTTP exécuté.

## Solution retenue

- Valider côté serveur le format existant yyyy-mm-dd ; dd.mm.yyyy n'est pas retenu puisqu'un format est déjà établi.
- Vérifier le jour réel, les longueurs des mois et les années bissextiles : le 29 février n'existe pas chaque année.
- Accepter aujourd'hui, refuser une date future ; pas de seuil d'ancienneté sélectionné.
- Définir aujourd'hui par l'horloge serveur dans Europe/Paris, indépendamment des réglages de l'ordinateur client.
- Pays/région et géolocalisation hors périmètre ; pas de migration géographique ni nouveau champ demandé.

Pourquoi : format et existence sont deux contrôles distincts ; l'horloge client est modifiable. Le schéma versionné (`migrations/1700000000001_init-schema.sql:4–34`) n'a pas de champ géographique et conserve une date seule. La préférence initiale pour la région de l'ordinateur est remplacée par Europe/Paris ; aucun besoin de persister cette information.

## Compatibilité et validation

La route actuelle ne refuse pas explicitement les dates futures : cette restriction demandée doit être vérifiée contre les fonctions attendues et les tests du professeur avant implémentation. Caractériser aussi les autres formats actuellement acceptés par PostgreSQL avant réduction du contrat API. HTTP 400 avec message sûr est proposé pour une date invalide ; contrat exact selon AUD-005 à préciser.

Vérifications prévues : date valide, absente/vide, syntaxe incorrecte, jour impossible, année bissextile, aujourd'hui/demain et passage de minuit Europe/Paris. Tests exécutés : 0 ; schéma local non inspecté, application inchangée. [Journal](../DECISION_LOG.md).

## Actualisation des preuves — campagne du 14–15 octobre

Date inexistante : 500 ; date 2099-01-01 : 201. Le refus du futur est une règle choisie pendant audit ; ne pas le présenter comme une obligation initiale démontrée. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
