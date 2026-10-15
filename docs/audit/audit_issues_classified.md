# Issues classées : nature, impact et priorité

14 octobre 2026. Code original de référence : `265924bc7274047989e708ab635c2854d376230f`, SHA local revérifié pour ce classement. Ce document rassemble **25 références : AUD-001 à AUD-023, G10 et G14**. Quatre concernent la conduite de l'audit ; vingt et une concernent l'application ou ses outils. Ce total n'est ni un nombre de vulnérabilités prouvées, ni un taux de couverture du dépôt.

Objectif : expliquer aux professeurs ce qui mérite une correction, ce qui constitue une limite assumée, et ce qui relève d'une évolution utile. Les [fiches détaillées](README.md), le [registre](issues.md) et le [journal des décisions](DECISION_LOG.md) conservent les sources, comportements initiaux, alternatives et validations. Les choix actuels sont ceux du tableau du journal et des fiches ; les notes historiques ne les remplacent pas.

## Comment lire le classement

La **nature** du point, son **impact potentiel**, sa **preuve** et sa **priorité** répondent à quatre questions différentes. Une conséquence grave peut rester une hypothèse à tester ; un défaut local peut être reproduit avec une forte confiance sans être une grande faille de sécurité.

| Nature | Sens dans cet audit |
| --- | --- |
| Défaut au regard d'une règle retenue | Le code ne protège pas une règle attendue, ou confond deux situations différentes. Le défaut de construction peut être observé sans que toute sa conséquence HTTP/DB soit reproduite. |
| Limite acceptable | Un compromis est conservé dans le périmètre choisi, avec sa frontière explicitée. Ce n'est pas une garantie pour un usage plus exigeant. |
| Convention pédagogique | Un fonctionnement simplifié est volontairement conservé par Maia pour ce projet. Cela ne prouve pas une exigence formelle du professeur. |
| Hypothèse de performance / évolution | Le coût pourrait augmenter avec le volume ; aucune lenteur n'est encore démontrée. Une optimisation peut être retenue sans inventer une mesure. |
| Dossier de processus / validation | Le point porte sur la provenance, la méthode ou les preuves de l'audit. Ce n'est pas un bug de l'application. |
| Choix architectural | Une organisation est choisie pour faciliter une modification ou un test. Son nom ne prouve ni défaut initial ni bénéfice acquis. |

**Priorités proposées**, à distinguer des décisions de correction déjà acceptées :

- **P0 — préalable de validation :** établir la référence et l'isolation des essais avant de modifier l'application. Cette priorité ne désigne pas un exploit critique confirmé.
- **P1 — traiter en premier :** vérifier les frontières de confiance et les parcours qui peuvent compromettre les données, une décision ou la disponibilité. La preuve de l'impact et le contrat précèdent la correction.
- **P2 — correction ciblée :** résoudre un problème circonscrit, en regroupant les changements d'un même parcours pour limiter les régressions.
- **P3 — amélioration conditionnelle :** coût et simplicité déterminants ; aucun élargissement fonctionnel automatique.
- **Clos / conservé :** pas de correction prévue dans le périmètre actuel.

Les priorités ci-dessous sont une synthèse argumentée de l'agent, pas un nouvel engagement à tout implémenter. Les conséquences n'ont pas reçu de score de vulnérabilité et aucune probabilité d'exploitation n'est inventée. **Toutes les corrections applicatives restent non implémentées à ce stade du classement.**

## Dossiers de processus : ne pas les compter comme quatre bugs

| ID | Nature et problème initial | Priorité / décision | Preuve et limite |
| --- | --- | --- | --- |
| AUD-001 | Processus : attribuer les constats à la bonne version et préserver le travail local | Clos : fork, branche et SHA vérifiés | [Baseline](baseline.md), [preuve Git](evidence/source-baseline.md). Cette provenance ne valide pas les parcours. |
| AUD-002 | Processus : comprendre la règle et disposer d'une preuve avant une modification | Préalable continu : méthode retenue | [Journal](DECISION_LOG.md), playbook §5. Un assentiment ne prouve pas une compréhension indépendante ; aucun niveau de maîtrise n'est attribué ici. |
| AUD-011 | Validation : absence de référence applicative exécutée et risque d'altérer les données locales lors des essais | **P0** : données, base et stockage isolés retenus ; mesures désormais demandées | [Fiche](solutions-to-audit/AUD-011-validation-isolee.md), Makefile:36–46, seed:58–94. Lacune de preuve, pas démonstration que le démarrage échoue. Résultats de la campagne à consulter séparément. |
| AUD-012 | Processus : instructions des skills initialement indisponibles pour le workflow annoncé | Clos : disponibilité résolue, dossier historique conservé | [Baseline](baseline.md). Ne pas compter ce blocage ancien comme défaut actuel de l'application. |

## Enjeux majeurs potentiels : données, droits et parcours centraux

« Majeur » signifie ici que la conséquence possible touche une frontière sensible ou un parcours central. Cela ne signifie pas qu'un exploit, une panne généralisée ou une perte de données ont été constatés.

| ID | Nature / enjeu concret | Priorité justifiée | Décision actuelle | Preuve et ce qui reste à établir |
| --- | --- | --- | --- | --- |
| AUD-003 | Défaut de récupération/cohérence : insertion validée avant upload puis référence ; note incomplète, reçu orphelin ou doublon possibles | **P1** : concerne toute soumission interrompue et sa reprise | État `incomplete`, clé durable, reprise de la même note et identifiant stable ; `pending` après finalisation | [Fiche](solutions-to-audit/AUD-003-receipt-consistency.md). Panne d’upload HTTP reproduite : pending sans reçu. Reprise/idempotence cible non testées. |
| AUD-004 | Défaut de validation à une frontière SQL : le tri du client devient une expression SQL | **P1** : supprimer une entrée libre dans la structure de la requête | Options fixes, insensibles à la casse ; inconnue → 400 avant SQL | [Fiche](solutions-to-audit/AUD-004-sort-input.md). Tri invalide : HTTP 500 reproduit. Injection avancée non testée. |
| AUD-006 | Défaut de périmètre à deux frontières : reçu manager et choix du manager à affecter | **P1** : reçus et relations entre entreprises sont sensibles | Recherche du reçu dans le périmètre manager/entreprise ; contrôle API et contrainte DB même entreprise pour l'affectation | [Fiche](solutions-to-audit/AUD-006-manager-receipt-authorisation.md). HTTP 200 pour reçu non rattaché/interentreprises et affectation interentreprises reproduits. |
| AUD-007 | Défaut de transition : lecture `pending` puis écriture sans revérifier l'état à la mutation | **P1** : une décision enregistrée ne doit pas être écrasée par une décision concurrente | `UPDATE` conditionnel sur `pending`, autorisation conservée | [Fiche](solutions-to-audit/AUD-007-decision-concurrency.md). Écrasement reproduit via transactions SQL à lectures chevauchées ; pas course HTTP synchronisée. |
| AUD-008 | Défaut de bornage et de signalement OCR : fichier sans limite dédiée, moteur par appel, panne convertie en succès vide | **P1** : consommation de ressources et erreurs cachées sur une route de traitement | Pool borné sans file, traitement maximal de 40 s, refus si occupé ; panne distincte du succès sans champs | [Fiche](solutions-to-audit/AUD-008-ocr-resource-bounds.md). Image corrompue renvoyée HTTP 200 vide ; capacité, gros fichiers et 40 s non mesurés. |
| AUD-009 | Défaut de politique d'isolation : absence de condition entreprise dans les politiques RH ; finalisation sans contexte utilisateur dédié | **P1** : vérifier la protection DB avant d'affirmer une isolation B2B | RLS avec entreprise, compte appliquant les politiques, filtres API conservés ; finalisation légitime sous contexte et droits bornés | [Fiche](solutions-to-audit/AUD-009-database-company-isolation.md). Compte Docker reconstitué superuser/BYPASSRLS ; politiques RH et finalisation testées séparément avec compte limité. |
| AUD-010 | Risque de confiance dans les sessions : matériel de signature défini dans le code source | **P1 d'investigation**, changement reporté : enjeu d'identité sans exploit démontré | Clarification professeur requise ; aucune solution sélectionnée, génération ou rotation effectuée | [Fiche](solutions-to-audit/AUD-010-authentication-secret.md), auth.ts:8,11 ; [question préparée](questions-professeur.md). Valeur volontairement omise ; falsification de session non testée. Le report ne transforme pas le risque en limite définitivement acceptée. |
| AUD-013 | Défaut d'atomicité de l'inscription : entreprise et premier RH validés séparément | **P1** : une première inscription interrompue peut compromettre l'administration de l'entreprise | Une transaction sur la même connexion ; connexion automatique après commit | [Fiche](solutions-to-audit/AUD-013-signup-consistency.md), actions/auth.ts:44–69. Appels séparés observés ; entreprise sans RH et rôle au réessai restent à reproduire. |
| G10 | Défaut au regard de la règle retenue : autorisation basée sur un rôle de session potentiellement ancien | **P1** : les nouveaux accès doivent suivre les droits actuels | Session pour identité, relecture du rôle en DB à chaque nouvelle requête protégée | [Fiche](solutions-to-audit/G10-droits-role-actuel.md). Rôle rétrogradé DB avec session conservée : liste manager encore 200. |

Ces points peuvent être regroupés en chantiers lisibles : **accès/isolation** (AUD-006/009/G10), **cohérence des écritures** (AUD-003/007/013), **frontières d'entrée et de traitement** (AUD-004/008). Le secret reste un sujet reporté. La dépendance AUD-003/AUD-009 doit être traitée ensemble pour ne pas corriger l'isolation en empêchant une soumission légitime.

## Défauts ciblés et règles précisées pendant l'audit

Ces points sont utiles à corriger même s'ils ne nécessitent pas une refonte. Une faible complexité de correction n'annule pas leur impact ; une gravité locale n'autorise pas à les présenter comme de grandes vulnérabilités.

| ID | Nature / problème concret | Priorité justifiée | Décision actuelle | Preuve et limite |
| --- | --- | --- | --- | --- |
| AUD-005 | Défaut de frontière d'erreur : message brut et stack renvoyés au public | **P1**, correction ciblée transversale : informations internes inutilement exposées | Message utilisateur sûr ; code et diagnostic internes structurés ; champ `error` compatible | [Fiche](solutions-to-audit/AUD-005-public-errors.md). Stack publique reproduite sur date invalide et panne de stockage. |
| AUD-014 | Défaut de validation : un préfixe numérique peut être accepté à la place du montant complet | **P2** : intégrité d'une donnée saisie, correction serveur circonscrite | Valider toute la chaîne ; point ou virgule unique ; montant positif et arrondi DB actuel conservés | [Fiche](solutions-to-audit/AUD-014-validation-montant.md). 12abc accepté 201, virgule interprétée comme 1 ; espaces/bornes à préciser. |
| AUD-015 | Validation incomplète ; **règle supplémentaire choisie** pour le refus de dates futures | **P2**, avec garde de compatibilité : contrôler format/jour réel sans confondre correction et nouveau refus métier | `yyyy-mm-dd`, jour existant, pas de futur ; aujourd'hui selon horloge serveur Europe/Paris | [Fiche](solutions-to-audit/AUD-015-validation-date.md). Date inexistante 500, futur 201 ; futur reste règle choisie pendant audit. |
| AUD-016 | Défaut de récupération UI après rejet réseau : indicateurs actifs non libérés | **P2** : actions ou chargements peuvent rester bloqués | Gestion d'erreur, `finally`, saisie conservée ; aucun retry automatique d'écriture incertaine | [Fiche](solutions-to-audit/AUD-016-erreurs-reseau-ui.md). **18 exécutions isolées** : neuf succès et neuf pannes simulées ; les neuf pannes gardent l'indicateur actif. Pas de React monté ni navigateur. |
| AUD-017 | Défaut d'affichage d'une date calendaire : conversion en instant puis formatage local | **P2** : jour affiché erroné dans certains fuseaux | Préserver le jour et le format français, sans déplacer les données | [Fiche](solutions-to-audit/AUD-017-affichage-date.md), page:22,285 ; panneaux manager:19,120 et RH:30,228. **Trois fuseaux isolés** : 14 octobre à Paris/UTC, 13 à Los Angeles. Pas de navigateur. |
| AUD-018 | Défaut de reprise du seed : note existante ignorée avant vérification de son reçu | **P2** : fiabilité du démarrage et de la démonstration après panne | Récupérer le reçu sur la même note ; réutiliser l'objet vérifié ; ne rien refaire si complet | [Fiche](solutions-to-audit/AUD-018-reprise-seed.md). Seed après panne sort avec 0 mais conserve reçu vide ; reprise cible non testée. |
| AUD-020 | Défaut de contrat : corps invalide ou champ manquant devient un retrait de manager | **P2**, à associer à AUD-006 : une erreur d'entrée ne doit pas modifier l'affectation | Erreurs différenciées, 400 avant mutation ; retrait explicitement `null` conservé | [Fiche](solutions-to-audit/AUD-020-validation-affectation.md). JSON cassé produit 200 et manager_id=null ; mutation reproduite. |
| AUD-021 | Défaut au regard de la règle maintenant choisie : auto-affectation bloquée, cycles indirects non contrôlés | **P2** : cohérence de la hiérarchie, contrôle à rendre atomique | Interdire toute boucle ; conserver chaînes valides et retrait explicite | [Fiche](solutions-to-audit/AUD-021-boucles-managers.md). Boucle à deux acceptée HTTP 200 ; boucle longue et concurrence non testées. |
| G14 | Défaut de contrôle à une frontière de dépôt : type déclaré accepté sans détection du contenu | **P2** : empêcher un faux format accepté sur simple déclaration | Détection par les octets côté serveur avant création/stockage ; formats et taille conservés | [Fiche](solutions-to-audit/G14-controle-recus.md). Texte déclaré PNG accepté 201 ; détection cible non testée. |

## Convention conservée et optimisation conditionnelle

| ID | Classement | Priorité / décision | Pourquoi et frontière |
| --- | --- | --- | --- |
| AUD-019 | **Convention pédagogique conservée**, avec limite de confiance | **Conservé** : aucune correction d'inscription sélectionnée | [Fiche](solutions-to-audit/AUD-019-inscription-domaine.md), actions/auth.ts:23–29,41–68. Le domaine saisi détermine l'entreprise et le premier RH sans preuve de possession. Maia conserve la simplification ; ce n'est pas une garantie d'appartenance pour un vrai SaaS. Ne pas compter ce point parmi les défauts à corriger. |
| AUD-022 | **Hypothèse de performance**, amélioration conditionnelle | **P3** : optimiser si et seulement si simple ; index comme piste, sans pagination choisie | [Fiche](solutions-to-audit/AUD-022-optimisation-simple-listes.md). 20 mesures HTTP, 10 007 notes ; index réduit SQL sur un plan, aucun gain HTTP démontré. |

## Choix architecturaux et limites sans nouvel ID de défaut

Ne pas inventer des IDs supplémentaires pour chacun des choix suivants. Ils sont enregistrés dans [le journal](DECISION_LOG.md), [la revue structurelle](structure-review.md) et [les points de contrat](next-issues.md).

| Sujet | Nature / statut réel | Conséquence pour l'implémentation |
| --- | --- | --- |
| Hexagonal simple et progressif | **Choix architectural accepté**, [ADR-0002](../adr/0002-hexagonal-soumission.md). Le domaine et les adaptateurs actuels ne sont pas raccordés aux routes : observation structurelle, pas preuve que l'application est inutilisable. | Commencer par la soumission pour rendre orchestration/reprise testables. Conserver monolithe, Next.js/PG/S3, éviter framework d'injection et couches sans rôle. Priorité de support au chantier AUD-003, pas réécriture générale. Aucun bénéfice après refactor encore mesuré. |
| Liens S3 délivrés pour cinq minutes | **Limite documentée**, conservation recommandée ; aucun chantier de révocation immédiate sélectionné | Nouvelle demande contrôlée selon les droits actuels, sans promettre la révocation d'un lien déjà émis. Durée/expiration à tester ; ne pas transformer la recommandation en acceptation explicite d'une exigence de sécurité. |
| Permissions manager et RH distinctes | **Compromis structurel conservé** : centralisation automatique non sélectionnée | La duplication ne prouve pas un mauvais comportement. Corriger AUD-006/007 ; extraire une abstraction seulement si elle masque une responsabilité utile et respecte les différences de périmètre. |
| File OCR, distribution, multi-région, notifications | **Élargissements non sélectionnés** ; FIFO et file durable explicitement écartées | Ne pas ajouter ces dispositifs pour illustrer le cours. CAP, régions et volumes futurs restent des scénarios à expliquer, pas des besoins d'infrastructure acquis. |
| REST, contrats et standardisation des appels API | **Revue réalisée**, pas de migration REST recommandée | AUD-005/020 couvrent déjà des erreurs/entrées ; AX-01/05 couvrent contrats/diagnostic. Conserver méthodes, chemins et consommateurs tant qu'aucun changement concret n'est sélectionné. « REST » seul ne définit ni format d'erreur ni validation. Voir [la revue API](api-standardisation-review.md) : contrats/erreurs à compléter ; helper éventuel non sélectionné. |

## Ce qui est établi, et ce qui manque pour conclure

**OBSERVATIONS** : parcours et conditions des sources, commentaires, direction des imports. L'inventaire structurel compte 40 fichiers TS/TSX, 91 imports et 12 des 14 fichiers de routes important directement la DB ; ces nombres ne mesurent pas la qualité ou la couverture fonctionnelle.

**MESURES ISOLÉES disponibles avant la campagne demandée** : 18 exécutions de handlers extraits, trois observations de fuseau et huit parsing de corps d'affectation. Voir [la revue des commentaires](comment-review.md), [les résultats UI/date](evidence/comment-audit/mesures.json) et [les résultats du parsing](evidence/manager-body-check.json). Ce sont des preuves ciblées, pas des E2E, des essais DB/S3/OCR ou un taux de réussite applicatif.

**PROPOSITIONS / DÉCISIONS** : des directions sont acceptées et le secret est reporté ; elles ne prouvent pas la correction. Les détails de contrat, migrations et contrôle de concurrence restent à préciser. AUD-015 et AUD-003 exigent particulièrement une vérification de compatibilité fonctionnelle.

La campagne de mesures autorisée par Maia se déroule en parallèle de cette compilation. **Ses résultats doivent être ajoutés aux rapports de preuve par l'agent qui les exécute, puis le classement peut être révisé selon ces résultats** : [baseline](baseline.md), [couverture](coverage.md), [protocole runtime](evidence/runtime-protocol.md). Ce fichier ne lui attribue aucun succès, échec ou gain anticipé.

La discussion des issues recensées est achevée ; l'audit se clôture par une synthèse de preuves et limites, pas par le nombre de fiches. Des blocages d'environnement peuvent être documentés sans prétendre avoir exécuté les contrôles empêchés. Les corrections et leurs comparaisons avant/après constituent la phase suivante ; un audit terminé ne signifie pas une application déjà corrigée.

## Actualisation par la campagne exécutée

Les colonnes de preuve sont actualisées avec la [campagne](mesures-et-preuves.md) : 47 vérifications de scénarios, 26 conformes, 21 écarts ; aucune correction implémentée. Les contrôles navigateur et les angles morts sont explicités dans le rapport.

### AUD-023 — Signal de dépendances nouvellement enregistré

Nature : version signalée par scanner, applicabilité à qualifier ; pas exploit prouvé. Priorité proposée P1 pour qualifier les chemins de production, P2 pour corrections ciblées de l’outillage. npm audit : 8 packages, 7 high/1 critical ; plusieurs lignes liées au même avis. [Fiche](solutions-to-audit/AUD-023-dependances.md). Aucune mise à jour sélectionnée ; ne pas appliquer automatiquement la proposition de retour majeur ESLint. L’ImageResponse concernée par l’avis critique n’a pas de consommateur identifié dans src. Ce point porte le registre à 25 références, dont quatre de processus.
