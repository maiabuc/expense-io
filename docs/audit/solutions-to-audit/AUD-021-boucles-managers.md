# AUD-021 — Interdire les boucles entre managers

Statut : règle retenue le 14 octobre 2026, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Localisation initiale et problème

`src/app/api/hr/users/[id]/manager/route.ts:24` permet de modifier le manager d'un employé ou d'un manager. Les lignes 32–34 refusent seulement l'auto-affectation ; les lignes 39–51 vérifient le rôle puis enregistrent le lien. `migrations/1700000000001_init-schema.sql:18` impose une référence à un utilisateur existant, sans contrôle de boucle.

OBSERVATION : aucun contrôle des liens successifs n'apparaît dans ce parcours. HYPOTHÈSE non exécutée : après A → B, l'affectation B → A ou une chaîne plus longue pourrait former une boucle. Pourquoi c'est un problème selon la règle désormais choisie : une hiérarchie doit pouvoir remonter jusqu'à un manager sans supérieur ; une boucle ne le permet pas. Le contrôle d'entreprise AUD-006 ne protège pas contre une boucle interne.

## Décision retenue

Réponse réelle de Maia : « Oui nous devons interdire les boucles tout en conservant les affectations valides ».

Refuser côté serveur toute affectation créant une boucle, directe ou indirecte. Conserver les affectations autorisées sans boucle et le retrait explicite `managerId: null`. Préserver rôles, périmètres, UI et format des réponses. Erreur compréhensible selon AUD-005 ; statut et libellé exacts à préciser dans le contrat avant implémentation.

PROPOSITION de réalisation, à préciser : suivre les supérieurs du manager proposé ; si la chaîne atteint la personne à affecter, refuser sans modification. Protéger ensemble la vérification et l'écriture contre deux affectations simultanées : une simple lecture suivie d'un UPDATE ne suffit pas. Une transaction sérialisant les changements de hiérarchie d'une même entreprise via sa ligne existante est une option simple ; tous les chemins d'écriture concernés doivent respecter cette protection. Aucun mécanisme précis n'est réputé accepté par la seule approbation de la règle.

Alternatives : conserver uniquement le refus d'auto-affectation laisse les boucles indirectes possibles ; contrôler dans l'UI seule laisse les appels API directs contourner la règle. Ne pas modifier automatiquement les affectations existantes : identifier d'éventuelles boucles sur données isolées et préparer le traitement des données historiques avant migration.

## Validation prévue et limites

Tester auto-affectation, boucle à deux managers, boucle longue et deux requêtes simultanées ; vérifier le refus et l'absence de mutation. Contrôles positifs : chaîne valide, changement de supérieur valide et retrait explicite. Combiner avec les refus interentreprises et de rôle d'AUD-006. Aucun test HTTP/DB, mesure de concurrence ou correction applicative effectué pour ce point.

## Actualisation des preuves — campagne du 14–15 octobre

Affectation du manager racine à son subordonné acceptée HTTP 200 : boucle à deux reproduite. Boucle longue et concurrence non exécutées. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
