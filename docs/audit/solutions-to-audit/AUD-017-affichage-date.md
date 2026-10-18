# AUD-017 — Préserver la date calendaire affichée

Statut : correction retenue, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`. Décision du 14 octobre 2026.

## Problème et preuve

La base transmet une date calendaire sous forme de chaîne (`src/lib/db.ts:3–5`). Les trois écrans convertissent la chaîne en Date puis utilisent un formatage local : `src/app/expenses/page.tsx:22,285`, `src/components/PendingApprovalsPanel.tsx:19,120`, `src/components/AdminConsole.tsx:30,228`. Le helper `src/utils/format.ts:5–7` contient aussi cette construction ; aucun consommateur applicatif trouvé lors de la revue.

MEASUREMENT : pour `2026-10-14`, la même expression affiche le 14 à Paris/UTC et le 13 à Los Angeles. [Protocole et résultats](../comment-review.md#aud-017--date-affichée-la-veille-selon-le-fuseau). Pas de navigateur monté.

## Correction retenue

Afficher la date de dépense sans glissement de jour selon le fuseau du lecteur, en conservant le format français actuel. Corriger uniquement la restitution d'une date calendaire, sans déplacer les dates enregistrées ni modifier les contrats API ou les fonctions attendues. Ne pas confondre ce choix avec Europe/Paris utilisé pour la règle serveur de date future (AUD-015).

Préparation technique : formatage explicite d'une valeur date seule, ou conversion contrôlée puis formatage dans le même fuseau fixe ; choix exact du code à préparer. Les polices, couleurs, positions et commandes restent inchangées. Aucune nouvelle règle de date sélectionnée.

## Validation prévue

Vérifier le même jour affiché à Paris, UTC et Los Angeles sur les trois écrans ; préserver format français, dates existantes et contrats. Tester aussi fin de mois/année et année bissextile. Vérifications navigateur/régression à effectuer avant de déclarer la correction validée. Implémentation différée pendant la discussion d'AUD-016/AUD-018, conformément à l'audit avant implémentation. Aucun niveau de compréhension déduit de l'acceptation.

## IMPLEMENTATION

### 2026-10-18 — SPEC-04, personne B

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-04](../../specs/SPEC-04-entrees-et-affichage.md). Révision de départ : `7377486`. Réalisation : `c445659`.

#### Ce qui a été implémenté

Les trois `dateFormatter` (`expenses/page.tsx`, `PendingApprovalsPanel.tsx`, `AdminConsole.tsx`) reçoivent explicitement `timeZone: 'UTC'` en plus de `dateStyle: 'medium'`. `new Date('2026-10-14')` est interprété comme minuit UTC ; sans fuseau explicite, le formatage utilisait le fuseau local du lecteur et pouvait afficher le jour précédent (ex. Los Angeles). Avec `timeZone: 'UTC'`, le jour affiché est toujours celui de la chaîne stockée, quel que soit le fuseau du navigateur. `src/utils/format.ts` contient la même construction sans consommateur applicatif (confirmé par une recherche de ses appelants) : non modifié, hors périmètre déclaré de SPEC-04.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/app/expenses/page.tsx : `dateFormatter` | `+ timeZone: 'UTC'` | Historique propriétaire |
| src/components/PendingApprovalsPanel.tsx : `dateFormatter` | `+ timeZone: 'UTC'` | Liste manager |
| src/components/AdminConsole.tsx : `dateFormatter` | `+ timeZone: 'UTC'` | Organigramme et liste RH |

#### Nouveau fonctionnement

`note.expenseDate` (chaîne `yyyy-mm-dd` renvoyée telle quelle par `src/lib/db.ts`, voir le parseur de type OID 1082) → `new Date(note.expenseDate)` → interprété comme minuit UTC de ce jour calendaire → `dateFormatter.format(...)` avec `timeZone: 'UTC'` affiche ce même jour dans le fuseau UTC, indépendamment du fuseau réglé sur l'appareil du lecteur. Le format français (`dateStyle: 'medium'`) et les contrats existants restent inchangés ; seul le fuseau de restitution est désormais explicite.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:issue -- AUD-017` | NAV-018…021 réussis | 4/4 réussis (Europe/Paris, UTC, America/Los_Angeles, minuit Paris) | `reports/issues.json`, run local 2026-10-18 |
| `npm run test:e2e` (suite complète) | Aucune régression | 39/60 (AUD-017 0 échec ; 21 échecs restants hors périmètre : AUD-016 dépendance non mergée, AUD-013 idem) | `reports/issues.json` |

#### Écarts et limites

`src/utils/format.ts` garde la même construction sans fuseau explicite mais reste sans consommateur applicatif : aucune correction n'y est ajoutée, pour ne pas étendre le périmètre déclaré (fichiers listés dans SPEC-04) à un code mort. Fin de mois/année et bissextile vérifiées via AUD-015 (existence du jour) plutôt que par un nouveau cas e2e dédié à l'affichage.
