# Corrections sélectionnées et specs de changement

Revue du 29 octobre 2026 demandée par Maia. Ce tableau distingue les corrections à réaliser des risques assumés ; il ne vaut pas preuve d’implémentation. Source applicative d’audit SonarQube : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. HEAD local : `f637381f0e144fda04c0166b650279b4d9b0726a`, documents distants `13ffcb0c6bd4c6050557e3cc14248d90fdc8b5da` récupérés, fusion toujours en cours. Code des parcours concernés relu ; aucune correction applicative exécutée.

## Changements à réaliser

| AUD / constat | Résultat demandé | Spec de changement | État documentaire |
| --- | --- | --- | --- |
| [AUD-027](../audit/solutions-to-audit/AUD-027-validation-email-bornee-LastChanges.md) et [AUD-030](../audit/solutions-to-audit/AUD-030-validation-email-partagee-LastChanges.md) | Validation email unique, bornée avant analyse, réutilisée dans signup ; domaine, transaction et rôles conservés | [SPEC-13 — email LastChanges](SPEC-13-validation-email-bornee-LastChanges.md) | Déjà créée sur la branche distante ; relue, critères C1 à C10 et validation future précisés |
| [AUD-028](../audit/solutions-to-audit/AUD-028-diagnostic-borne-LastChanges.md) | Diagnostic borné avant filtrage, champ trop long omis entièrement, confidentialité conservée | [SPEC-14 — diagnostic LastChanges](SPEC-14-diagnostic-borne-LastChanges.md) | Déjà créée ; relue, critères C1 à C7 présents |
| [AUD-029](../audit/solutions-to-audit/AUD-029-normalisation-montant-LastChanges.md) | Retrait linéaire des zéros terminaux, montants et empreintes historiques conservés | [SPEC-15 — normalisation LastChanges](SPEC-15-normalisation-montant-LastChanges.md) | Déjà créée ; relue, critères C1 à C7 présents |
| AUD-005, deux listes manager/RH signalées par Maia | Attendre withUserScope dans le try pour produire la réponse sûre en cas de rejet | [SPEC-16 — listes](SPEC-16-erreurs-asynchrones-listes.md) | Complément rédigé ici ; ancien numéro SPEC-13 avant récupération distante |
| AUD-008, montant OCR signalé par Maia | TOTAL 1234,56 EUR suggère 1234.56, sans perte des formats groupés | [SPEC-17 — montant OCR](SPEC-17-montants-ocr-sans-groupement.md) | Complément rédigé ici ; ancien numéro SPEC-14 |
| AUD-015, année zéro signalée par Maia | Refus 400 avant soumission et stockage, année 0001 toujours admise si valide | [SPEC-18 — année zéro](SPEC-18-date-annee-zero.md) | Complément rédigé ici ; ancien numéro SPEC-15 |

Ces six specs couvrent quatre AUD SonarQube sélectionnés et les quatre constats supplémentaires (deux listes dans un même résultat cohérent). Elles décrivent les changements, fichiers, contrats, invariants, critères vérifiables et contrôles à exécuter. Elles restent préparées, non implémentées. Les numéros 13 à 15 récupérés sont conservés ; les compléments récents deviennent 16 à 18 pour éviter les identifiants ambigus.

## Sujets sans nouveau correctif à spécifier

| AUD / sujet | Décision applicable |
| --- | --- |
| AUD-024, AUD-025, AUD-026 | Risques explicitement assumés dans [assumed_issues](../audit/assumed_issues/README.md) ; aucune spec de correction |
| Ancien complément AUD-005 diagnostic LastChanges | Reclassement historique vers AUD-028, déjà couvert par SPEC-14 ; pas de quatrième spec SonarQube |
| AUD-019 | Convention d’inscription conservée, pas de nouvelle correction |
| AUD-010 | Reporté à l’échange professeur |
| AUD-022 | SPEC-11 existante, mesure/optimisation conditionnelle ; aucun nouvel index sélectionné ici |
| AUD-023 | SPEC-12 existante, qualification ; aucune mise à jour de dépendances sélectionnée ici |
| Autres alertes de l’export SonarQube sans décision AUD de correction | Aucune sélection déduite du seul classement de l’outil ; hors de cette demande de specs des changements retenus |

Les lots historiques restent couverts par SPEC-01 à SPEC-12 dans l’[index](README.md). Leur réalisation historique n’est pas réévaluée par cette revue ciblée. Les tests futurs utilisent les services jetables du harnais, deux entreprises et plusieurs rôles ; les assertions de référence restent conservées. Les nouveaux cas ne seront inscrits au manifeste qu’après création effective, sans présenter une sélection vide comme réussie.

## Validation de la préparation

Fiches AUD laissées intactes ; empreintes avant/après comparées indépendamment. Liens locaux des six specs et de ce tableau contrôlés ; numéros de specs uniques après renumérotation. Commandes Node et tests applicatifs non exécutés, Node.js absent. La fusion Git interrompue n’est ni finalisée ni poussée par cette tâche.
