# Specs : état courant et méthode de contribution

État au 29 octobre 2026, sur `main` après la [PR #20](https://github.com/maiabuc/expense-io/pull/20), commit `2e76fe1`. Les textes de préparation et résultats anciens restent dans les specs et les fiches AUD ; leurs dates et révisions font partie de la preuve.

## Statut des specs

| Spec | Résultat concerné | État vérifié |
| --- | --- | --- |
| [SPEC-01](SPEC-01-erreurs-api.md) | Erreurs API et diagnostics | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-02](SPEC-02-recuperation-ui.md) | Reprise UI après erreur réseau | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-03](SPEC-03-ocr-borne.md) | OCR réutilisé, borné et erreurs distinctes | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-04](SPEC-04-entrees-et-affichage.md) | Tri, montant, date et reçus | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-05](SPEC-05-inscription-atomique.md) | Inscription atomique | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-06](SPEC-06-droits-actuels.md) | Droits et périmètres relus en base | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-07](SPEC-07-hierarchie-managers.md) | Intégrité des affectations | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-08](SPEC-08-decisions-atomiques.md) | Décisions concurrentes atomiques | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-09](SPEC-09-soumission-isolee.md) | Soumission récupérable et ports/adaptateurs | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-10](SPEC-10-seed-recuperable.md) | Seed relançable et réparations | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-11](SPEC-11-mesures-listes.md) | Mesures des listes | Conditionnelle ; campagne comparative non livrée, aucune optimisation revendiquée |
| [SPEC-12](SPEC-12-qualification-dependances.md) | Qualification des dépendances | Qualification documentée ; revue humaine, sans mise à niveau automatique de dépendances |
| [SPEC-13](SPEC-13-validation-email-bornee-LastChanges.md) | Email borné et validateur partagé | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-14](SPEC-14-diagnostic-borne-LastChanges.md) | Diagnostic borné et filtrage déterministe | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-15](SPEC-15-normalisation-montant-LastChanges.md) | Normalisation du montant linéaire | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-16](SPEC-16-erreurs-asynchrones-listes.md) | Erreurs asynchrones des listes | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-17](SPEC-17-montants-ocr-sans-groupement.md) | Centimes OCR sans groupement | Intégrée ; contrôle automatisé du lot réussi en CI interne |
| [SPEC-18](SPEC-18-date-annee-zero.md) | Refus de l’année zéro | Intégrée ; contrôle automatisé du lot réussi en CI interne |

La [CI complète](https://github.com/maiabuc/expense-io/actions/runs/40945194492) a exécuté 347 tests internes : 81 unitaires, 199 API, 67 navigateur, tous réussis et aucun ignoré. Les 16 specs automatisées ont leurs contrôles de lot réussis. SPEC-11 et SPEC-12 restent en revue humaine : aucun test fonctionnel vert ne remplace une mesure comparative ou une qualification d’avis.

Les compléments 13–18 sont conservés dans leurs PR d’origine : [13 / #12](https://github.com/maiabuc/expense-io/pull/12), [14 / #15](https://github.com/maiabuc/expense-io/pull/15), [15 / #16](https://github.com/maiabuc/expense-io/pull/16), [16 / #17](https://github.com/maiabuc/expense-io/pull/17), [17 / #18](https://github.com/maiabuc/expense-io/pull/18), [18 / #19](https://github.com/maiabuc/expense-io/pull/19). Leurs commits ont été intégrés ensemble par la PR #20 : les tests de tous les lots étaient déjà présents dans main, et la suite complète devait être verte avant fusion.

La suite externe de NathanPrats/expense-io#4 donne 86/89 sur le code intégré. Les trois différences acceptées sont décrites dans le [guide de tests](../testing/README.md) ; ce résultat ne certifie pas l’absence d’autres tests de correction du professeur.

## Réaliser et vérifier un changement

1. Lire les [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md), la fiche AUD et les cinq références de réalisation indiquées.
2. Partir du main actualisé, décrire le périmètre et garder chaque modification limitée au besoin sélectionné. Une optimisation conditionnelle n’est pas une autorisation générale.
3. Capturer les fiches avant toute intervention, conserver leurs octets existants et ajouter les réalisations sous IMPLEMENTATION. Mettre à jour la spec et le journal avec des preuves au SHA exécuté.
4. Exécuter les contrôles concernés et les suites complètes sur services jetables ; garder les assertions de référence, y compris refus, pannes et concurrence.
5. Ouvrir une PR, puis fusionner uniquement après les contrôles internes obligatoires. Si des lots ont besoin les uns des autres pour valider la suite, utiliser une intégration relue en conservant leurs commits.

```bash
node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-<identifiant-unique>.json
npm run ci:docs
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:api
npx --no-install playwright install --with-deps chromium
npm run test:e2e
npm run test:report
node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-<identifiant-unique>.json
```

`test:issue` sélectionne une issue et peut donc couvrir plusieurs specs ; une sélection partielle n’est pas un bilan complet du lot. Les commandes, identifiants et limites sont détaillés dans le [guide](../testing/README.md). Un résultat réussi prouve les cas exécutés, pas l’ensemble des critères manuels.

## Périmètres conservés et historique

AUD-010 reste reporté ; AUD-019 est une convention conservée ; AUD-022 est conditionnel ; AUD-024 à 026 restent des risques assumés documentés. Les [ADR](../adr/README.md), les [fiches AUD](../audit/README.md) et le [journal](../audit/DECISION_LOG.md) conservent les décisions et leurs limites.

L’[organisation initiale du 17 octobre](archive/organisation-20261017.md) conserve les anciennes affectations, dépendances et étapes de préparation. Elle n’est plus l’index de l’état courant.
