# Risques assumés — sans correction ni spec prévue

Ce dossier conserve les issues examinées avec Maia et explicitement laissées sans traitement. Les fiches suivent le format des autres audits : problème, sources, décision, justification et limites de validation. Leur présence ne signifie ni correction réalisée ni absence de risque.

| Issue | Sujet | Niveau et décision |
| --- | --- | --- |
| [AUD-024](AUD-024-recherche-executables-path.md) | Recherche de npm et git via PATH dans les outils CI (six alertes S4036, 1 à 6/16) | Risque faible et conditionnel, P3 ; assumé le 26 octobre 2026, aucune correction ou spec prévue |
| [AUD-025](AUD-025-identifiants-base-tests.md) | Mots de passe fixes des comptes PostgreSQL de préparation et applicatif des tests (alertes 8 et 9/16) | Risque faible et conditionnel, P3 ; assumé le 26 octobre 2026, aucune correction ou spec prévue |
| [AUD-026](AUD-026-comptes-demonstration-locale.md) | Mot de passe par défaut du manager de démonstration (alerte 10/16) | Risque faible/P3 assumé **car l’usage reste local** ; à réexaminer avant exposition réseau, aucune correction ou spec prévue |

Les autres alertes SonarQube restent à examiner une par une. Aucun report collectif n'est déduit de cette décision.
