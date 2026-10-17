# 5 — Lots, critères d'acceptation et clôture du dossier

15 octobre 2026. Source originale : `265924bc7274047989e708ab635c2854d376230f`. Audit et dossier de passation consolidés à la demande de Maia, sans plan de migration ni de retour arrière. Aucun changement applicatif réalisé par cette clôture.

## Référence des équipes

1. [Contrats](01-contrats-implementation.md) : entrées, sorties, erreurs et compléments techniques.
2. [Permissions et transitions](02-permissions-et-transitions.md) : règles communes API/DB/tests.
3. [Périmètre et dépendances](03-perimetre-et-dependances.md) : responsabilités et coordination, en remplacement du plan écarté.
4. [Validation](04-reference-de-validation.md) : contrôles exécutés et critères futurs distincts.
5. Ce fichier : lots, exclusions, réserves et définition de terminé.

Les fiches de [solutions](README.md) restent la source du problème original, de sa localisation et de son explication. Les présents fichiers précisent leur réalisation. Si une précision technique proposée ici contredit une décision explicite de Maia, la décision prévaut et le conflit doit être corrigé dans ces références avant intégration, pas tranché différemment par deux équipes.

## Lots de réalisation

Chaque lot a un responsable à attribuer par l'équipe. Les fichiers cités sont les zones de responsabilité ; les nouveaux fichiers concrets dépendent du découpage simple retenu. Les numéros n'imposent pas d'attendre un lot sans dépendance pour préparer ses tests.

| Lot / priorité | IDs et zones principales | Dépendances | Critères de fin |
| --- | --- | --- | --- |
| A — Référence et contrats, préalable | Les cinq fichiers ; tests à ajouter dans le périmètre choisi | Aucun développement applicatif préalable | Transformer les cas du fichier 4 touchés par le prochain lot en tests ; caractériser les comportements publics ; conserver les assertions ; enregistrer les divergences externes |
| B — Erreurs sûres et récupération UI, P1/P2 | AUD-005/016 ; errors.ts, expenses/page.tsx, PendingApprovalsPanel, AdminConsole | Catalogue du fichier 1 | Aucune stack publique, logs utiles ; 12 fetch traités ; états libérés et saisie conservée ; aucun retry automatique d'écriture |
| C — Tri, montant, date et contenu, P1/P2 | AUD-004/014/015/017/G14 ; expense-notes/route.ts, formatage des trois écrans, contrôle de fichier | B pour erreurs ; contrats d'entrée du fichier 1 | Tri fixe, suffixes refusés, point/virgule équivalents, arrondi DB préservé, date réelle/non future, jour affiché stable, faux format refusé ; entrées légitimes conservées |
| D — Identité et hiérarchie, P1/P2 | G10, AUD-006/020/021 ; gardes protégées, reçu manager, affectation RH, contraintes DB | B ; matrice 2 | Rôle actuel ; reçus bornés ; affectation même entreprise ; invalidité sans mutation ; null valide ; cycles directs/indirects/concurrents interdits |
| E — Soumission et isolation, P1 | AUD-003/009, ADR-0002 ; route soumission, module/adaptateurs, DB/RLS et UI de reprise | B/D, contrats et états communs | Une demande → une note ; incomplet récupérable ; reçu vérifié ; finalisation autorisée sous RLS ; pas d'auto-approbation ; décision conservée ; module sans dépendances concrètes ; tests HTTP/DB/S3 |
| F — Décision atomique, P1 | AUD-007 ; quatre routes manager/RH approve/reject | Matrice 2, gardes D ; compatible avec états E | Une seule transition pending gagnante ; 404 hors périmètre ; 409 sur état non pending/répétition ; aucune décision écrasée |
| G — Inscription et seed, P1/P2 | AUD-013/018 ; actions/auth.ts, scripts/seed.mjs | Contrat inscription ; seed compatible avec réalisation E | Entreprise/RH atomiques ; concurrence et connexion après commit ; seed reprend même note et conserve décisions ; commandes inchangées |
| H — OCR borné, P1 | AUD-008 ; ocr.ts, receipt-suggestion/route.ts, consommation UI | B ; protocole OCR du fichier 4 | Pool sans file, borne d'entrée, refus si occupé, 40 s réellement interrompus, erreurs distinctes, ressource récupérée ; capacité mesurée et limites publiées |

Les priorités sont des recommandations d'ordre de travail issues de l'audit, pas des scores d'exploitation. E et F peuvent avoir des commits distincts mais doivent partager la même règle d'état et de périmètre. Le seed et les droits DB doivent être testés avec le code retenu ; aucun plan de déploiement détaillé n'est produit.

## Sujets conservés, conditionnels et reportés

| Sujet | Action autorisée par le dossier | Ce qui n'est pas automatiquement demandé |
| --- | --- | --- |
| AUD-019 | Préserver la convention d'inscription par domaine et sa limite documentée | Vérification email, invitation ou nouvelle preuve de possession |
| AUD-022 | Rechercher une optimisation simple justifiée par mesures | Pagination, total séparé, cache ou infrastructure ajoutée |
| AUD-023 | Qualifier les avis et préparer une correction compatible | Appliquer npm audit fix/force ou le downgrade suggéré par le scanner |
| AUD-010 | Garder la question au professeur et le sujet reporté | Rotation/génération/changement de secret non choisi |
| REST / helper client | Préserver HTTP existant ; corriger contrats et erreurs déjà retenus | Renommage des routes, enveloppe universelle, bibliothèque supplémentaire |

## Réserves explicites à la clôture

| Réserve | Traitement prévu |
| --- | --- |
| Tests du professeur absents | Ne pas prétendre les avoir passés. Vérifier dès disponibilité, notamment tri, nouveaux refus de date/montant/fichier, champ requestId propriétaire et reprise 200/201. |
| Formats OCR formellement acceptés non documentés par le professeur | Conserver la liste source sans expansion ; confronter à l'exigence fournie avant toute modification de périmètre. |
| Preuves navigateur et référence E2E non exécutées | À produire dans A puis dans les lots concernés ; elles restent non acquises dans cet audit. |
| Charge OCR, arrêt effectif et paramètres opérationnels de réservation | À mesurer/tester dans H/E ; un moteur est un défaut de départ, pas une capacité de production garantie. Une reprise concurrente ne doit jamais expirer un droit d'écriture actif sans protection. |
| Compte DB de l'environnement utilisateur non inspecté | Vérifier le compte applicatif réellement retenu dans E ; seules la configuration Docker reconstituée et les politiques sous rôle limité ont été mesurées. |
| Bornes du périmètre | Pas de révocation instantanée des liens déjà délivrés, de nouveau circuit de validation RH, de nettoyage automatique des abandons ni de traitement global des anciennes incohérences. |

Les réserves n'annulent pas les défauts reproduits ou les décisions ; elles empêchent de présenter la cible comme prouvée avant réalisation. Aucun choix métier supplémentaire ne doit être ajouté en dehors de ce périmètre sans décision.

## Définition de terminé par lot

Appliquer les [instructions d'implémentation](../development/INSTRUCTIONS_IMPLEMENTATION.md) : spec ciblée, conservation exacte des fiches AUD, ajout IMPLEMENTATION avec changements/emplacements/nouveau fonctionnement et résultats réels. Les anciennes entrées sont conservées ; le contrôle des préfixes fait partie de la revue.

Un lot est terminé lorsque son contrat est respecté, les contrôles du fichier 4 pertinents sont réellement exécutés et réussis, lint/types/build passent, les parcours légitimes restent compatibles et les preuves sont liées au SHA livré. Relire ensemble le code, les réponses et l'état persistant. Ne pas supprimer ou affaiblir un test pour obtenir un passage. Mettre à jour la fiche d'issue avec le résultat réel ; accepté, implémenté et vérifié sont trois états distincts.

Le dossier vise à permettre une explication du code original et de la correction. Il ne certifie pas la maîtrise individuelle d'un membre de l'équipe ; elle se démontre par explication et application, sans la déduire d'un accord ou d'un document lu.

## État de clôture

**Dossier d'audit et de passation documentaire finalisé sur le périmètre explicite ci-dessus.** Les constats, preuves acquises, décisions, contrats, dépendances et critères sont consultables. Ce n'est ni un audit runtime exhaustif ni une validation des corrections futures. Les travaux restants sont désormais des tâches de réalisation/validation identifiées ou des réserves externes nommées, pas une nouvelle série d'issues indéfinie.

À la demande de Maia, le plan de migration et de retour arrière est retiré des livrables requis pour cette clôture. Les consignes historiques qui le demandaient ne prévalent pas sur cette exclusion. Aucun fichier de plan correspondant n'est créé ; préserver les données et les décisions existantes reste une contrainte.
