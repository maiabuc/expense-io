# Audit d’architecture d’Expense.io

Code original : `265924bc7274047989e708ab635c2854d376230f`. Mise à jour : 14 octobre 2026. Dossier d’audit et de passation documentaire finalisé le 15 octobre sur son périmètre explicite. Aucune correction applicative implémentée. La campagne ajoute des preuves HTTP/SQL/S3/OCR ; angles morts et tests du professeur non disponibles restent des réserves, sans réussite inventée.

## Parcours de lecture pour les professeurs

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
| G10 | [Droits selon le rôle actuel](solutions-to-audit/G10-droits-role-actuel.md) |
| G14 | [Contrôle du format des reçus](solutions-to-audit/G14-controle-recus.md) |

AUD-001/002/012 sont des dossiers de provenance/méthode/outillage, indexés dans le journal. Les 22 fiches comprennent aussi AUD-011, dossier de validation : elles ne représentent donc pas 22 vulnérabilités démontrées. Le tracker d’entretien et le fichier de cleanup supprimés ne sont pas recréés.

## Les cinq références de réalisation

1. [Contrats de référence](01-contrats-implementation.md).
2. [Permissions et transitions](02-permissions-et-transitions.md).
3. [Périmètre et dépendances](03-perimetre-et-dependances.md).
4. [Référence de validation](04-reference-de-validation.md).
5. [Lots, critères d’acceptation et clôture](05-lots-et-acceptation.md).

À la demande de Maia, aucun plan de migration ni de retour arrière n’est requis pour cette clôture. Le troisième fichier traite les dépendances et responsabilités. Clôture documentaire, implémentation et validation des corrections sont distinctes ; les réserves sont centralisées dans le fichier 5.
