# Répartition des specs entre quatre personnes

Préparation du 17 octobre 2026, à la demande de Maia. La CI est fusionnée dans main au commit `f8c3af75abc785d6195cf4fb7fee0d7c57356d24` ; elle contient le lot `11b1223`. Les specs ci-dessous sont préparées pour réalisation, pas des corrections déjà livrées. Chaque personne garde les responsabilités jusqu’aux tests, à la documentation et à la revue.

| Personne | Specs | Responsabilité principale |
| --- | --- | --- |
| A | [01 — erreurs API](SPEC-01-erreurs-api.md), [02 — récupération UI](SPEC-02-recuperation-ui.md), [03 — OCR](SPEC-03-ocr-borne.md), [12 — dépendances](SPEC-12-qualification-dependances.md) | Erreurs communes, interfaces résistantes aux pannes, moteur OCR ; qualification des dépendances sans mise à jour automatique |
| B | [04 — entrées et affichage](SPEC-04-entrees-et-affichage.md), [05 — inscription](SPEC-05-inscription-atomique.md), [11 — mesures des listes](SPEC-11-mesures-listes.md) | Tri/montant/date/fichiers, inscription atomique ; optimisation seulement si simple et justifiée |
| C | [06 — droits actuels](SPEC-06-droits-actuels.md), [07 — hiérarchie](SPEC-07-hierarchie-managers.md), [08 — décisions](SPEC-08-decisions-atomiques.md) | Identité, permissions et affectations ; décisions atomiques et concurrence |
| D | [09 — soumission et isolation](SPEC-09-soumission-isolee.md), [10 — seed](SPEC-10-seed-recuperable.md) | Reprise et cohérence DB/S3, RLS, premier module hexagonal simple, démonstration récupérable |

Le nombre de specs n’est pas une estimation de charge : SPEC-09 est le chantier le plus lourd. B fournit ses validations à D ; C relit les droits et politiques DB de D ; D relit les décisions et concurrence de C. A/B relisent réciproquement leurs interfaces. Les noms réels peuvent remplacer A/B/C/D sans changer le périmètre.

## Ordre et fichiers partagés

1. A publie le mécanisme d’erreurs SPEC-01 et l’interface de diagnostic avant les adaptations des autres personnes.
2. A travaille sur SPEC-02, B sur SPEC-05 et prépare SPEC-04, C sur SPEC-06 ; D prépare l’interface de soumission et ses tests à partir des contrats déjà retenus. Qualification SPEC-12 possible en parallèle.
3. Intégrer SPEC-02 avant les changements de formatage SPEC-04 dans les trois écrans. SPEC-04 fournit un contrôle réutilisable indépendant de Next/pg/AWS à SPEC-03 et SPEC-09. Intégrer SPEC-06 avant les raccordements de droits des autres lots.
4. C enchaîne SPEC-07/08 ; A réalise SPEC-03 ; D réalise SPEC-09 avec les validations et gardes convenues. SPEC-08 est vérifiée de nouveau avec l’état incomplete et le compte DB de SPEC-09.
5. D réalise SPEC-10 sur le schéma final de SPEC-09. B traite SPEC-11 seulement après stabilisation des listes et permissions. Enfin, exécuter toute la CI sur l’ensemble.

Préparer en parallèle ne signifie pas modifier le même fichier sans coordination :

| Surface partagée | Répartition / ordre |
| --- | --- |
| expense-notes/route.ts | B corrige GET/validation POST dans SPEC-04 ; D extrait ensuite la soumission dans SPEC-09 en conservant ces validations |
| expenses/page.tsx | A : récupération des erreurs ; B : date ; D : reprise et total excluant incomplete, dans cet ordre |
| PendingApprovalsPanel / AdminConsole | A : récupération ; B : date ; C : seulement adaptations indispensables des permissions/affectations |
| auth.ts / contexte DB | C fournit l’identité actuelle ; D coordonne contexte RLS/compte effectif ; B conserve inscription dans actions/auth.ts |
| Migrations | C réserve les contraintes users/hiérarchie ; D expense_notes/RLS/comptes ; B réserve les index seulement si SPEC-11 les justifie. Noms uniques et revue croisée |
| package.json / lockfile / CI | Une modification à la fois, justifiée et coordonnée. Pas d’upgrade automatique ; D peut adapter le harnais aux comptes préparation/app distincts sans affaiblir les assertions |
| Fiches AUD | Un propriétaire par fiche ; AUD-006 appartient à C pour SPEC-06 et SPEC-07 ; ajouts sérialisés et texte antérieur intact |

## Parcours de branche et intégration proposés

Chaque réalisation a sa branche `feat/spec-01`, `feat/spec-02`, etc., et sa PR. Lire les [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md) et les cinq références avant de coder. Partir du main actualisé ; si une dépendance n’est pas encore dans main, intégrer sa version relue dans la branche de travail et le signaler dans la PR.

La CI initiale est rouge parce qu’elle teste les défauts retenus. Exiger immédiatement la CI globale verte pour chaque première spec serait incompatible avec une livraison indépendante. **Organisation recommandée pour les prochains correctifs : PR des specs vers une branche commune feat/integration, puis PR de cet ensemble vers main uniquement quand la CI complète est verte.** Cette proposition a été présentée à Maia ; aucune branche d’intégration ni dérogation aux contrôles n’est créée par ce document. La fusion de la CI demandée est la base de référence explicite, pas une autorisation de fusionner des régressions.

Une spec peut être prête à intégrer quand ses critères et tests propres réussissent, les tests de référence et lint/types/build passent, et le bilan complet n’ajoute aucun échec non expliqué. Un défaut initial restant dans un autre lot est nommé avec son AUD ; il reste rouge, sans skip. L’intégration intermédiaire n’est pas une déclaration « tout validé » ni une fusion finale vers main. Des lots interdépendants restent ensemble tant qu’ils ne peuvent pas prouver leurs assertions séparément.

Le workflow actuel s’exécute sur toutes les PR, y compris vers feat/integration. Un simple push sur feat/spec-xx n’est pas un déclencheur configuré : ouvrir la PR pour obtenir les résultats GitHub. La CI complète de la PR finale vers main est obligatoire ; ne pas désactiver son résultat requis pour livrer.

## Contrôles et documentation de chaque lot

```bash
node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-spec-04-<identifiant-unique>.json
npm ci
npm run ci:docs
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:issue -- AUD-014
npm run test:api
npx --no-install playwright install --with-deps chromium
npm run test:e2e
npm run test:report
node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-spec-04-<identifiant-unique>.json
```

Remplacer les identifiants d’exemple par la spec et **tous** les AUD/G concernés. Docker/Compose et Node 24 sont nécessaires pour les suites réelles ; utiliser les services jetables du harnais et jamais les services utilisateur. Les détails sont dans le [guide de tests](../testing/README.md). Plusieurs specs peuvent partager un AUD : une sélection par issue peut donc inclure une dépendance encore non corrigée. Lire le résultat par cas et regrouper les lots avant de déclarer toute l’issue vérifiée. AUD-022/AUD-023 n’ont pas de cas fonctionnel exécutable dédié actuellement : utiliser les protocoles de mesures/qualification des SPEC-11/12, pas un test vide ; test:issue échoue explicitement sur une sélection sans cas.

Ajouter les tests des mécanismes nouveaux, notamment reprise/idempotence/hexagone et pool OCR40 s. `tests/deferred-coverage.json` nomme les absences ; les retirer seulement après réalisation et exécution des cas correspondants. Tous les tests nouveaux gardent des titres `[AUD-xxx][CAS-UNIQUE][correction ou reference] …` suivant la convention existante. Ne jamais supprimer, ignorer ou affaiblir un test pour obtenir un succès.

Dans chaque fiche concernée, **conserver exactement tout le contenu existant**, y compris les anciennes IMPLEMENTATION. Ajouter à la fin `## IMPLEMENTATION` si absent, sinon une nouvelle entrée datée dans cette section. Décrire changements, fichiers/repères, nouveau fonctionnement, tests réels, SHA et limites selon le modèle. Mettre à jour la spec et DECISION_LOG ; capturer avant, vérifier après et préserver les ajouts concurrents. Une simple préparation documentaire ne reçoit pas une fausse entrée de correction.

## Couverture des issues et exclusions

| IDs | Destination |
| --- | --- |
| AUD-003/AUD-009 et ADR-0002 | SPEC-09, D |
| AUD-004/AUD-014/AUD-015/AUD-017/G14 | SPEC-04, B |
| AUD-005/AUD-016/AUD-008 | SPEC-01/02/03 respectivement, A |
| G10 et AUD-006 | SPEC-06, C ; volet affectation AUD-006 complété dans SPEC-07 |
| AUD-020/AUD-021 | SPEC-07, C |
| AUD-007 | SPEC-08, C |
| AUD-013/AUD-019 et ADR-0001 | SPEC-05, B ; convention AUD-019 conservée |
| AUD-018 | SPEC-10, D |
| AUD-022 | SPEC-11, B ; conditionnel aux mesures et à la simplicité |
| AUD-023 | SPEC-12, A ; qualification avant sélection d’une mise à jour |
| AUD-010 | Reporté à l’échange professeur ; aucune modification du secret autorisée |
| AUD-011 | Dispositif livré par CI-001 ; utilisé et complété dans chaque spec, pas à recréer |

Les 22 fiches sont ainsi soit attribuées, soit explicitement conservées/reportées/déjà livrées. Pas de nouvelle fonctionnalité, changement REST, file FIFO, activation des notifications, refonte UI, pagination ou architecture distribuée. Le premier module hexagonal reste la soumission. Les tests du professeur restent absents : ne pas prétendre les avoir passés.

## État de cette préparation

Specs préparées, aucune implémentation applicative démarrée. Les résultats historiques sont dans la [campagne CI du 15 octobre](../audit/evidence/ci-20261015/README.md) ; ils ne constituent pas une validation de ces specs. La vérification du 17 octobre confirme la fusion CI et les étapes hébergées de qualité/build réussies, avec API/E2E et bilan global en échec. Voir le [journal](../audit/DECISION_LOG.md). Message à transmettre : [équipe](../development/MESSAGE_EQUIPE.md). Ce fichier ne provoque aucun envoi à l’équipe.

## Complément sélectionné le 26 octobre 2026

[SPEC-13 — validation d’email bornée, LastChanges](SPEC-13-validation-email-bornee-LastChanges.md) traite [AUD-027](../audit/solutions-to-audit/AUD-027-validation-email-bornee-LastChanges.md). Responsable non attribué ; spec préparée, correction non implémentée. Aucun changement d'affectation des lots historiques.

[SPEC-14 — diagnostic borné, LastChanges](SPEC-14-diagnostic-borne-LastChanges.md) complète AUD-005 sur le coût d'expurgation des logs. Responsable non attribué ; préparation documentaire, correction non implémentée.

## Correction du classement SonarQube — 26 octobre 2026

Maia exige un nouvel ID pour chaque nouveau problème retenu : SPEC-14 est désormais associée à [AUD-028](../audit/solutions-to-audit/AUD-028-diagnostic-borne-LastChanges.md), et [SPEC-15 LastChanges](SPEC-15-normalisation-montant-LastChanges.md) traite [AUD-029](../audit/solutions-to-audit/AUD-029-normalisation-montant-LastChanges.md). Les mentions antérieures du rattachement à AUD-005 sont historiques. Ces specs sont préparées, non implémentées.

26 octobre 2026 — SPEC-13 inclut maintenant [AUD-030](../audit/solutions-to-audit/AUD-030-validation-email-partagee-LastChanges.md), nouvelle issue de partage du validateur, en complément d'AUD-027. Corriger isValidEmail puis l'appeler depuis signup en conservant le domaine ; pas de helper concurrent. Spec préparée, non implémentée.
