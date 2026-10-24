# Specs de réalisation

Index de soutenance préparé le 24 octobre 2026 sur main `2e9e30c`. Les fiches détaillent le résultat attendu, les contrats, les fichiers, les critères et les résultats datés. Les anciennes préparations ne prouvent pas l'état actuel ; lire aussi les mises à jour finales et l'IMPLEMENTATION des AUD liées.

| Spec | Résultat livré sur cette base | Validation rapportée le 22 octobre |
| --- | --- | --- |
| [SPEC-01 — Erreurs API](SPEC-01-erreurs-api.md) | Message public sûr, diagnostic technique interne expurgé | 9/9 cas du lot |
| [SPEC-02 — Récupération UI](SPEC-02-recuperation-ui.md) | Saisie conservée et action libérée après erreur | 33/33 |
| [SPEC-03 — OCR borné](SPEC-03-ocr-borne.md) | Pool local sans file, refus si occupé, arrêt et remplacement du moteur | 12/12 ; mesures dédiées du 19 octobre distinctes |
| [SPEC-04 — Entrées et affichage](SPEC-04-entrees-et-affichage.md) | Tri, montant, date et format de reçu contrôlés ; jour affiché stable | 44/44 |
| [SPEC-05 — Inscription atomique](SPEC-05-inscription-atomique.md) | Entreprise et premier RH créés ensemble ; connexion après commit | 8/8 |
| [SPEC-06 — Droits actuels](SPEC-06-droits-actuels.md) | Rôle actuel et périmètre des reçus relus en base | 36/36 |
| [SPEC-07 — Hiérarchie managers](SPEC-07-hierarchie-managers.md) | Affectations valides seulement, sans boucle même en concurrence | 32/32 |
| [SPEC-08 — Décisions atomiques](SPEC-08-decisions-atomiques.md) | Une seule décision ; rattachement relu après attente | 23/23 |
| [SPEC-09 — Soumission et isolation](SPEC-09-soumission-isolee.md) | Une demande → une note récupérable ; ports/adaptateurs ; RLS éprouvée sous compte limité | 60/60 ; compte local d'exploitation à configurer |
| [SPEC-10 — Seed récupérable](SPEC-10-seed-recuperable.md) | Réparation de la même note et conservation des décisions | 10/10 |
| [SPEC-11 — Mesures des listes](SPEC-11-mesures-listes.md) | Non réalisée sur cette base ; optimisation seulement simple et justifiée | Mesures comparables et revue humaine requises |
| [SPEC-12 — Dépendances](SPEC-12-qualification-dependances.md) | Qualification réalisée ; aucune mise à jour appliquée sur cette base | Revue humaine ; aucun test fonctionnel fictif |

Ces sélections peuvent partager des cas ; leur somme n'est pas le nombre de tests distincts. Bilan local rapporté : **302/302**, dont 42 unitaires, 194 API et 66 navigateur, avec lint/types/build/documentation réussis. Rien n'a été rejoué pendant ce nettoyage. Les résultats ne valent pas validation de la CI hébergée actuelle ni des tests du professeur, non fournis. Les branches préparées à partir du 24 octobre restent à relire avant fusion.

[Contournements, conventions et limites](CONTOURNEMENTS_ET_LIMITES.md) : compte DB local, secret reporté, domaine email, seed, liens de reçu, OCR et périmètre de validation.

Le dispositif de preuve est décrit par [CI-001](CI-001-tests-non-regression.md), [CI-002](CI-002-controles-par-spec.md) et le [guide des tests](../testing/README.md). Les tests gardent leurs IDs AUD/G et un identifiant de cas unique ; aucune assertion n'est retirée pour obtenir du vert. Les [instructions d'implémentation](../development/INSTRUCTIONS_IMPLEMENTATION.md) et les [cinq références](../audit/README.md#références-secondaires) restent obligatoires. Les fiches AUD sont en ajout uniquement, y compris leurs anciennes sections IMPLEMENTATION.

L'ancienne attribution A/B/C/D et la procédure d'équipe restent dans le [message de passation](../development/MESSAGE_EQUIPE.md) et l'historique Git ; elles ne sont plus le point d'entrée de soutenance.
