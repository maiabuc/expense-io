# 1 — Contrats de référence pour l'implémentation

15 octobre 2026. Source originale : `265924bc7274047989e708ab635c2854d376230f`. Ce document précise les solutions retenues ; il ne décrit pas du code déjà livré. Les paramètres techniques complétés ici sont des choix de conception de l'agent pour rendre les travaux exécutables, pas des réponses attribuées à Maia. [Sources des routes](api-inventory.md), [solutions](README.md), [preuves](mesures-et-preuves.md).

## Invariants publics

Conserver méthodes, chemins, formulaires JSON/multipart, tableaux de liste et objets de succès existants. Une note conserve `id`, `userId`, `amount` numérique JSON, `expenseDate` date seule yyyy-mm-dd, `description`, `receiptKey`, `status`, `createdAt` instant ISO. Un utilisateur d'annuaire conserve `id`, `name`, `email`, `role`, `managerId`. Un reçu reste `{ url }`. Une erreur HTTP reste `{ error: string }`, sans stack ni code technique public. Aucun ajout d'enveloppe data, changement REST ou nouvelle bibliothèque cliente obligatoire.

L'identité vient de la session, le rôle et l'entreprise actuels de la DB. Ne jamais accepter ces droits dans le corps client. Le tableau de permissions du [fichier 2](02-permissions-et-transitions.md) fait référence pour toutes les routes.

## Routes, succès et refus

| Route existante | Succès conservé / précisé | Refus et portée |
| --- | --- | --- |
| GET /api/expense-notes | 200, tableau des notes du propriétaire ; défaut created_at DESC | Session absente 401 ; tri inconnu 400 |
| POST /api/expense-notes | 201, note finalisée pending ; reprise selon contrat ci-dessous | Entrée/fichier invalide 400 ; conflit de demande 409 ; erreur inattendue 500 |
| POST /api/expense-notes/receipt-suggestion | 200, objet avec amount/expenseDate facultatifs ; {} si analyse réussie sans champs | Entrée/format/taille refusés 400 ; pool occupé 503 ; traitement dépassé 504 ; panne moteur 500 |
| GET /api/expense-notes/[id]/receipt-url | 200, URL temporaire d'un reçu stocké appartenant au demandeur | 401 sans session ; 404 pour note hors périmètre/absente ou reçu indisponible |
| GET /api/manager/expense-notes | 200, notes pending des collaborateurs directs de la même entreprise, ordre créé ASC | Garde manager existante 401 ; identité et rôle actuels |
| POST /api/manager/expense-notes/[id]/approve ou reject | 200, note avec décision atomiquement enregistrée | Garde 401 ; 404 hors périmètre/absente ; 409 si état non pending |
| GET /api/manager/expense-notes/[id]/receipt-url | 200 pour un reçu de collaborateur direct de la même entreprise | Garde 401 ; 404 hors périmètre/absent/indisponible ; pas de nouveau refus des notes déjà décidées |
| GET /api/hr/expense-notes | 200, notes pending des managers racines de la même entreprise, ordre créé ASC | Garde RH existante 403 |
| POST /api/hr/expense-notes/[id]/approve ou reject | 200, note avec décision atomiquement enregistrée | Garde 403 ; 404 hors périmètre/absente ; 409 si état non pending |
| GET /api/hr/expense-notes/[id]/receipt-url | 200, reçu d'un manager racine de la même entreprise | Garde 403 ; 404 hors périmètre/absent/indisponible |
| GET /api/hr/users | 200, employés/managers de l'entreprise, champs et ordre par nom conservés | Garde RH 403 ; aucun annuaire interentreprises |
| PUT /api/hr/users/[id]/manager | 200, utilisateur avec managerId sauvegardé | Garde RH 403 ; corps invalide 400 ; cible hors entreprise/absente 404 ; manager interdit ou cycle 409 |

Ces statuts complètent le contrat technique dans la continuité des réponses existantes. Ils ne sont pas une harmonisation générale 401/403 : cette réécriture n'a pas été sélectionnée. Les tests du professeur restent à confronter aux nouveaux refus et ajouts avant intégration. Les routes Auth.js restent gérées par Auth.js ; aucune réimplémentation manuelle du protocole.

## Validation d'une note

| Champ | Contrat cible |
| --- | --- |
| amount | Chaîne décimale complète, valeur strictement positive avant arrondi DB ; point ou virgule au maximum une fois ; pas de suffixe, séparateurs mélangés, NaN ou Infinity. Espaces extérieurs retirés pour préserver la saisie ordinaire. Pour limiter les ruptures avec parseFloat, conserver signe + facultatif et formes .5/1. ; accepter leurs équivalents avec virgule. Ne pas accepter la notation exponentielle dans le format décimal choisi. |
| Précision | Transmettre une représentation décimale exacte à PostgreSQL numeric(10,2), sans nouvel arrondi JavaScript ni rejet des décimales supplémentaires. Tester les bornes de ce type après son arrondi ; dépassement → 400 contrôlé. Ne pas ajouter un second contrôle positif après arrondi qui changerait silencieusement les valeurs très petites actuellement admises. |
| expenseDate | yyyy-mm-dd exact, date réelle et pas après aujourd'hui selon Europe/Paris. Conserver une date calendaire ; pas de conversion en heure locale du lecteur. |
| description | Chaîne, non vide après trim ; conserver son contenu stocké conformément à l'existant. |
| receipt | Fichier, au plus 10 MiB, PDF/PNG/JPEG/WebP ; format détecté par octets, cohérent avec le type annoncé autorisé ; refus avant création/stockage si invalide. L'extension n'est pas une preuve de contenu. |

Les formes décimales de bord ci-dessus sont des compléments techniques à caractériser en tests. L'acceptation de la virgule, le refus de suffixes et le refus du futur sont des décisions explicites ; leur compatibilité pédagogique n'est pas inventée. La validation serveur est obligatoire ; le contrôle HTML actuel n'est pas remplacé pour imposer une refonte UI.

## AUD-003 — Demande stable et reprise de soumission

**Identifiant :** le client standard crée un UUID avant l'envoi et le transmet dans l'en-tête optionnel `Idempotency-Key`. Même tentative → même clé ; nouvelle dépense → nouvelle clé, même avec contenu identique. Le serveur lie durablement clé, utilisateur et note par unicité. La clé seule ne donne aucun droit.

**Compatibilité :** un ancien client sans en-tête conserve le POST actuel et le succès 201. Le serveur lui crée une clé interne ; il ne peut pas garantir la déduplication de deux POST indépendants sans identifiant commun. Ne pas présenter cette limite comme résolue. Le client standard doit utiliser la clé pour bénéficier de la reprise.

**Contenu :** comparer montant décimal normalisé avant arrondi, date, description et empreinte du reçu. Même clé et contenu incompatible → 409, sans modification. La comparaison monétaire ne fusionne pas deux montants différents uniquement parce qu'ils s'arrondissent à la même valeur. L'empreinte du reçu est technique et reste interne.

**Traitement :** réserver/créer incomplete avec clé de stockage prévue ; vérifier ou envoyer le reçu ; finaliser receiptKey et pending ensemble sous contexte utilisateur. Réservation/finalisation : transactions DB courtes. Aucun upload avec transaction DB maintenue ouverte. Un échec d'upload/finalisation conserve incomplete, renvoie une erreur sûre et permet la reprise. Un résultat incertain impose une relecture avant toute répétition d'effet.

**Concurrence :** une seule exécution active par demande. Une tentative concurrente reçoit 409 avec message de traitement déjà en cours, sans nouvel upload ; le client peut réessayer explicitement. La protection est partagée en DB, pas un verrou JavaScript local. Choix technique : réservation de traitement bornée avec jeton vérifié lors de la finalisation ; pas de vol de réservation silencieux tant qu'un ancien upload peut encore écrire. Après arrêt du processus, vérifier objet et état avant réattribution. Durées opérationnelles à borner et tester dans le lot de soumission ; aucun délai arbitraire n'est annoncé comme sûr.

**Réponse répétée :** pour une demande déjà finalisée, renvoyer 200 avec la note existante, y compris sa décision actuelle ; ne jamais la remettre pending. Première finalisation → 201. L'UI accepte les deux succès. Pour une demande incomplete, vérifier le reçu existant ; le réutiliser si valide, sinon demander le fichier. Si un fichier est fourni, comparer son empreinte avant toute réutilisation ou écriture.

**Reprise après rechargement :** conserver côté navigateur la clé technique dans un stockage de session associé au compte, sans fichier ou secret. Ajouter `requestId` uniquement aux notes incomplete du GET propriétaire, pour retrouver la clé même si ce stockage est perdu. Cet ajout est interne au propriétaire et n'est pas une permission ; vérifier sa compatibilité avec les assertions externes avant intégration. Un réessai garde tous les champs multipart usuels ; receipt peut manquer uniquement si l'objet déjà stocké a été vérifié. Sans fichier exploitable, 400 avec demande de fournir à nouveau le reçu.

**UI minimale :** afficher incomplete en français « incomplète », en réutilisant les styles existants ; la ligne conserve sa place. À l'emplacement de l'action de reçu d'une note incomplete, proposer « Reprendre » qui recharge le formulaire existant ; ne pas ajouter de nouvel écran. Le total métier reste la somme des notes soumises pending/approved/rejected ; les tentatives incomplete sont exclues jusqu'à finalisation. Ces adaptations sont des conséquences de la reprise acceptée, pas une refonte graphique.

Ne pas effacer une demande historique pour expirer une clé dans cette première version. Aucun nettoyage automatique des abandons retenu. La persistance du lien demande/note est indispensable, même après perte du stockage de session client.

## Affectation et décision

PUT manager exige un objet JSON avec champ managerId présent. Null retire l'affectation ; un UUID doit désigner un manager actuel de la même entreprise. Refuser JSON illisible, corps non objet, champ absent et valeur invalide avec diagnostics distincts, sans mutation. Contrôler la chaîne des managers et l'écriture dans une même transaction ; sérialiser les affectations d'une entreprise via sa ligne companies existante. Tous les chemins applicatifs d'affectation doivent respecter cette règle ; une FK ne contrôle pas les cycles.

Pour approve/reject, exiger pending et le périmètre au moment de l'UPDATE. Une ligne modifiée → succès. Si zéro ligne : vérifier d'abord l'appartenance au périmètre autorisé, puis distinguer 404 et 409 ; ne pas révéler l'état d'une note interdite. Même décision répétée → 409 comme le parcours séquentiel actuel ; aucune répétition ne modifie la première décision.

## Catalogue minimal des erreurs

Les codes ci-dessous sont internes, jamais requis dans la réponse publique. Logs structurés : code, opération, statut et diagnostic sûr ; aucune session, secret, URL signée ou contenu de reçu. Conserver les erreurs API anglaises standard déjà présentes. Les nouveaux messages sont français.

| Code interne | HTTP | Message public / cas |
| --- | --- | --- |
| REQUETE_JSON_INVALIDE | 400 | Le contenu de la requête n'est pas un JSON valide. |
| REQUETE_STRUCTURE_INVALIDE | 400 | Le contenu de la requête doit être un objet. |
| MANAGER_CHAMP_ABSENT | 400 | Le champ managerId est requis. |
| MANAGER_VALEUR_INVALIDE | 400 | L'identifiant du manager est invalide. |
| MANAGER_AFFECTATION_INTERDITE | 409 | Cette affectation de manager n'est pas autorisée. |
| MANAGER_CYCLE | 409 | Cette affectation créerait une boucle entre managers. |
| MONTANT_INVALIDE / DATE_INVALIDE / RECU_INVALIDE | 400 | Le montant est invalide. / La date est invalide. / Le format du reçu est invalide. |
| FICHIER_TROP_VOLUMINEUX | 400 | Le fichier est trop volumineux. |
| DEMANDE_CONTENU_DIFFERENT | 409 | Cette demande existe déjà avec un contenu différent. |
| DEMANDE_EN_COURS | 409 | Cette demande est en cours de traitement. Veuillez réessayer. |
| DECISION_ETAT_INCOMPATIBLE | 409 | Already decided, réponse standard conservée |
| OCR_OCCUPE | 503 | Service temporairement occupé, veuillez réessayer. |
| OCR_DELAI_DEPASSE | 504 | L'analyse a dépassé le délai autorisé. Veuillez réessayer. |
| OCR_ECHEC | 500 | L'analyse du reçu a échoué. Veuillez réessayer. |
| SOUMISSION_INACHEVEE | 500 | La soumission n'a pas pu être terminée. Veuillez la reprendre. |
| ERREUR_INTERNE | 500 | Une erreur est survenue. Veuillez réessayer. |

Le client affiche le message sûr du champ error, avec texte français de repli si la réponse est illisible. Une panne réseau possède aussi un message local ; ce n'est pas une réponse HTTP. Toujours libérer les états UI, conserver la saisie après échec et ne jamais rejouer automatiquement une écriture incertaine.

## OCR, inscription et tri

OCR : conserver la prise en charge source PNG/JPEG/WebP sans l'étendre ; la source formelle professeur n'est pas fournie. PDF reste accepté au dépôt mais pas ajouté à l'OCR. Limite technique de départ : 10 MiB, un moteur réutilisable par processus, aucune file, refus immédiat si indisponible. Ce sont des bornes conservatrices de départ, pas une capacité validée. Traitement max 40 s depuis reconnaissance ; arrêter réellement le travail, vérifier/remplacer le moteur avant réutilisation. Inclure création/arrêt et fichiers corrompus dans les tests. Ne pas afficher ces détails d'implémentation dans l'UI.

Inscription : conserver actions serveur et réponses de formulaire. Entreprise + premier RH dans une seule transaction/connexion ; domaine déjà existant → employé, convention conservée sans vérification email. S'appuyer sur l'unicité du domaine pour qu'un gagnant crée entreprise/RH ; un concurrent relit l'entreprise validée avant sa création employé. Email déjà pris → message existant, aucune entreprise orpheline. Connexion après commit ; panne de connexion ne supprime pas le compte.

Tri : newest, amount_asc, amount_desc, insensibles à la casse ; absence conserve created_at DESC. Une valeur inconnue, y compris une ancienne expression SQL libre, est refusée 400. La suppression du SQL libre reste acquise ; les consommateurs externes doivent être vérifiés avant intégration. Ne pas modifier l'UI pour ajouter des fonctions de tri absentes.

## Portée de cette spécification

Le catalogue et les compléments techniques sont la référence de réalisation proposée dans la délégation de rédaction actuelle. Ils ne constituent ni une preuve de fonctionnement ni une validation des tests du professeur. Les seules réserves externes sont explicitées dans le [fichier 5](05-lots-et-acceptation.md) ; elles ne justifient pas de recommencer un entretien général. Aucun plan de migration ou retour arrière demandé ou produit.


## Complément autorisé — 29 octobre 2026

Maia demande de privilégier immédiatement la CI interne et les parcours de référence avec le minimum de risque. Le tri accepte aussi les deux alias historiques exacts `amount ASC` et `amount DESC` via la table fixe, sans SQL libre. Le refus d’un montant incorrect conserve le parseur strict et HTTP 400, avec le message historique `Champs invalides`. Ces deux compléments remplacent les choix de noms/messages ci-dessus sur ce périmètre uniquement.
