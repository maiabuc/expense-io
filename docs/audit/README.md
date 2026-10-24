# Dossier de soutenance — Expense.io

Le parcours de lecture tient en trois entrées :

1. [Journal des décisions](DECISION_LOG.md) : une ligne par issue, choix, raison, preuve et état.
2. [Architecture avant/après](architecture.md) : responsabilités originales, module de soumission actuel et limites de l'extraction.
3. [Specs et limites](../specs/README.md) : ce qui devait être réalisé, ce qui a été vérifié et les [contournements ou opérations restantes](../specs/CONTOURNEMENTS_ET_LIMITES.md).

Référence originale : `265924bc7274047989e708ab635c2854d376230f`. État intégré décrit : `2e9e30c`. Synthèse préparée le 24 octobre 2026. Les résultats rapportés le 22 octobre sont 302/302 tests locaux réussis (42 unitaires, 194 API, 66 navigateur). Ils n'ont pas été rejoués pour ce nettoyage documentaire ; ni la CI hébergée actuelle ni les tests du professeur ne sont déclarés validés par cet index.

## Fiches AUD conservées

Chaque fiche garde son texte original et tous les ajouts IMPLEMENTATION : problème, pourquoi, emplacement et fonctionnement initial, solution, nouveau fonctionnement, preuves et limites. Les anciennes dates et mentions « non implémenté » décrivent leur époque ; lire le dernier ajout daté pour l'état de réalisation.

| ID | Fiche |
| --- | --- |
| AUD-003 | [Soumission et reprise](solutions-to-audit/AUD-003-receipt-consistency.md) |
| AUD-004 | [Tri SQL](solutions-to-audit/AUD-004-sort-input.md) |
| AUD-005 | [Erreurs et diagnostics](solutions-to-audit/AUD-005-public-errors.md) |
| AUD-006 | [Reçus et affectations manager](solutions-to-audit/AUD-006-manager-receipt-authorisation.md) |
| AUD-007 | [Décisions concurrentes](solutions-to-audit/AUD-007-decision-concurrency.md) |
| AUD-008 | [Ressources et délai OCR](solutions-to-audit/AUD-008-ocr-resource-bounds.md) |
| AUD-009 | [Isolation PostgreSQL](solutions-to-audit/AUD-009-database-company-isolation.md) |
| AUD-010 | [Secret d'authentification](solutions-to-audit/AUD-010-authentication-secret.md) |
| AUD-011 | [Tests et données isolées](solutions-to-audit/AUD-011-validation-isolee.md) |
| AUD-013 | [Inscription atomique](solutions-to-audit/AUD-013-signup-consistency.md) |
| AUD-014 | [Montant](solutions-to-audit/AUD-014-validation-montant.md) |
| AUD-015 | [Date](solutions-to-audit/AUD-015-validation-date.md) |
| AUD-016 | [Erreurs réseau UI](solutions-to-audit/AUD-016-erreurs-reseau-ui.md) |
| AUD-017 | [Affichage des dates](solutions-to-audit/AUD-017-affichage-date.md) |
| AUD-018 | [Reprise du seed](solutions-to-audit/AUD-018-reprise-seed.md) |
| AUD-019 | [Inscription par domaine conservée](solutions-to-audit/AUD-019-inscription-domaine.md) |
| AUD-020 | [Validation d'affectation](solutions-to-audit/AUD-020-validation-affectation.md) |
| AUD-021 | [Boucles de managers](solutions-to-audit/AUD-021-boucles-managers.md) |
| AUD-022 | [Optimisation conditionnelle des listes](solutions-to-audit/AUD-022-optimisation-simple-listes.md) |
| AUD-023 | [Qualification des dépendances](solutions-to-audit/AUD-023-dependances.md) |
| G10 | [Droits actuels](solutions-to-audit/G10-droits-role-actuel.md) |
| G14 | [Formats des reçus](solutions-to-audit/G14-controle-recus.md) |

## Références secondaires

Les preuves brutes et rapports datés restent disponibles pour justifier les fiches, sans allonger le parcours principal : [processus d'audit](processus-audit.md), [baseline](baseline.md), [mesures initiales](mesures-et-preuves.md), [preuves](evidence/), [ADR](../adr/README.md) et [question au professeur](questions-professeur.md). Une ancienne campagne rouge caractérise les défauts avant correction ; elle ne remplace pas un résultat récent.

Pour les développeurs et agents : [instructions d'implémentation](../development/INSTRUCTIONS_IMPLEMENTATION.md), [contrats](01-contrats-implementation.md), [permissions/transitions](02-permissions-et-transitions.md), [responsabilités](03-perimetre-et-dependances.md), [validation](04-reference-de-validation.md), [lots et acceptation](05-lots-et-acceptation.md). Ces documents, les outils de protection des fiches, les specs, tests et commandes de démarrage sont conservés.
