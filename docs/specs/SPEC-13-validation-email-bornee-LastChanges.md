# SPEC-13 — Validation d'email bornée à l'inscription

## Identification

- Objet : partager une validation d'email corrigée et bornée entre le validateur existant et l'inscription.
- Lot et ID : SPEC-13, AUD-027 et AUD-030 ; responsable non attribué.
- Statut : préparée, non implémentée.
- Autorisation : Maia demande une fiche AUD et une spec avec suffixe `-LastChanges`. Cette intervention produit la documentation, pas la correction.
- Fiches : [AUD-027](../audit/solutions-to-audit/AUD-027-validation-email-bornee-LastChanges.md) et [AUD-030](../audit/solutions-to-audit/AUD-030-validation-email-partagee-LastChanges.md).
- Source historique du projet : `265924bc7274047989e708ab635c2854d376230f` ; constat et révision de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.
- État local préservé : package-lock.json déjà modifié ; journal et nouveaux documents SonarQube/risques assumés issus de l'audit en cours.

## Problème et parcours actuel

Formulaire signup → action serveur signup → EMAIL_PATTERN.exec sans borne de longueur → contrôles nom/mot de passe → domaine → bcrypt → transaction entreprise/compte → connexion après commit. L'expression présente des retours arrière coûteux sur certaines chaînes invalides ; quatre mesures locales sont liées dans AUD-027. Aucun déni de service HTTP démontré.

## Résultat attendu et parcours cible

Formulaire inchangé → action serveur → vérifier le type → isValidEmail corrigé vérifie longueur et format → extraire le domaine validé → contrôles existants → même hachage, transaction et connexion.

Choix technique de préparation : `MAX_EMAIL_LENGTH = 4096`, en unités UTF-16 comme string.length. Ce plafond généreux borne l'entrée sans imposer une nouvelle politique RFC de validation d'email. Ce n'est ni une limite issue du cours ni un seuil de performance mesuré. Une valeur plus longue est intentionnellement refusée avec le message de formulaire existant, avant hachage et DB.

Corriger la fonction pure existante `isValidEmail(value: string): boolean` dans `src/utils/validators.ts`, avec contrôle de longueur avant analyse puis parcours déterministe : exactement un @, partie locale non vide, aucun caractère blanc selon la sémantique JavaScript actuelle, domaine contenant au moins un point avec au moins un caractère de chaque côté. Conserver l'export et la signature ; ne pas créer signup-email.ts.

Dans signup, vérifier d'abord que l'email est une chaîne, puis appeler directement isValidEmail. Après succès, extraire le domaine avec la position de l'unique @ validé, puis le convertir en minuscules comme actuellement. L'email original stocké reste inchangé. Retirer l'expression EMAIL_PATTERN locale à l'action ; le contrôle de format et de longueur reste dans une seule implémentation. Le domaine est extrait sans réexécuter une seconde validation. Temps au plus linéaire sous la borne ; refus par longueur avant parcours au-delà.

La grammaire reste celle de l'expression actuelle sous le plafond : ne pas interdire silencieusement les points consécutifs, domaines à plusieurs points ou autres formes auparavant acceptées. Ne pas ajouter trim, normalisation de l'email, règle ASCII ou validation exhaustive RFC. Une comparaison sur corpus courts tranche les ambiguïtés.

## Contrats et invariants

Références lues : [1 — contrats, inscription](../audit/01-contrats-implementation.md), [2 — permissions](../audit/02-permissions-et-transitions.md), [3 — périmètre](../audit/03-perimetre-et-dependances.md), [4 — validation, AUD-013/019](../audit/04-reference-de-validation.md), [5 — lots et fin](../audit/05-lots-et-acceptation.md). La borne technique est le complément ciblé de cette spec, pas une réécriture des décisions historiques.

| Situation | Résultat attendu | Effet persistant autorisé |
| --- | --- | --- |
| Email valide, longueur ≤ 4096 | Même domaine et parcours qu'actuellement | Entreprise/compte selon transaction existante |
| Email non chaîne, invalide ou longueur > 4096 | Même erreur de formulaire qu'actuellement | Aucune écriture ni ouverture de connexion ; aucun hachage |
| Domaine nouveau / déjà présent | Premier RH / employé selon convention existante | Même attribution et isolation |
| Email déjà pris, panne ou inscription concurrente | Messages et atomicité AUD-013 inchangés | Aucun doublon ou entreprise orpheline |
| Connexion après commit échouée | Message existant, compte conservé | Commit conservé |

Ne pas transformer l'action en API JSON ou ajouter un nouveau code HTTP public. Ne pas changer le login ni rejeter les comptes historiques à la connexion du seul fait du nouveau plafond d'inscription.

## Périmètre de changement

| Fichier prévu | Responsabilité | Coordination |
| --- | --- | --- |
| src/utils/validators.ts, isValidEmail | Corriger le validateur existant, borne préalable et parcours déterministe | Pas de dépendance Next/DB, pas de bibliothèque nouvelle |
| src/app/actions/auth.ts | Appeler isValidEmail corrigé et extraire le domaine à la place d'EMAIL_PATTERN.exec | Conserver transaction et signIn, périmètre SPEC-05 |
| tests/unit/signup-email.test.ts | Corpus de compatibilité et frontières du helper | Titres [AUD-027,AUD-030][EMAIL-xxx][correction] pour les cas communs ; cas propres au partage sous [AUD-030] |
| tests/unit/signup-email-action.test.ts | Appeler signup avec dépendances contrôlées pour vérifier refus avant bcrypt/DB | Vérifier le comportement, sans recopier son implémentation |
| tests/e2e/signup.spec.ts | Cas HTTP serveur de refus et absence d'écritures, conservation des cas existants | Fixtures réelles isolées ; contourner le seul contrôle HTML pour tester le serveur |
| tests/specifications.json | Enregistrer SPEC-13, AUD-027, AUD-030 et cas réels après création | Ne pas fabriquer de réussite pour des cas absents |
| Fiches AUD-027/AUD-030, cette spec, journal | Résultats et entrée IMPLEMENTATION lors de la correction | Préfixes immuables |

Exclus : autres alertes Sonar, login, secrets, règles de rôles, UI et schéma DB. L'inclusion d'isValidEmail est désormais explicitement sélectionnée par Maia dans AUD-030. Ne pas toucher aux autres validateurs de validators.ts ou introduire de nouveau validateur parallèle.

## Critères d'acceptation

| ID | Condition vérifiable | Vérification |
| --- | --- | --- |
| C1 | Email > 4096 refusé avant analyse, hachage et DB | EMAIL-001 : action appelée avec champs valides sauf email surdimensionné, aucun appel bcrypt/getPool/signIn |
| C2 | Frontières 4095/4096 acceptées si syntaxiquement valides ; 4097 refusée | EMAIL-002 à 004, chaînes synthétiques exactes |
| C3 | Même acceptation et même domaine que l'expression initiale sous la borne | EMAIL-005 : corpus court incluant multi-points, casse, espaces, tabulations, retours ligne, Unicode, @ et points aux frontières |
| C4 | Entrée malformée à nombreux points et email non chaîne refusés | EMAIL-006/007 ; parcours du helper et action |
| C5 | Refus réellement côté serveur, aucune création compte/entreprise | EMAIL-008 E2E avec contraintes HTML neutralisées, lecture SQL avant/après sur base isolée |
| C6 | Parcours positif, rôles, concurrence, rollback et panne après commit conservés | Suite signup existante AUD-013 et nouvelle validation |
| C7 | Analyse sans retours arrière et coût borné par construction | Relecture du parcours déterministe + mesures isolées avant/après, sans assertion de temps fragile |
| C8 | CI découvre les cas réels et aucun test de référence n'est affaibli | Catalogue, unitaires, API/E2E, bilan par spec |
| C9 | signup appelle réellement isValidEmail corrigé ; aucune expression email indépendante dans l'action | EMAIL-009, appel de l'action avec observation de la dépendance et résultat de formulaire ; revue des imports |
| C10 | Domaine extrait identique pour casse, sous-domaines et points admis ; email original conservé | EMAIL-010, comparaison des données transmises à la transaction ; ne pas normaliser l'adresse entière |

Pour C3, l'ancienne regex peut servir d'oracle uniquement sur de petites chaînes bornées dans les tests ; ne jamais l'utiliser sur des entrées adverses volumineuses. Pour C7, utiliser un processus séparé avec délai maximum, données synthétiques fixes et plusieurs répétitions ; conserver les durées brutes et ne pas annoncer un débit HTTP à partir de ce microbenchmark.

## Réalisation prévue

1. Capturer à nouveau les fiches au début de l'implémentation ; caractériser corpus et frontières avec cas uniques.
2. Corriger isValidEmail puis l'appeler dans signup et extraire le domaine avant toute opération coûteuse ; ne pas déplacer les opérations de transaction.
3. Vérifier les refus de l'action et les effets SQL via les services jetables du harnais ; conserver deux entreprises et plusieurs rôles.
4. Enregistrer SPEC-13 et ses cas réels dans le manifeste, puis exécuter les vérifications ci-dessous.
5. Ajouter IMPLEMENTATION à AUD-027 et AUD-030 avec changements, fichiers, nouveau fonctionnement, résultats réels et révision ; mettre à jour spec et journal.

## Validation à exécuter puis résultats réels

| Commande / scénario | Prévu | Réel à la préparation | Preuve / limite |
| --- | --- | --- | --- |
| node docs/audit/evidence/sonarqube-20261026/email-pattern-benchmark.mjs | Caractériser l'expression actuelle | Exit 0, 4/4 entrées refusées | JSON voisin ; un premier lancement sandbox a échoué sur spawnSync git EPERM, puis relance autorisée réussie |
| node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-audit-027-spec-LastChanges-20261026.json | Préfixes conservés | Exit 0, 22 fiches historiques conservées ; snapshot vérifié | Contrôle documentaire uniquement |
| npm run ci:docs | Catalogue et documents cohérents | Non exécuté | À lancer après création effective des tests |
| npm run lint / npm run typecheck / npm run build | Réussite | Non exécutés | Aucun code modifié pendant cette préparation |
| npm run test:unit | Critères unitaires et référence réussis | Non exécuté | Ajouter les cas avant sélection |
| npm run test:issue -- AUD-027 puis AUD-030 | Sélection non vide, tous cas liés réellement exécutés | Non exécuté | Commande destinée à l'implémentation |
| npm run test:api / npm run test:e2e / npm run test:report | Référence conservée, nouveaux cas verts | Non exécutés | Services jetables du harnais seulement |
| npm run test:spec:report -- SPEC-13 | Bilan conforme aux résultats complets du même SHA | Non exécuté | Après inscription dans le manifeste ; ne lance pas les tests |
| Mesure comparative du helper corrigé | Temps borné, résultats corrects | Non exécutée | Pas d'amélioration revendiquée avant réalisation |

## Traçabilité et fin

- Snapshot avant rédaction : `/tmp/arla-audit-027-spec-LastChanges-20261026.json` (22 fiches existantes).
- Un ajout daté de préparation dans AUD-027 signale la nouvelle décision ; aucune correction applicative livrée. AUD-030 ne porte pas encore de section de réalisation.
- [Journal](../audit/DECISION_LOG.md) actualisé pour AUD-027/SPEC-13.
- Réalisation documentaire : diff local du 26 octobre 2026, aucun commit créé.
- Restant : implémentation, tests, mesures comparatives et validation des critères. L'inscription dans le manifeste CI attend les tests réels ; cette spec n'est pas présentée comme livrée ou vérifiée.
- La demande de spec n'est pas une réponse à l'exercice de compréhension précédent ; aucun acquis individuel attribué.

## Actualisation du périmètre — 26 octobre 2026

Maia choisit de corriger et réutiliser isValidEmail à l'inscription, plutôt que de supprimer cette fonction. AUD-030 suit cette nouvelle issue ; AUD-027 reste distinct pour le coût sur le parcours d'inscription. La proposition précédente de helper signup-email.ts séparé est remplacée dans cette spec. Une seule spec couvre leur correction commune. Snapshot avant actualisation : `/tmp/arla-audit-030-LastChanges-20261026.json`, 26 fiches. Code et tests non modifiés. Contrôle des préfixes : exit 0, 22 fiches historiques et snapshot de 26 fiches vérifiés.
