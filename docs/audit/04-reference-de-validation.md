# 4 — Référence de validation et preuves attendues

15 octobre 2026. Source originale : `265924bc7274047989e708ab635c2854d376230f`. Référence de vérification des contrats 1, permissions 2 et responsabilités 3. Ce document est un protocole d'acceptation ; écrire un scénario ne signifie pas l'avoir exécuté.

## Preuves déjà acquises

Installation propre, lint, TypeScript et build passent sur copie isolée en Node 24. La campagne comporte 47 assertions de scénarios, 26 conformes et 21 écarts sur le code original, plus 3 contrôles de fixtures. Ce n'est pas une suite de 47 E2E. Vingt mesures HTTP de listes et trois appels OCR sont disponibles ; l'index expérimental n'a pas démontré de gain HTTP.

[Rapport](mesures-et-preuves.md), [résultats bruts](evidence/runtime-20261014/campaign.json), [pannes](evidence/runtime-20261014/storage-failure.json), [résumé des checks](evidence/runtime-20261014/summary.json). Les écarts caractérisent les défauts/règles choisies ; ne pas affaiblir les futures assertions pour les rendre verts.

## Environnement de référence

Base et stockage séparés, deux entreprises, rôles employee/manager/hr_admin dans chacune, managers racines et subordonnés, employés rattachés et non rattachés. Notes pending/approved/rejected, puis incomplete pour la cible. Reçus valides PNG/JPEG/WebP/PDF, faux type, fichier corrompu et tailles de frontière. Employer des domaines fictifs et aucun secret réel. [Protocole isolé](evidence/runtime-protocol.md).

Ne jamais seed, nettoyer, migrer ou arrêter les services utilisateur pour ces essais. Enregistrer SHA, versions, commandes, compte DB, IDs de fixtures fictives, résultats et limites. Ne pas inclure cookie, mot de passe réel, secret d'authentification ou URL signée dans les preuves.

## Scénarios d'acceptation par chantier

| Référence | Niveau nécessaire | Scénarios et assertions |
| --- | --- | --- |
| AUD-003 | Module + HTTP/SQL/S3 + navigateur | Création complète ; panne upload ; objet présent mais finalisation échouée ; réponse perdue ; reprise même note ; rechargement ; deux demandes légitimes identiques ; même clé/contenu différent 409 ; tentatives concurrentes ; aucun doublon ; décision existante conservée ; état incomplete exclu des décisions et du total soumis |
| AUD-004 | HTTP + SQL | Défaut conservé ; trois options et variantes de casse ; valeur inconnue/expression libre 400 avant SQL ; propriétaire conservé ; ordres corrects. Les égalités gardent les mêmes résultats, sans promettre l'ordre d'égalité que le source ne définit pas. |
| AUD-005 | HTTP + lecture des logs + UI | Exceptions contrôlées sans stack/message DB public ; champ error string ; codes internes utiles ; aucun secret ; réponse illisible et panne réseau avec message de repli |
| AUD-006/G10 | HTTP + SQL | Matrice 2 pour rôles/entreprises/relations ; manager sans relation ou de B refusé ; rôle changé avec session conservée ; aucune auto-approbation ; reçu déjà décidé toujours accessible dans le périmètre autorisé |
| AUD-007 | PostgreSQL réel + HTTP | Deux décisions opposées chevauchées : une seule change l'état ; répétition identique 409 ; perdant sans écrasement ; note hors périmètre 404 avant divulgation d'état ; manager et RH |
| AUD-008 | OCR réel + mesures + UI | Succès utile sur reçu lisible ; succès sans champs ; image corrompue ; format interdit ; borne de taille ; moteur libre/occupé ; traitement arrêté au plus tard au délai choisi avec marge instrumentée ; moteur remplacé/recyclé ; pool réutilisé ; absence de file |
| AUD-009 | PostgreSQL réel sous compte applicatif | Lire privilèges et RLS effectifs ; contrôles positifs et négatifs A/B ; finalisation propriétaire autorisée mais pas modification libre de montant/propriétaire/statut ; aucune politique parallèle permissive ; contexte de requête absent ne réutilise pas un ancien utilisateur |
| AUD-013/019 | Action serveur + DB + navigateur | Entreprise fraîche et premier RH ; échec du compte annule les écritures de cette tentative ; réessai ; entreprise existante et inscription employé ; même domaine simultané ; email déjà pris ; panne de connexion après commit conserve le compte ; convention sans nouvelle invitation |
| AUD-014 | Validation + HTTP/DB | Point/virgule équivalents ; suffixes et séparateurs répétés/mélangés refusés ; bordures de grammaire du contrat 1 ; précision supplémentaire et arrondi PostgreSQL conservés ; borne numérique ; valeur très petite ; absence de nouvel arrondi JS |
| AUD-015/017 | Validation + navigateur | Dates valides/impossibles/bissextiles ; absent/vide ; aujourd'hui/demain et minuit Europe/Paris ; affichage du même jour à Paris/UTC/Los Angeles ; format français conservé |
| AUD-016 | Navigateur | Tous les 12 appels fetch recensés : succès, HTTP d'erreur, rejet réseau, réponse illisible ; neuf états actifs libérés ; saisie conservée après échec ; aucun retry automatique d'écriture ; lecture de reçu en erreur affichée |
| AUD-018 | Script réel + SQL/S3 isolés | Premier lancement et second sans doublon ; panne puis réparation même note ; objet présent/référence absente ; inverse ; décision existante conservée ; commande réussie signifie données complètes |
| AUD-020/021 | HTTP + SQL/concurrence | JSON illisible, corps non objet, champ absent/invalide : erreurs distinctes et aucune mutation ; null explicite valide ; manager valide ; auto-affectation, boucle à deux, boucle longue et deux affectations simultanées refusées sans casser les liens valides |
| G14 | HTTP + stockage | Quatre formats de dépôt valides toujours acceptés ; contenu déguisé ou non reconnu refusé avant création/stockage ; taille limite ; type déclaré incohérent ; aucun OCR PDF ajouté |
| Hexagonal | Imports + tests par interface + intégration | Module soumission sans Next/pg/AWS ; adaptateurs réels et de test au même contrat ; orchestration unique ; mêmes réponses publiques ; transactions/RLS validées réellement |
| AUD-022 conditionnel | Mesure comparative | Même données/version/requêtes ; SQL, HTTP, taille de réponse et coût d'écriture ; ne pas appeler un gain SQL isolé un gain utilisateur ; abandonner la modification si le bénéfice ne justifie pas son coût |
| AUD-023 conditionnel | Avis + npm ci/checks | Applicabilité par avis ; version cohérente choisie ; installation/lint/types/build et parcours après mise à jour ; publier les alertes restantes et pourquoi |

## Parcours navigateur de référence à construire

| Parcours | Résultat protégé |
| --- | --- |
| Connexion correcte/incorrecte puis déconnexion | Accès accordé/refusé, session terminée |
| Employé soumet un reçu valide puis ouvre sa liste et son reçu | Montant/date corrects, une note, reçu réellement lisible |
| Échec d'upload puis reprise explicite du formulaire existant | Saisie conservée, même note, succès final, aucune décision possible trop tôt |
| Manager consulte, ouvre et approuve/rejette dans son périmètre | Décision persistée, liste actualisée, refus hors périmètre |
| RH consulte managers racines et affecte/retire un manager | Périmètre A/B respecté, affectation valide, aucune mutation après requête invalide |
| OCR suggère, échoue et refuse si occupé | Champs manuels utilisables, message sûr, aucun blocage permanent |
| Date affichée selon plusieurs fuseaux | Jour calendaire identique et rendu français |

Ce tableau est une suite à implémenter, pas un résultat. Les tests du professeur ne sont pas fournis. Les assertions fournies ultérieurement doivent être conservées ; une divergence est examinée comme problème de contrat, jamais masquée par skip ou changement de test.

## Protocole de performance OCR

Avant de modifier la capacité de départ d'un moteur, mesurer sur reçus fixes, tailles proches de la borne et concurrence 1 puis 2 puis 4. Distinguer initialisation, reconnaissance, arrêt et durée HTTP totale. Enregistrer nombre d'appels, réussites/refus/erreurs, durées individuelles, médiane/p95, CPU et pic RAM du processus/conteneur. Prévoir au moins 20 appels par cas pour une première indication ; conserver les mesures brutes et ne pas qualifier ce faible échantillon de capacité de production garantie.

Tester séparément un moteur volontairement bloqué pour vérifier l'arrêt à 40 s ; une promesse rejetée sans arrêt réel échoue au critère. Une petite image sans texte ne remplace pas un reçu lisible. Pour un gain avant/après, mêmes versions, machine et fixtures ; aucun pourcentage annoncé sans comparaison correspondante.

## Règle d'intégration

Pour chaque lot : contrôles pertinents ci-dessus, lint/types/build et parcours de référence touchés. Rapport : exécutés/réussis/échoués/ignorés, attendus, résultats réels et preuves. Aucun test attendu ne peut être silencieusement absent. Une correction ou un lot conditionnel n'est pas terminé par sa seule documentation.

Pas de nouvelles mesures exécutées pendant la rédaction de ce fichier. Les preuves navigateur, la capacité OCR et plusieurs frontières restent des réserves connues de l'audit, attribuées aux lots au fichier 5 ; elles ne sont pas transformées en succès pour clôturer le dossier documentaire.
