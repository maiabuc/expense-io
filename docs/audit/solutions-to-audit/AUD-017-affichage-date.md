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
