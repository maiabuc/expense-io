# Audit d’architecture d’Expense.io

État courant au 29 octobre 2026 : les corrections intégrées sont détaillées dans les [specs](../specs/README.md) et les entrées IMPLEMENTATION des fiches ci-dessous. La [PR #20](https://github.com/maiabuc/expense-io/pull/20) a livré les compléments SPEC-13–18 dans main, commit `2e76fe1`.

La [CI interne complète](https://github.com/maiabuc/expense-io/actions/runs/40945194492) réussit **347/347 tests**, sans échec ni cas ignoré : 81 unitaires, 199 API et 67 navigateur, avec qualité/build et 16 contrôles de lot réussis. La référence externe donne **86/89** ; ses trois différences acceptées restent explicites dans le [guide de tests](../testing/README.md).

L’audit initial porte sur `265924bc7274047989e708ab635c2854d376230f` et les campagnes des 14–15 octobre. Les observations « aucune correction implémentée » et les anciens comptes décrivent ces révisions historiques, pas le code actuel. Ils sont conservés pour comparer avant/après. SPEC-11 reste conditionnelle et SPEC-12 en revue humaine ; aucune optimisation ou mise à jour de dépendance non réalisée n’est revendiquée.

## Parcours de lecture

1. [Processus suivi](processus-audit.md) : cadre, flux, axes, décisions, exécutions et limites.
2. [Issues classées](audit_issues_classified.md) : IDs, défauts, conventions, limites, impact et priorités.
3. [Architecture existante](architecture.md) et [revue structurelle](structure-review.md) : responsabilités réelles et cible hexagonale simple acceptée.
4. [Mesures et preuves](mesures-et-preuves.md) : contrôles, 47 vérifications de scénarios, volume/OCR et résultats bruts.
5. [Journal des décisions](DECISION_LOG.md), fiches ci-dessous et [ADR](../adr/README.md) : choix et alternatives.
6. [Cohérence et passation aux équipes](coherence-et-passation.md) : interactions entre corrections, règles de cible et livrables avant développement.
7. [Revue API](api-standardisation-review.md) : contrats et erreurs cohérents ; aucune migration REST générale recommandée.

[Baseline](baseline.md), [inventaire API](api-inventory.md), [couverture](coverage.md), [registre historique](issues.md) et [constats](findings.md) complètent les preuves. Le secret reste [à clarifier avec le professeur](questions-professeur.md), question préparée mais non envoyée.

## Solutions détaillées

Chaque fiche explique le problème, sa raison, le fichier et les lignes au SHA original, le fonctionnement initial puis la proposition retenue ou non sélectionnée, avec validation et limites. [Revue du format](solutions-format-review.md). Accord, implémentation et test réussi sont distincts ; une convention conservée n’est pas un défaut à corriger.

| ID | Fiche |
| --- | --- |
| AUD-003 | [Soumission incomplète et récupération du reçu](solutions-to-audit/AUD-003-receipt-consistency.md) |
| AUD-004 | [Contrôler le tri SQL demandé par le client](solutions-to-audit/AUD-004-sort-input.md) |
| AUD-005 | [Erreurs publiques et diagnostics internes](solutions-to-audit/AUD-005-public-errors.md) |
| AUD-006 | [Périmètre des reçus et des affectations manager](solutions-to-audit/AUD-006-manager-receipt-authorisation.md) |
| AUD-007 | [Protéger une décision contre une écriture concurrente](solutions-to-audit/AUD-007-decision-concurrency.md) |
| AUD-008 | [Ressources et durée du traitement OCR](solutions-to-audit/AUD-008-ocr-resource-bounds.md) |
| AUD-009 | [Isolation effective entre entreprises dans la base](solutions-to-audit/AUD-009-database-company-isolation.md) |
| AUD-010 | [Gestion du secret d'authentification](solutions-to-audit/AUD-010-authentication-secret.md) |
| AUD-011 | [Validation avec données séparées](solutions-to-audit/AUD-011-validation-isolee.md) |
| AUD-013 | [Cohérence de l'inscription](solutions-to-audit/AUD-013-signup-consistency.md) |
| AUD-014 | [Validation stricte du montant](solutions-to-audit/AUD-014-validation-montant.md) |
| AUD-015 | [Validation de la date](solutions-to-audit/AUD-015-validation-date.md) |
| AUD-016 | [Libérer les actions UI après erreur réseau](solutions-to-audit/AUD-016-erreurs-reseau-ui.md) |
| AUD-017 | [Préserver la date calendaire affichée](solutions-to-audit/AUD-017-affichage-date.md) |
| AUD-018 | [Récupérer le reçu d'une note de démonstration](solutions-to-audit/AUD-018-reprise-seed.md) |
| AUD-019 | [Convention d'inscription par domaine conservée](solutions-to-audit/AUD-019-inscription-domaine.md) |
| AUD-020 | [Distinguer erreur de requête et retrait de manager](solutions-to-audit/AUD-020-validation-affectation.md) |
| AUD-021 | [Interdire les boucles entre managers](solutions-to-audit/AUD-021-boucles-managers.md) |
| AUD-022 | [Optimiser les listes si la solution reste simple](solutions-to-audit/AUD-022-optimisation-simple-listes.md) |
| AUD-023 | [Qualifier les alertes de dépendances](solutions-to-audit/AUD-023-dependances.md) |
| AUD-027 | [Coût de validation de l’email](solutions-to-audit/AUD-027-validation-email-bornee-LastChanges.md) |
| AUD-028 | [Coût d’expurgation des diagnostics](solutions-to-audit/AUD-028-diagnostic-borne-LastChanges.md) |
| AUD-029 | [Coût de normalisation du montant](solutions-to-audit/AUD-029-normalisation-montant-LastChanges.md) |
| AUD-030 | [Validateur d’email partagé à l’inscription](solutions-to-audit/AUD-030-validation-email-partagee-LastChanges.md) |
| G10 | [Droits selon le rôle actuel](solutions-to-audit/G10-droits-role-actuel.md) |
| G14 | [Contrôle du format des reçus](solutions-to-audit/G14-controle-recus.md) |

AUD-001/002/012 sont des dossiers de provenance/méthode/outillage, indexés dans le journal. Les fiches comprennent aussi des conventions, validations et risques reportés : leur nombre ne représente pas un nombre de vulnérabilités démontrées. La fiche historique AUD-005-diagnostic-borne-LastChanges est conservée ; le complément courant est indexé sous AUD-028. Le tracker d’entretien et le fichier de cleanup supprimés ne sont pas recréés.

## Les cinq références de réalisation

Pour écrire une spec, réaliser un lot ou le relire : suivre les [instructions des agents](../development/INSTRUCTIONS_IMPLEMENTATION.md) et le [modèle de spec](../development/MODELE_SPEC.md). Les fiches AUD restent intactes ; les réalisations y sont documentées par ajout sous IMPLEMENTATION.

1. [Contrats de référence](01-contrats-implementation.md).
2. [Permissions et transitions](02-permissions-et-transitions.md).
3. [Périmètre et dépendances](03-perimetre-et-dependances.md).
4. [Référence de validation](04-reference-de-validation.md).
5. [Lots, critères d’acceptation et clôture](05-lots-et-acceptation.md).

À la demande de Maia, aucun plan de migration ni de retour arrière n’est requis pour cette clôture. Le troisième fichier traite les dépendances et responsabilités. Clôture documentaire, implémentation et validation des corrections sont distinctes ; les réserves sont centralisées dans le fichier 5.


## Archives et conservation des preuves

Les [instantanés de préparation](archive/README.md) restent consultables avec leurs dates. Les campagnes sous evidence conservent leurs SHA, scripts, mesures brutes et résultats, y compris les échecs initiaux. Les deux copies identiques de sortie TypeScript ont été regroupées ; les résultats de chaque campagne restent dans leurs fichiers JSON.
