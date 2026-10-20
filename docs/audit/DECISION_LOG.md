# ARLA — Journal des décisions

## Revue des six PR et contrôles CI par spec — 19 octobre 2026

Maia demande de vérifier les six PR de G4BI2004 et de voir les tests d’une spec validés séparément. Base propre :73774862cb4f1b172d2b15bdbcb00c75b7cff6c6. Heads, preuves et conclusions distinctes Standards/Spec dans la [revue](revue-pr-g4bi2004-20261019.md).

| Issue / décision | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- |
| Revue PR1/2/3/4/5/6 sur SHA fixes | Ne pas confondre tests anciens verts et conformité complète | [Revue](revue-pr-g4bi2004-20261019.md), logsCI archivés parcas, modules exacts exécutés | Logs privés, petitsmontants/prototype, arrêtOCR et messages spécifiques à revoir ; qualificationdev à nuancer ; PR5 testée8/8 avec nouveau scénario |
| AUD-011 / CI-002 : contrôles distincts par spec réalisés | Donner un contrôleSPEC-01 identifiable et ne pas attribuer les défauts d’un autre lot à celui-ci | [Spec](../specs/CI-002-controles-par-spec.md), [IMPLEMENTATION](solutions-to-audit/AUD-011-validation-isolee.md#implementation), [campagne](evidence/ci-specs-20261019/README.md) |21unitaires/21, API62/117, E2E39/62 ;122 réussites/78 échecs/0 absent sur200 ; aucune assertion supprimée |
| Couverture obligatoire et provenance commune | Empêcher le vert d’une sélection ancienne, tronquée ou incomplète | TestsCI-SPEC-001…015, dont intégrationCLI/synthèse | Contrôle partagé des SHA/prérequis/erreurs/complétude ; divergence initiale corrigée et deux revues de suivi favorables |
| SPEC-11/12 : manual-review | Mesures et avis ne sont pas prouvés par un test vide ni la seule présence d’un fichier | Manifeste et guide de tests | Pas de nouveau test fonctionnel artificiel, validation humaine toujours nécessaire |

Toutes les fiches sont en ajout uniquement. Snapshot capturé avant travail : `/tmp/arla-ci-by-spec-20261019.json` (22 fiches). Seul AUD-011 reçoit une nouvelle entrée de réalisation du dispositif ; les autres AUD ne sont pas déclarés corrigés par les tests. Aucune PR fusionnée, branche d’auteur modifiée ou message envoyé à l’équipe. Aucun service utilisateur seedé/migré/arrêté. Les nouveaux contrôles nécessitent l’actualisation des branchesPR pour leur prochain run ; la campagne locale ne vaut pas encore exécution hébergée de cette version.


## Fusion de la CI et répartition à quatre — 17 octobre 2026

Instruction de Maia : fusionner la CI, répartir les specs entre quatre personnes et préparer le message de réalisation. **OBSERVATION Git :** fusion de feat/ci (`11b1223`) dans main, commit `f8c3af75abc785d6195cf4fb7fee0d7c57356d24`, publié sur origin/main. Aucun code applicatif ajouté ou corrigé par cette opération. Diff des sources src/migrations/scripts seed-bucket/Makefile/README depuis la source auditée : vide.

**Vérification de preuves hébergées**, run [38759546819](https://github.com/maiabuc/expense-io/actions/runs/38759546819), source `11b12231e6bc3d82baa83950db02684c1234e165`, exécuté le 15 octobre et consulté le 17 octobre : installation/lint/types/documentation/unitaires/build réussis ; API61/112, E2E38/60, aucun cas absent. Avec les 6 unitaires : 105 réussites/73 échecs sur 178, comme la campagne locale. Le résultat global est rouge ; aucune assertion retirée ni contrôle désactivé pour cette fusion de la base CI explicitement demandée. Aucune correction future déclarée validée par ces preuves.

| Issue / objet | Décision ou état | Pourquoi | Preuves / livrables | Validation |
| --- | --- | --- | --- | --- |
| CI-001 / AUD-011 | CI fusionnée dans main sur demande explicite | Base commune de tests et règles de travail | Commit f8c3af7 ; run ci-dessus ; entrée IMPLEMENTATION existante conservée | Préfixes historiques et snapshot de tâche vérifiés ; pas de nouvelle correction AUD-011 |
| Specs de réalisation | 12 specs préparées ; A:01/02/03/12 ; B:04/05/11 ; C:06/07/08 ; D:09/10 | Un responsable par chantier, dépendances et fichiers partagés explicites | [Index](../specs/README.md), [message à transmettre](../development/MESSAGE_EQUIPE.md) | Préparation documentaire seulement ; aucune implémentation ni nouvelle mesure applicative |
| Prochains merges | Proposition : PR specs vers feat/integration, puis main seulement avec CI globale verte | Les premiers lots ne corrigent pas les défauts des autres lots ; préserver les tests bloquants | Proposition adressée à Maia, reprise dans le message | Aucune branche d’intégration créée ni dérogation aux tests accordée |
| AUD-010/019/022/023 | Secret reporté ; convention conservée ; mesures et qualification conditionnelles | Ne pas transformer la répartition en nouveau périmètre métier ou upgrade automatique | Index et SPEC-05/11/12 | Aucun correctif supplémentaire autorisé par la seule rédaction |

Snapshot capturé avant préparation : `/tmp/arla-audit-team-specs-20261017.json`, devenu indisponible après la reprise de session. Référence reconstituée depuis le commit antérieur fixe `11b1223` dans `/tmp/arla-audit-team-specs-20261017-recovery.json` :22 fiches, incluant l’ancienne IMPLEMENTATION AUD-011 ; aucune capture tardive du contenu modifié. Le diff des fiches contre ce commit est vide. Aucune fiche de solution modifiée pendant cette préparation ; aucune fausse entrée IMPLEMENTATION ajoutée pour les futurs lots. La maîtrise individuelle et la compréhension de Maia ne sont pas évaluées par l’attribution A/B/C/D.


Contrôles documentaires de cette préparation :12 specs structurées selon le modèle,14 documents et leurs liens vérifiés,22 fiches couvertes par l’index ; garde append-only et comparaison Git de la CI réussies ; diff sans erreur d’espaces. Aucun test applicatif rejoué pour ce changement exclusivement documentaire.

## CI validée et réalisée — 15 octobre 2026

Maia valide le plan CI et exige l'identifiant de l'issue sur chaque test. [Spec CI-001](../specs/CI-001-tests-non-regression.md), [instructions de test](../testing/README.md), [ajout IMPLEMENTATION AUD-011](solutions-to-audit/AUD-011-validation-isolee.md#implementation).

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-011 | CI et données séparées réalisées ; vérifiées localement | Protéger les parcours/API et rendre les défauts audités visibles sans toucher aux services actuels | [Campagne, SHA de base et manifeste du diff](evidence/ci-20261015/README.md) |178 cas :105 réussites/73 échecs/0 absent ; tous les échecs correction ; lint/types/build0 ;22 préfixes protégés |
| Ensemble des issues testées | Tests liés aux IDs, défauts non corrigés dans ce lot | Un test vert isolé ne vaut pas validation de la solution complète | [Bilan par issue](evidence/ci-20261015/issues.md) | Unit6/6 ; API61/112 ; E2E38/60 ; mécanismes futurs explicitement reportés |
| AUD-023 | Collecte dépendances informative, qualification maintenue | Ne pas confondre8 alertes avec8 exploits établis | [Rapport npm](evidence/ci-20261015/dependencies.json) |7 high/1 critical ; aucun upgrade automatique |

Le workflow distingue les étapes, publie les résultats après échec et échoue sur assertion/absence/suite vide. Chaque test contient une issue existante et un cas unique ; `test:issue` sélectionne et agrège les suites correspondantes. Les fiches historiques restent intactes et l'entrée AUD-011 est ajoutée en fin. Aucun code applicatif, UI, migration ou commande existante changé. Deux revues distinctes Standards/Spec ont conduit à compléter les frontières, RLS et diagnostics, la provenance et le remplacement des anciens résultats. L'exécution GitHub n'est pas acquise par la preuve locale ; aucune compréhension indépendante n'a été évaluée.

## Règles des agents avant implémentation — 15 octobre 2026

Maia demande une préparation explicite des specs et une traçabilité en ajout uniquement : chaque réalisation complète sa fiche existante par une section IMPLEMENTATION décrivant ce qui est réalisé, où et le nouveau fonctionnement. Conserver intégralement tout le texte préexistant, y compris les anciennes entrées de réalisation ; les nouveaux résultats ne réécrivent pas l'audit initial. Règle appliquée aussi aux fiches G10/G14 et à chaque issue d'une réalisation multi-issues.

[Instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md), [modèle](../development/MODELE_SPEC.md), pointeur obligatoire dans AGENTS.md et [contrôle de préfixes](tools/check-append-only.mjs). Manifeste des 22 fiches historiques plus snapshot avant chaque tâche pour préserver les ajouts antérieurs. Validation du contrôle sur copies temporaires : [8 cas](evidence/append-only-check-results.json), dont ajouts permis, réécritures/suppression refusées et snapshot non écrasé. Aucune fiche d'issue modifiée ni fausse section de réalisation applicative ajoutée pendant cette préparation ; aucun changement applicatif. L'implémentation d'un lot reste distincte de ses instructions et de ses tests prévus.

Début : 11 octobre 2026. Mise à jour : 14 octobre 2026. Source : fork main, `265924bc7274047989e708ab635c2854d376230f`. Branche d'audit : `audit/arla-2026-10`.

Ce journal indexe les décisions ; les explications, alternatives et preuves détaillées restent dans les solutions liées. Une décision acceptée ne signifie ni implémentation ni validation. Les constats de code et leurs conséquences hypothétiques sont distingués dans [le registre](issues.md) et [les constats](findings.md). La [campagne du 14 octobre](mesures-et-preuves.md) ajoute désormais des preuves HTTP/SQL/S3/OCR isolées ; aucune correction applicative implémentée.

## Contraintes retenues

- Préserver les fonctionnalités attendues, les contrats API, les assertions de référence et les commandes build/README. Vérifier la compatibilité avec les tests du professeur, annoncés mais non inspectés.
- Contenu nouvellement rédigé en français ; erreurs API standard déjà en anglais autorisées. Conserver les identifiants techniques nécessaires à la compatibilité.
- Conserver les polices, couleurs et positions de l'UI. Pas de refonte ni d'élargissement fonctionnel sans décision explicite.
- Audit avant implémentation ; essais sur base et stockage séparés, avec deux entreprises et plusieurs rôles. Préserver les services, données et secrets actuels.

## Décisions et validation

| Sujet | Décision / statut | Pourquoi | Preuves et détails | Validation / limites |
| --- | --- | --- | --- | --- |
| AUD-001 — Source | Branche d'audit créée depuis le fork main vérifié | Rendre les constats reproductibles, préserver le travail local | [Baseline](baseline.md), [preuve source](evidence/source-baseline.md) | SHA local/distant identique ; pas de push |
| AUD-002 — Compréhension et preuves | Méthode retenue ; dossier de processus, pas défaut applicatif | Expliquer un flux à la fois et enregistrer les réponses réelles | Playbook §5 ; contexte R2 ; méthode ci-dessous | Aucun niveau de maîtrise déduit d'un assentiment |
| AUD-003 — Note et reçu | Incomplete, clé de reçu durable, reprise explicite de la même note, pending après finalisation ; identifiant stable de demande accepté | Récupérer une soumission partielle sans doublon ni approbation prématurée | [Solution](solutions-to-audit/AUD-003-receipt-consistency.md) | Non implémenté ; DB/S3, réponse perdue, concurrence et compatibilité à tester |
| AUD-004 — Tri SQL | Mapping fixe insensible à la casse ; entrée inconnue → 400 avant SQL | Le client choisit une option, pas une expression SQL | [Solution](solutions-to-audit/AUD-004-sort-input.md) | Exploitabilité non testée ; tris existants et consommateurs à vérifier |
| AUD-005 — Erreurs | Message compréhensible dans l'UI ; code technique et diagnostics en logs internes ; contrat API conservé | Feedback sûr, diagnostic interne utile | [Solution](solutions-to-audit/AUD-005-public-errors.md) | Catalogue, codes HTTP et format exact à préciser ; aucun standard nommé imposé |
| AUD-006 — Périmètre manager | Requête de reçu limitée au manager/entreprise ; affectation contrôlée dans l'API et contrainte DB même entreprise | Protéger accès et validité des relations | [Solution](solutions-to-audit/AUD-006-manager-receipt-authorisation.md) | SQL, migration, RLS effectif et tests autorisés/interdits en attente |
| AUD-007 — Décisions concurrentes | UPDATE conditionnel exigeant pending et conservant le périmètre autorisé | Empêcher d'écraser une décision déjà enregistrée | [Solution](solutions-to-audit/AUD-007-decision-concurrency.md) | Réponses répétées/conflits à préciser ; concurrence non reproduite |
| AUD-008 — OCR | Pool sans FIFO, traitement max 40 s, refus si occupé ; résultat vide réservé au succès sans champs, panne → erreur HTTP et message sûr | Borner les ressources et ne pas masquer une panne comme analyse réussie | [Solution](solutions-to-audit/AUD-008-ocr-resource-bounds.md) | Arrêt effectif, contrats d'erreur, capacité et lifecycle à vérifier ; formats formellement acceptés uniquement |
| AUD-009 — Isolation DB | RLS avec entreprise, filtres de routes conservés, compte DB appliquant les politiques | Protéger les frontières au-delà d'une seule requête | [Solution](solutions-to-audit/AUD-009-database-company-isolation.md) | Privilèges et politiques effectives non vérifiés en exécution ; tests A/B en attente |
| AUD-010 — Secret d'authentification | Reporté pour clarification professeur ; aucune solution sélectionnée | Préserver démarrage et tests tout en cadrant le secret privé | [Constat](solutions-to-audit/AUD-010-authentication-secret.md), [question préparée](questions-professeur.md) | Valeur non consignée ; aucune génération/rotation ni message envoyé |
| AUD-011 — Validation isolée | Base, stockage et données réservés aux tests | Préserver l'environnement actuel, reproduire les essais | [Solution](solutions-to-audit/AUD-011-validation-isolee.md), [protocole](evidence/runtime-protocol.md) | Mise en place après audit ; aucun environnement créé |
| AUD-012 — Skills | Disponibilité résolue ; dossier de processus | Lire les instructions réellement disponibles | [Baseline](baseline.md) | grilling/domain-modeling lus ; révision amont non vérifiée |
| AUD-013 — Inscription | Transaction unique entreprise + premier RH ; connexion automatique après commit | Éviter une création partielle dans une même base | [Solution](solutions-to-audit/AUD-013-signup-consistency.md), [ADR](../adr/0001-inscription-atomique.md) | Remplace les commits indépendants avec reprise ; rollback/concurrence à tester |
| AUD-014 — Montant | Validation complète serveur, point ou virgule unique ; préserver l'arrondi du stockage | Refuser les suffixes non numériques sans changer les montants légitimes | [Solution](solutions-to-audit/AUD-014-validation-montant.md) | Espaces, bornes, représentation et compatibilité à préparer ; 0 test |
| AUD-015 — Date | yyyy-mm-dd, date réelle, pas de date future ; horloge serveur Europe/Paris | Contrôle serveur explicite avec jour courant défini | [Solution](solutions-to-audit/AUD-015-validation-date.md) | Limite future absente du code actuel : compatibilité à vérifier ; pays/région hors scope |
| G10 — Rôle actuel | Relire le rôle côté serveur à chaque requête protégée | Ne pas conserver des permissions obsolètes jusqu'à reconnexion | [Solution](solutions-to-audit/G10-droits-role-actuel.md) | Identité session et périmètres conservés ; actions déjà engagées/liens délivrés distincts |
| G14 — Contenu des reçus | Détecter le format par les octets avant création/stockage | Extension et type annoncé ne prouvent pas le contenu | [Solution](solutions-to-audit/G14-controle-recus.md) | Formats/taille existants conservés ; bibliothèque et compatibilité à vérifier ; pas de garantie d'innocuité complète |
| AUD-016 — UI et panne réseau | Gestion d'erreur et libération en finally retenues ; saisie conservée, pas de retry automatique d'écriture | Éviter boutons/chargements bloqués sans risquer une répétition d'écriture | [Solution](solutions-to-audit/AUD-016-erreurs-reseau-ui.md), [mesures](comment-review.md#aud-016--états-ui-conservés-après-erreur-réseau) | Non implémenté ; 9 chemins observés, navigateur et tests de correction à préparer |
| AUD-017 — Date affichée | Correction retenue ; non implémentée | Préserver le jour calendaire affiché indépendamment du fuseau | [Solution](solutions-to-audit/AUD-017-affichage-date.md), [mesures](comment-review.md#aud-017--date-affichée-la-veille-selon-le-fuseau) | 3 fuseaux vérifiés ; mécanisme, navigateur et régression à préparer |
| AUD-018 — Seed partiel | Vérifier complétude et récupérer le reçu sur la même note, solution retenue | Finir une préparation interrompue sans doublon | [Solution](solutions-to-audit/AUD-018-reprise-seed.md), [source](comment-review.md#aud-018--réessai-du-seed-après-panne-du-reçu) | Hypothèse de panne non reproduite ; tests isolés à préparer, aucun seed exécuté |
| AUD-019 — Confiance dans le domaine email | Convention pédagogique conservée ; pas de correction | Préserver l'inscription simplifiée attendue, avec limite de confiance assumée | [Décision](solutions-to-audit/AUD-019-inscription-domaine.md) | Aucun nouveau service/parcours ; source relu, inscription non exécutée |
| AUD-020 — Corps d'affectation invalide | Erreurs différenciées retenues, refus avant mutation ; null explicite conservé comme retrait | Distinguer panne de lecture, structure, champ absent/invalide et demande métier valide | [Solution](solutions-to-audit/AUD-020-validation-affectation.md) | 8 parsing isolés ; aucun test de correction ni mutation réelle ; codes/libellés exacts à préparer |
| AUD-021 — Cycle entre managers | Interdire les boucles directes et indirectes, préserver les affectations valides ; règle acceptée | Garder une hiérarchie permettant de remonter à une racine | [Solution](solutions-to-audit/AUD-021-boucles-managers.md) | Non implémenté ; mécanisme atomique et contrat à préciser ; cycle et concurrence non testés |
| AUD-022 — Volume des listes | Optimisation acceptée si et seulement si simple ; piste des index à préciser, aucune pagination sélectionnée | Améliorer le coût sans changer les résultats, le total ou l'UI | [Solution conditionnelle](solutions-to-audit/AUD-022-optimisation-simple-listes.md) | Non implémenté ; index expérimental testé puis supprimé ; aucun gain HTTP démontré |
| AUD-023 — Dépendances | Alertes à qualifier ; mise à jour non sélectionnée | Distinguer version signalée et chemin effectivement exposé | [Fiche](solutions-to-audit/AUD-023-dependances.md) | npm audit : 8 packages, 7 high/1 critical ; aucun exploit ou patch validé |

## Frontières et alternatives conservées

Complément AUD-009 accepté : finalisation sous contexte utilisateur authentifié, UPDATE propriétaire/état borné et permissions DB limitées, sans droit d'auto-approbation. Mécanisme SQL, migration et validation encore à préparer ; aucune exécution DB.

Architecture hexagonale simple et progressive validée explicitement : [revue](structure-review.md), [ADR accepté](../adr/0002-hexagonal-soumission.md). Monolithe conservé, premier module soumission préparé avec ports de persistance/reçus et adaptateurs réels/test. 40 fichiers TS/TSX, 91 imports, 14 routes, 12 imports DB directs, aucun consommateur route du domaine/adaptateurs existants. Non implémentée ; détails, baseline et reprise ultérieure du checkpoint avant refactor. Pas de nouvelle centralisation manager/RH acceptée automatiquement.

Pas de refactor de centralisation des décisions sélectionné : les périmètres manager/RH sont distincts. Duplication et classes inutilisées ne suffisent pas à justifier une abstraction ; une extraction devra démontrer un bénéfice de changement ou de testabilité. Preuves : `src/domain/ExpenseNote.ts:24`, routes manager approve/reject, routes RH et [architecture](architecture.md). Cela ne remplace ni AUD-006 ni AUD-007.

La durée actuelle de cinq minutes des liens de reçu (`src/lib/storage.ts:35–37`) est une limite documentée. Sa conservation est recommandée, mais aucune exigence de révocation immédiate ni nouvelle correction sélectionnée. Le contrôle des nouvelles demandes reste obligatoire. Expiration et changement de droits à tester.

Pour AUD-013, la transaction remplace le workflow de reprise entre commits indépendants. Pour AUD-008, FIFO et file durable sont écartées. Les alternatives et motifs restent résumés dans les solutions ; aucun ancien diagramme ne doit être interprété comme le plan actuel.

## Méthode d'entretien et prochaines étapes

Campagne explicitement demandée et exécutée : services réservés, source archivé, fixtures de deux entreprises et plusieurs rôles ; 47 vérifications de scénarios, 26 conformes et 21 écarts, plus 3 contrôles de préparation. Compte Docker reconstitué superuser/BYPASSRLS ; compte limité distinct pour évaluer les politiques. Index expérimental uniquement dans base d'audit, supprimé ; aucun gain HTTP démontré. [Rapport](mesures-et-preuves.md), [processus](processus-audit.md), [classement](audit_issues_classified.md). Tests navigateur/professeur, bornes OCR et plusieurs contrats/migrations restent ouverts. Les anciennes mentions « non exécuté » décrivent la phase de conception ; les résultats de cette campagne font foi pour le périmètre exécuté.

Revue API demandée : [analyse](api-standardisation-review.md), pas de migration REST recommandée ; cohérence des erreurs/contrats et pannes clientes à traiter dans les issues existantes. Helper client et harmonisation 401/403 restent des propositions de compatibilité, pas des changements automatiquement acceptés.

AUD-019 à AUD-022 ont été discutés. AUD-021 : boucles interdites, affectations valides conservées. AUD-022 : optimisation acceptée sous condition de simplicité, sans pagination ni changement fonctionnel sélectionné. Passer désormais aux preuves et mesures isolées, puis à l'implémentation ; secret toujours reporté au professeur. Ne pas transformer les détails de préparation AX en une nouvelle série de quiz.

AUD-019 clos comme convention pédagogique conservée, pas défaut à corriger dans le périmètre choisi. Vérification d'adresse/invitation non sélectionnée ; limite de confiance documentée. Prochain sujet : AUD-020. Aucun accès interdit démontré ni modification applicative.

AUD-020 : différenciation des erreurs demandée et retenue, sans mutation sur JSON/structure/champ invalide. Retrait explicitement null préservé. HTTP 400 et message public compatible, code technique distinct en logs selon AUD-005 ; catalogue exact à préparer. Aucune correction implémentée.

Ordre confirmé : examiner les quatre nouveaux candidats AUD-019 à AUD-022, une question de décision à la fois, puis mener les preuves/mesures isolées. Commencer par la convention de rattachement d'entreprise à l'inscription. Les choix déjà retenus ne sont pas réouverts ; pas de nouveau quiz dans cette phase. Aucun mécanisme des quatre candidats sélectionné par cette instruction seule.

Nouvelle passe des 13 axes : [points à discuter](next-issues.md). Quatre candidats applicatifs AUD-019–022 et neuf points de contrat/validation AX-01–09, sans les confondre avec des défauts prouvés ou des solutions acceptées. Huit observations de parsing ajoutées ; aucun test HTTP/DB, correction ou quiz dans cette passe. Architecture simple acceptée ; audit toujours incomplet.

À la demande du bilan : [liste des changements et couverture des axes](status-and-changes.md). Corrections retenues distinguées de l'hexagonal proposé et du secret reporté. Audit incomplet : preuves runtime, contrats, priorités, mesures et migration/rollback manquent. Les 13 axes du playbook sont comparés aux travaux réels, sans pourcentage de couverture ni validation inférée. Aucun nouveau choix ou changement applicatif dans ce bilan.

Une question courte à la fois, problème concret et liens source ; pas de réponse suggérée avant l'exercice, sauf demande de recommandation. Définir les termes et utiliser un graphe Markdown si nécessaire. Ne pas rouvrir un choix accepté ni transformer une conséquence évidente en nouvelle question. Conserver les réponses réelles sans transcript ni jugement personnel. Les sujets parcourus ne prouvent pas une compréhension indépendante de tous les mécanismes.

Annoncer explicitement un checkpoint de compréhension avant de le commencer et le distinguer des décisions de conception. Après difficulté persistante ou fatigue exprimée, arrêter les questions répétitives, résumer le point et réserver la reprise à un échange ultérieur. Le checkpoint structurel DB/S3 est suspendu dans cet échange, sans maîtrise supplémentaire inférée ; cible hexagonale désormais acceptée, aucun refactor lancé.

Le premier passage sur les problèmes recensés est terminé hors secret reporté ; l'audit complet et la baseline runtime ne sont pas terminés. Préparer les priorités, contrats exacts, migrations et vérifications. Clarifier les formats OCR formellement acceptés si leur source n'est pas fournie ; ne pas confondre la liste du code avec une exigence du professeur. Préparer ensuite soutenance et live coding, sans infrastructure ajoutée pour illustrer le cours.

## Cleanup documentaire — 14 octobre 2026

Suppression de `grill_me.md` et du fichier de proposition de cleanup explicitement demandée. Journal consolidé, diagrammes obsolètes remplacés, liens corrigés. Décisions, preuves et alternatives pertinentes conservées dans les solutions et l'ADR. Aucun code, configuration, commande, donnée ou service applicatif modifié par ce cleanup. Résultats de vérification documentaire rapportés séparément, sans les présenter comme des tests applicatifs.

MEASUREMENT documentaire : 27 fichiers Markdown inspectés, 105 liens locaux contrôlés, 0 cible absente et 0 lien vers les fichiers supprimés ; blocs de code équilibrés ; 15 IDs AUD uniques dans le journal. Vérification git : aucun diff sur src, manifest/lockfile, Makefile, README racine, migrations ou Compose. Mermaid non rendu automatiquement ; comportement applicatif non testé par ce cleanup.

## Revue des commentaires — 14 octobre 2026

Décision ultérieure : AUD-017 accepté comme correction à réaliser, affichage du jour calendaire préservé quel que soit le fuseau. AUD-016 et AUD-018 à expliquer un par un avant choix de solutions. Aucun changement applicatif pendant cet échange de conception ; ancien tracker supprimé non recréé.

Décision ultérieure AUD-016 : solution acceptée sur les neuf chemins examinés, catch pour le message sûr, finally pour libérer l'état, saisie conservée et aucun renvoi automatique d'écriture incertaine. [Solution détaillée](solutions-to-audit/AUD-016-erreurs-reseau-ui.md). Avancer à AUD-018 pour expliquer le réessai du seed ; solution encore ouverte. Aucun code applicatif changé.

Décision ultérieure AUD-018 : contrôle de complétude note/référence/objet et récupération du reçu sur la même note acceptés. [Solution](solutions-to-audit/AUD-018-reprise-seed.md). Commandes et données actuelles préservées ; aucun seed exécuté. Les deux compléments RLS/finalisation (AUD-009) et échec OCR versus résultat vide (AUD-008) restent à revoir ; secret reporté au professeur. AUD-016/017/018 retenus mais non implémentés, audit non exhaustif.

Complément OCR accepté à la demande de proposer une solution : succès sans champs → résultat vide ; panne/saturation/timeout → erreur HTTP, message compréhensible et code technique en logs. UI/contrats conservés selon AUD-005, statuts exacts à préparer. Complément RLS expliqué : finalisation légitime sous contexte et droits bornés, sans permettre l'approbation de ses propres notes ; proposition non encore acceptée, aucune panne DB reproduite. Aucun code applicatif changé.

Explication complète et localisation du défaut de finalisation ajoutées à [AUD-009](solutions-to-audit/AUD-009-database-company-isolation.md#complément--finalisation-de-la-soumission) : proposition de transaction withUserScope à la finalisation, UPDATE propriétaire/état borné et permissions DB limitées ; ne pas désactiver RLS ni accorder un UPDATE général. Proposition non encore acceptée. Acceptation OCR reconfirmée, comportement erreur/résultat vide et ses sources consignés dans AUD-008.

Format des solutions contrôlé : 17 fiches avec SHA source et repères de lignes après ajout des lignes manquantes à AUD-011. Localisation, fonctionnement initial et raison du risque vérifiés ; complément OCR et finalisation détaillés. Les titres ne sont pas tous uniformes, mais les preuves ne sont pas remplacées par une affirmation de conformité formelle. Aucun nouveau test applicatif ni code modifié.

Hypothèse de commentaires signalant des erreurs réexaminée sur le même SHA. [Revue complète](comment-review.md) : 41 fichiers src inventoriés, 12 groupes de commentaires dans 10 fichiers. Plusieurs commentaires sont cohérents ; provenance IA/intention non vérifiées. Deux omissions reproduites sur code isolé et une hypothèse seed enregistrées comme AUD-016 à AUD-018. Compléments AUD-009 : contexte/politique UPDATE propriétaire ; AUD-008 : échec moteur et résultat vide confondus. Pas de nouvelle solution acceptée.

Mesures : 18 exécutions de handlers extraits (9 succès/9 pannes simulés) et 3 observations de fuseau. Pas de React monté, HTTP, DB, S3 ou OCR réel ; baseline applicative toujours en attente. Le registre précédent n'était pas exhaustif ; premier passage sur les problèmes déjà recensés ne clôt pas cet audit. Aucun code applicatif/service modifié ; ancien tracker supprimé non recréé.

## Bilan documentaire et clôture de campagne — 15 octobre

Installation propre et lint/types/build : exit 0. Campagne : 47 vérifications de scénarios, 26 conformes et 21 écarts ; 3 contrôles de fixtures séparés. 22 fiches sourcées, 25 références classées. Processus explicité, revue API produite par agent, classification/format revus par second agent sur demande de Maia. Aucun changement du code original ni de ses commandes, aucun service utilisateur arrêté. Les deux serveurs et le projet Docker d’audit ont été supprimés après copie des preuves ; aucun volume portant le label du projet n’est listé, sans affirmer la suppression de tout volume anonyme non identifié. Les copies /tmp et l’image Node restent disponibles.

Audit non clos : vérifier les parcours navigateur/E2E de référence et les frontières runtime restantes ; compléter capacité/bornes OCR et applicabilité des dépendances ; figer les contrats et la trajectoire de migration pour les corrections retenues. La validation des corrections et les mesures après refactor appartiennent à la phase d’implémentation. Les anciens résultats non exécutés restent des notes de conception, pas le bilan actuel.

## Cohérence des corrections et passation — 15 octobre

Revue demandée pour préparer le travail des équipes : [bilan](coherence-et-passation.md). Tensions de contrat identifiées (incomplete/reprise et UI/API, tri nommé et anciennes expressions), sans annuler les directions acceptées. Dépendances bloquantes : RLS et finalisation bornée, état de soumission et décision atomique, rôle actuel/entreprise/cycle et affectation, catalogue d’erreurs et consommateurs OCR/UI. Cinq livrables à finir : contrats, matrice de droits/transitions, migration/mise en service, référence de validation, lots et critères d’acceptation. Ordre des lots proposé seulement ; aucune correction, nouvelle permission, infrastructure ou norme API sélectionnée par la revue. Bilan d’état actualisé pour ne plus compter comme manquants installation/lint/types/build et scénarios déjà exécutés. Aucun test runtime supplémentaire ; aucune maîtrise indépendante inférée.

## Références de réalisation et clôture documentaire — 15 octobre

Instruction explicite : « Pas besoin de plan de migration et retour en arrière. Cree les fichiers 1 à 5 du coup pour finir l’audit ». Exclusion retenue : aucun plan de migration/rollback créé ou exigé comme condition de clôture. Préservation des données et décisions existantes maintenue.

Livrables : [1 — contrats](01-contrats-implementation.md), [2 — permissions/transitions](02-permissions-et-transitions.md), [3 — périmètre/dépendances](03-perimetre-et-dependances.md), [4 — validation](04-reference-de-validation.md), [5 — lots/acceptation](05-lots-et-acceptation.md). Le troisième remplace le livrable exclu. Directions acceptées conservées ; compléments techniques de l’agent identifiés comme tels, pas attribués à une réponse de Maia : clé Idempotency-Key optionnelle pour compatibilité, reprise 200/201, représentation incomplete et action dans le formulaire existant, catalogue d’erreurs, protection concurrente de hiérarchie, défaut de pool OCR conservateur. Aucune nouvelle architecture, file ou migration REST sélectionnée.

Clôture du dossier documentaire sur le périmètre décrit au fichier 5. Aucun nouveau test runtime, aucune implémentation ni validation de correction ; les résultats de la campagne restent inchangés. Tests du professeur absents, formats formels OCR, navigateur/charge et compte DB utilisateur restent des réserves nommées ou critères de réalisation. Aucune garantie de compatibilité externe ni maîtrise indépendante inférée.

## SPEC-01 réalisée — personne A — 18 octobre 2026

Branche `feat/spec-01`, départ `7377486` (main actualisé), réalisation `a8411b9`. Snapshot append-only avant travail : `/tmp/arla-spec-01-gf.json` (22 fiches) ; contrôle `check` réussi après ajout, aucun préfixe altéré.
Branche `feat/spec-01`, départ `7377486` (main actualisé), réalisation `a8411b9` ; voir [la PR](https://github.com/maiabuc/expense-io/pull/new/feat/spec-01), pas encore mergée dans `main` à la rédaction de cette entrée. Snapshot append-only avant travail : `/tmp/arla-spec-01-gf.json` (22 fiches) ; contrôle `check` réussi après ajout, aucun préfixe altéré.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-005 | Implémentée et vérifiée : réponse publique générique en français + HTTP 500, diagnostic interne structuré (code/opération/statut/message/stack) jamais transmis au client | Séparer feedback utilisateur et diagnostic sans changer les consommateurs UI existants | [Entrée IMPLEMENTATION](solutions-to-audit/AUD-005-public-errors.md#implementation), [SPEC-01](../specs/SPEC-01-erreurs-api.md) | lint/typecheck/build exit 0 ; unit 6/6 ; `test:issue -- AUD-005` 3/3 (PANNE-002, PANNE-003, NOTE-022) ; api 64/112 et e2e 38/60 sans aucune régression sur AUD-005 (échecs restants tous attribués à des specs non encore réalisées) |

Catalogue d'erreurs par type, mapping HTTP fin et corrélation de requête restent non définis (hors périmètre explicite d'AUD-005). CI GitHub non déclenchée pour cette réalisation locale ; à confirmer à l'ouverture de la PR. SPEC-02/03/04/06/07/09 adapteront leurs propres routes au mécanisme commun livré ici.

## SPEC-01 corrigée après revue — personne A — 19 octobre 2026

`feat/spec-01` actualisée avec `main` `651b067` (dispositif CI-002 et nouveaux tests), puis correction du constat P1 de la [revue du 19 octobre](revue-pr-g4bi2004-20261019.md). Snapshot avant travail : `/tmp/arla-spec-01-review-gf.json` ; contrôle `check` réussi, entrée du 18 octobre conservée telle quelle.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-005 | Diagnostic interne expurgé avant émission (jetons, cookies, identifiants d'URL de connexion, clés sensibles, chaînes de requête d'URL) ; réponse publique inchangée | La validation du 18 octobre couvrait la réponse mais pas le journal : C2 non satisfait, corrigé | [Entrée du 19 octobre](solutions-to-audit/AUD-005-public-errors.md#implementation) | `SPEC-01 — tests du lot` vert en local : 7/7 dont PANNE-004 ; unit 21/21 ; aucune autre spec modifiée par rapport à la référence `main` |

Les cas PANNE-005…007 sont placés dans la suite API : un cas AUD-005 unitaire rendrait le scénario d'outillage CI-SPEC-014 « incomplete » au lieu de « failed ». Le contrôleur AUD-011 n'est pas modifié ; point signalé pour sa revue.
## Contre-revue des corrections de Gab — 20 octobre 2026

Demande : revérifier les specs après passage annoncé de la pipeline. [Rapport](revue-pr-g4bi2004-20261020.md) et [preuves épinglées aux six SHA](evidence/review-20261020/ci-and-probe.json). OBSERVATION : contrôles SPEC-01 à 05 verts (7/7, 33/33, 12/12, 44/44, 8/8) ; les six pipelines globales restent rouges. SPEC-12 est documentaire, le job dépendances est informatif.

AUD-005 / SPEC-01 : conserver le refus de clôture, car le module actuel laisse passer les secrets sous forme JSON ou entre guillemets. MESUREMENT : reproduction réelle sur `6e8b268`, deux formats exposés et deux témoins filtrés ; aucune donnée sensible réelle. Compléter le filtrage ou limiter les diagnostics à des champs maîtrisés, puis tester ces frontières. AUD-008 / SPEC-03 : arrêt réel et remplacement désormais couverts ; C4 reste partiel, campagne trop courte et sans tous les indicateurs/provenance du protocole retenu. Compléter les preuves sans changer la décision pool sans FIFO, capacité initiale 1, délai 40 s.

Corrections demandées des SPEC-02/04/05 présentes et contrôles verts sur le périmètre décrit ; nuance documentaire SPEC-12 ajoutée. Pas de nouveau choix métier, correction applicative ou fusion dans cette tâche. Les fiches AUD restent intactes ; la revue est consignée ici, sans fausse section IMPLEMENTATION applicative.

## Correction SPEC-01 avant intégration — 20 octobre 2026

Instruction Maia : corriger SPEC-01 sur sa branche, pousser, puis fusionner successivement SPEC-01 à 05 dans main. Confirmation après interruption : ne pas fusionner SPEC-01 vers main avant correction. Aucune fusion applicative vers main effectuée à ce stade ; seule la contre-revue a été conservée puis récupérée dans feat/spec-01.

| Issue | Décision | Pourquoi | Preuve | Validation |
| --- | --- | --- | --- | --- |
| AUD-005 | Corriger valeurs JSON/citées et ajouter PANNE-008/009 avant push/merge | Les motifs s'arrêtaient aux guillemets avant le secret | [Ajout IMPLEMENTATION](solutions-to-audit/AUD-005-public-errors.md#2026-10-20--spec-01-secrets-json-et-valeurs-citées), [checks](evidence/spec01-fix-20261020/checks.json) | SPEC-01 9/9 ; unit 21/21 ; lint/types/build exit 0 ; API 71/122, 51 échecs hors lot, aucune référence en échec |

Les contrôles globaux restent requis et leurs échecs publiés. L'instruction explicite autorise les fusions successives malgré le rouge lié aux lots non intégrés ; aucun contournement du workflow ni changement des assertions. SPEC-03 contient déjà SPEC-04 : son intégration amènera cette dépendance ; vérifier ensuite que SPEC-04 est entièrement ancêtre de main. La réserve de mesures C4 OCR reste ouverte, sans changer le choix pool sans FIFO et 40 s.
## SPEC-02 réalisée — personne A — 18 octobre 2026

Branche `feat/spec-02`, départ `7377486` (main actualisé, sans `feat/spec-01` encore mergée), réalisation `16cb7ad`. Snapshot append-only avant travail : `/tmp/arla-spec-02-gf.json` (22 fiches) ; contrôle `check` réussi après ajout.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-016 | Implémentée et vérifiée : les 12 appels fetch des trois écrans libèrent leur état actif en `finally` et affichent un message sûr au `catch` (rejet réseau ou JSON illisible) ; saisie conservée après échec, pas de retry automatique | Rendre les actions utilisables après une panne sans transformer une absence de réponse en certitude d'échec serveur | [Entrée IMPLEMENTATION](solutions-to-audit/AUD-016-erreurs-reseau-ui.md#implementation), [SPEC-02](../specs/SPEC-02-recuperation-ui.md) | lint/typecheck/build exit 0 ; unit 6/6 ; `test:issue -- AUD-016` 32/32 (NET-001…032) ; e2e 58/60 (AUD-016 0 échec, 2 échecs restants hors périmètre sur AUD-013/017) |

AUD-005 échoue encore sur cette branche (api 61/112) uniquement parce que `feat/spec-01` n'y est pas mergée : ce n'est pas une régression de SPEC-02, les deux branches ne modifient pas les mêmes fichiers. À réévaluer à l'intégration des deux PR.

## SPEC-02 corrigée après revue — personne A — 19 octobre 2026

`feat/spec-02` actualisée avec `main` `651b067`, puis correction du constat P2 de la [revue du 19 octobre](revue-pr-g4bi2004-20261019.md). Snapshot avant travail : `/tmp/arla-spec-02-review-gf.json` ; contrôle `check` réussi.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-016 | Le champ `error` d'une réponse non réussie est affiché s'il est lisible, repli sinon, sur les huit chemins qui l'ignoraient | Un 503 « service occupé » ne doit pas être présenté comme une panne générique | [Entrée du 19 octobre](solutions-to-audit/AUD-016-erreurs-reseau-ui.md#implementation) | `SPEC-02 — tests du lot` vert en local : 33/33 dont NET-033 ; unit 21/21 |

La sûreté du texte affiché suppose le contrat serveur de SPEC-01 : intégrer SPEC-01 avec ou avant SPEC-02.
## SPEC-04 réalisée — personne B — 18 octobre 2026

Branche `feat/spec-04`, départ `7377486` (main actualisé, sans `feat/spec-01`/`feat/spec-02`/`feat/spec-05` encore mergées), réalisation `c445659`. Snapshot append-only avant travail : `/tmp/arla-spec-04-gf.json` (22 fiches) ; contrôle `check` réussi après ajout. Nouveau module pur `src/utils/validators.ts` (montant/date/tri/détection de reçu), indépendant de Next/pg/AWS, prévu pour réutilisation par SPEC-09.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-004 | Implémentée : table de tri nommée fixe, option inconnue refusée en 400 avant requête | Le texte reçu ne doit jamais devenir une expression SQL | [Entrée](solutions-to-audit/AUD-004-sort-input.md#implementation) | `test:issue -- AUD-004` 6/6 |
| AUD-014 | Implémentée : montant validé par motif complet + borne BigInt après arrondi, chaîne normalisée transmise à PostgreSQL | Rejeter les formats mal formés sans arrondi JS ni dépassement silencieux | [Entrée](solutions-to-audit/AUD-014-validation-montant.md#implementation) | `test:issue -- AUD-014` 12/12 |
| AUD-015 | Implémentée : format yyyy-mm-dd, existence réelle du jour, refus du futur selon Europe/Paris | L'horloge cliente est modifiable, le format est déjà établi | [Entrée](solutions-to-audit/AUD-015-validation-date.md#implementation) | `test:issue -- AUD-015` 7/7 (dont minuit Paris) |
| AUD-017 | Implémentée : affichage en `timeZone: 'UTC'` explicite sur les trois écrans | Éliminer le glissement de jour selon le fuseau du lecteur | [Entrée](solutions-to-audit/AUD-017-affichage-date.md#implementation) | `test:issue -- AUD-017` 4/4 (Paris/UTC/Los Angeles/minuit) |
| G14 | Implémentée : détection du format réel par signature d'octets avant écriture/upload, comparée au type annoncé | Un type annoncé seul n'est pas une preuve du contenu | [Entrée](solutions-to-audit/G14-controle-recus.md#implementation) | `test:issue -- G14` 11/11 |

api 82/112 (0 échec sur les 5 cartes de ce lot) ; e2e 39/60 (0 échec AUD-017). Échecs restants attribués à des specs non réalisées sur cette branche ou à des dépendances (SPEC-01/02/05) non mergées — pas des régressions de SPEC-04.

## SPEC-03 réalisée — personne A — 18 octobre 2026

Branche `feat/spec-03`, départ `7377486`, `feat/spec-04` fusionnée dedans (dépendance de validation de fichiers requise par la coordination de la spec, pas encore dans `main`), réalisation `5393aee`. Snapshot append-only avant travail : `/tmp/arla-spec-03-gf.json` (22 fiches) ; contrôle `check` réussi après ajout.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-008 | Implémentée, validation incomplète : pool borné (1 moteur), arrêt réel sur panne/délai au lieu de remise en circulation, panne distincte d'un succès vide, `errorHandler` ajouté après qu'une vérification manuelle a reproduit un crash processus sans lui | Ne pas faire croire qu'un reçu a été analysé quand le moteur n'a pas pu travailler ; ne pas laisser une seule image corrompue planter le serveur pour tous | [Entrée IMPLEMENTATION](solutions-to-audit/AUD-008-ocr-resource-bounds.md#implementation), [SPEC-03](../specs/SPEC-03-ocr-borne.md) | `test:issue -- AUD-008` 8/8 ; api 84/112, e2e 39/60 sans régression ; vérification manuelle de saturation/panne/réutilisation ; **mesures CPU/RAM, concurrence 2/4 et arrêt réel à 40s en conditions réelles non exécutées** (campagne manuelle dédiée, cf. `tests/deferred-coverage.json`) |

La découverte du crash processus (tesseract.js relance l'erreur dans son gestionnaire de messages en plus de rejeter la promesse du job) vient d'une vérification manuelle allant au-delà de la suite automatisée existante, qui ne l'exerçait pas. Corrigée par un `errorHandler` no-op fourni à `createWorker`, sans effet sur le rejet normal déjà traité par le code.

## SPEC-04 corrigée après revue — personne B — 19 octobre 2026

`feat/spec-04` actualisée avec `main` `651b067`, puis correction des constats P1/P2 de la [revue du 19 octobre](revue-pr-g4bi2004-20261019.md). Snapshot avant travail : `/tmp/arla-spec-04-review-gf.json` ; contrôle `check` réussi.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-014 | Positivité contrôlée sur la saisie avant arrondi, borne contrôlée après arrondi | `0.001` est une valeur positive admise par le contrat C3 | [Entrée du 19 octobre](solutions-to-audit/AUD-014-validation-montant.md#implementation) | ENTREE-001/003/004 réussis |
| AUD-004 | Options de tri dans une `Map` | Une propriété héritée ne doit jamais devenir un fragment SQL | [Entrée du 19 octobre](solutions-to-audit/AUD-004-sort-input.md#implementation) | ENTREE-002 réussi |

`SPEC-04 — tests du lot` vert en local : 44/44 ; unit 21/21. SPEC-03, qui embarque SPEC-04, doit récupérer cette correction.

## SPEC-03 corrigée après revue — personne A — 19 octobre 2026

`feat/spec-03` actualisée avec `main` `651b067` puis avec `feat/spec-04` corrigée (SPEC-03 embarque SPEC-04 et en héritait les défauts). Correction du constat P1 de la [revue du 19 octobre](revue-pr-g4bi2004-20261019.md). Snapshot avant travail : `/tmp/arla-spec-03-review-gf.json` ; contrôle `check` réussi.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-008 | Pool en fabrique testable ; place rendue seulement après l'événement `exit` du thread ; arrêt non confirmé : place conservée et échec journalisé | `terminate()` de tesseract.js n'attend pas l'arrêt : il ne prouvait rien, et un remplaçant pouvait tourner en parallèle de l'ancien thread | [Entrée du 19 octobre](solutions-to-audit/AUD-008-ocr-resource-bounds.md#implementation), [mesures](evidence/ocr-pool-20261019/README.md) | OCR-POOL-001…004 réussis, et le défaut réintroduit volontairement est détecté ; `SPEC-03 — tests du lot` vert en local (12/12) ; délai de production de 40 s mesuré sur thread bloqué |

Les mesures sont uniques et faites sur une machine de développement. Le délai de 40 s est vérifié sur un thread bloqué synthétique, pas sur une reconnaissance Tesseract longue. La capacité reste à 1.
## SPEC-05 réalisée — personne B — 18 octobre 2026

Branche `feat/spec-05`, départ `7377486` (main actualisé, sans `feat/spec-01`/`feat/spec-02` encore mergées), réalisation `ba39f53`. Snapshot append-only avant travail : `/tmp/arla-spec-05-gf.json` (22 fiches) ; contrôle `check` réussi après ajout.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-013 | Implémentée et vérifiée : entreprise (nouvelle ou existante) et premier compte validés sur une transaction PostgreSQL unique ; un échec annule aussi l'entreprise de la tentative, jamais une entreprise déjà existante | Éviter une entreprise orpheline sans premier RH après panne | [Entrée IMPLEMENTATION](solutions-to-audit/AUD-013-signup-consistency.md#implementation), [SPEC-05](../specs/SPEC-05-inscription-atomique.md) | lint/typecheck/build exit 0 ; unit 6/6 ; `test:issue -- AUD-013` 7/7 (INS-001…007, dont INS-006 correction par trigger de panne contrôlée) ; e2e 39/60 (AUD-013 0 échec, 21 échecs hors périmètre : AUD-016/017, dépendances non mergées) |
| AUD-019 | Convention conservée, aucune correction (confirmé) | Ne pas transformer une limite de confiance pédagogique assumée en nouveau périmètre métier | [Entrée IMPLEMENTATION](solutions-to-audit/AUD-019-inscription-domaine.md#implementation) | Relecture du code modifié et des cas INS-001/002 ; aucune vérification de possession de domaine ajoutée |

AUD-016/017 échouent encore sur cette branche uniquement parce que `feat/spec-02`/`feat/spec-04` n'y sont pas mergées : pas des régressions de SPEC-05, fichiers disjoints.

## SPEC-05 : preuves complétées après revue — personne B — 19 octobre 2026

`feat/spec-05` actualisée avec `main` `651b067`, qui apporte INS-008. Aucun changement de code. Snapshot avant travail : `/tmp/arla-spec-05-review-gf.json` ; contrôle `check` réussi.

| Issue | Décision et état | Pourquoi | Preuves | Validation |
| --- | --- | --- | --- | --- |
| AUD-013 | Échec de connexion après commit désormais prouvé par INS-008 | Le statut « vérifié » du 18 octobre ne reposait sur aucun test de ce scénario | [Entrée du 19 octobre](solutions-to-audit/AUD-013-signup-consistency.md#implementation) | `SPEC-05 — tests du lot` vert en local : 8/8 |
