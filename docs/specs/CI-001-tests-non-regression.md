# CI-001 — Tests de non-régression et CI

Statut : **plan validé par Maia ; implémentation vérifiée localement, exécution GitHub à distinguer**. Maia exige un lien explicite entre chaque test et les identifiants des issues auditées. Branche : feat/ci ; révision de départ : `49e0ff395fd94c57e54213fe95434eb1e1e61869`. Source originale auditée : `265924bc7274047989e708ab635c2854d376230f`.

Objectif : protéger les fonctionnalités et contrats API, rendre les défauts visibles et préparer les corrections sans réécrire l'application pendant le lot CI. Références : [contrats](../audit/01-contrats-implementation.md), [permissions](../audit/02-permissions-et-transitions.md), [validation](../audit/04-reference-de-validation.md), [instructions](../development/INSTRUCTIONS_IMPLEMENTATION.md). Dossier de validation principal : AUD-011 ; cette spec n'en réécrit pas la fiche.

## Principe de résultat

Les parcours légitimes existants constituent la référence de non-régression. Les défauts déjà repérés sont testés selon le comportement sûr attendu : un accès interdit doit être refusé, pas être asserté 200 parce que le code actuel le permet. Certains tests doivent donc échouer avant les corrections. Cela ne justifie ni skip, ni expected-failure masquant le défaut, ni modification des assertions pour obtenir du vert.

**Décision validée : les suites de fonctionnalités, API et sécurité présentes dans le workflow principal sont bloquantes. La CI peut être rouge au départ à cause des défauts existants.** Les rapports distinguent une régression nouvelle, un défaut connu et une panne d'environnement. Le lot CI n'autorise pas à corriger silencieusement le code applicatif pour les faire passer.

Un test d'une fonctionnalité absente ne sera pas un placeholder ignoré ou une fausse réussite. Les cas de reprise/pool/cible hexagonale seront ajoutés dans le lot correspondant, avec les mêmes critères attendus ci-dessous. Le rapport de couverture indique précisément cette portée.

## Étapes visibles dans GitHub Actions

| Étape / job | Contrôle | Critère |
| --- | --- | --- |
| 1 — Installation | Version Node 24 fixée, npm ci depuis lockfile, dépendances de test installées et verrouillées | Installation reproductible ; aucun npm install implicite pendant les tests |
| 2 — Documentation protégée | Manifeste historique et comparaison des fiches avec la base de PR/push ; contrôle ajout uniquement | Texte préexistant inchangé, anciennes IMPLEMENTATION conservées ; nouvel ajout structuré |
| 3 — Lint | npm run lint existant | Exit 0 ; aucune réécriture automatique de format |
| 4 — Types | npm run typecheck existant | Exit 0 ; erreurs non ignorées |
| 5 — Tests unitaires | Règles utiles testées en isolation | Assertions positives et négatives, aucun succès d'une suite vide |
| 6 — Build | npm run build existant | Artefact de production réellement produit, sans ignorer les erreurs de types |
| 7 — Intégration et API | Serveur construit, PostgreSQL et S3 réels isolés ; appels authentifiés | Contrats et effets persistants vérifiés ; défauts connus signalés par des tests rouges |
| 8 — Parcours navigateur | Application construite, navigateur Chromium et fixtures propres | Parcours employé/manager/RH vérifiés de bout en bout |
| 9 — Rapports et résultat final | Résultats, logs utiles, traces/captures d'échec, synthèse par suite | Échec si job requis échoué ou ignoré sans raison autorisée ; pas de faux vert |

Lint, types, documentation et tests unitaires peuvent tourner en parallèle après leur préparation. Le build doit précéder les tests API/navigateur qui utilisent le serveur de production. API et navigateur peuvent tourner en parallèle avec environnements et données distincts. Les rapports et le nettoyage s'exécutent même en cas d'échec ; leur réussite ne masque pas les échecs de test.

Le cache concerne les téléchargements, pas une DB ou un bucket rempli par un job précédent. Les commandes build/README existantes sont conservées ; seuls les scripts de test nécessaires sont ajoutés.

## Liste des fonctionnalités à protéger dès le lot CI

| Groupe | Cas à tester | Niveau et contrôle persistant |
| --- | --- | --- |
| F01 — Connexion | Identifiants valides ; mot de passe incorrect ; champs manquants ; session ; déconnexion | API/Auth.js et navigateur ; aucune fausse session injectée pour remplacer la preuve de connexion |
| F02 — Inscription | Entreprise nouvelle avec premier RH ; entreprise existante avec employé ; email déjà pris ; nom/email/mot de passe invalides ; connexion après création | Action serveur via navigateur, comptes/rôles/entreprise vérifiés en DB ; convention de domaine conservée |
| F03 — Accès aux pages | /expenses, /manager, /hr : accès sans session et avec rôles attendus ; navigation visible pertinente | Navigateur ; la garde de page ne remplace pas les refus API |
| F04 — Création valide | Montant positif, date valide, description et reçu ; formulaire puis réponse/listing | HTTP 201, une note avec bonnes valeurs SQL, clé correcte, objet S3 existant et lisible |
| F05 — Formats de reçu | PDF, PNG, JPEG et WebP légitimes ; type non supporté ; absence de fichier ; taille à la limite et au-dessus | HTTP, nombre de lignes/objets avant et après ; limite actuelle 10 MiB |
| F06 — Liste propriétaire | Seulement ses notes ; liste vide ; ordre par défaut ; total cohérent ; montants/dates affichés | API et navigateur ; notes de l'autre utilisateur/entreprise absentes |
| F07 — Reçu propriétaire | Ouverture d'un reçu autorisé ; note absente ; reçu d'autrui | Statuts et récupération réelle de l'objet par URL signée autorisée, sans publier cette URL dans les preuves |
| F08 — Manager | Collaborateurs directs pending ; manager subordonné ; approuver et rejeter ; note déjà décidée ; aucune extension automatique à toute la descendance | API/navigateur/DB ; la décision disparaît de la liste pending et persiste |
| F09 — RH | Managers racines pending de son entreprise ; annuaire employé/manager ; approuver et rejeter | API/navigateur/DB ; aucune ouverture globale de toutes les notes |
| F10 — Affectation | Choix d'un manager valide ; retrait managerId explicitement null ; annuaire de l'entreprise | API/navigateur/DB ; bonne relation persistée |
| F11 — OCR | Reçu lisible de référence ; champs suggérés ; image valide sans texte ; saisie manuelle conservée | Au moins un vrai traitement OCR ; assertions robustes sur contenu connu, pas sur quelques millisecondes |
| F12 — Règles métier existantes | Décision autorisée depuis pending ; impossibilité de redécider approved/rejected ; manager racine vs subordonné et relation directe | Tests ciblés par interfaces disponibles ; les classes domain actuelles ne sont pas appelées par les routes, donc ces tests ne prouvent pas seuls le fonctionnement HTTP |
| F13 — Préparation de démonstration | Préparation bucket ; seed sur cible isolée ; relance complète sans doublon | Scripts originaux, DB/S3 réels ; ne pas exécuter sur les services utilisateur |

## Contrôles des appels API et des défauts connus

Inventaire : [toutes les routes métier et Auth.js](../audit/api-inventory.md). Pour chacune : méthode/chemin, authentification, corps JSON ou multipart, statut, champs/types, effets autorisés et absence de mutation après refus. Les réponses succès restent tableaux/objets actuels ; error reste une chaîne. Les différences existantes des gardes 401/403 ne sont pas réécrites dans le lot CI.

| Groupe / IDs | Cas négatifs et frontières | Attendu de correction à préserver dans le test |
| --- | --- | --- |
| A01 — AUD-004 | Tri absent, options nommées et casse, option invalide, entrée ressemblant à une expression SQL | Options autorisées seulement ; 400 avant SQL sur valeur interdite ; propriétaire conservé |
| A02 — AUD-005 | Exception DB/stockage contrôlée | Message sûr, aucune stack/message DB public, diagnostic interne structuré sans secret |
| A03 — AUD-006/009 | Autre entreprise ; même entreprise hors rattachement ; mauvais rôle ; propriétaire différent ; ID absent | Accès interdit, reçu non signé pour une note interdite ; contrôles positifs pour ne pas confondre protection et système refusant tout |
| A04 — G10 | Rôle DB changé avec session conservée ; compte supprimé | Nouvelle requête conforme aux droits actuels, ancienne session insuffisante |
| A05 — AUD-006/020/021 | Manager interentreprises ou de mauvais rôle ; JSON cassé, null/tableau/chaîne ; champ manquant ; UUID invalide ; auto-affectation ; cycle à deux et long | Aucune mutation sur entrée/affectation invalide ; erreurs différenciées ; null explicite reste un retrait valide |
| A06 — AUD-007 | Décisions simultanées opposées et identiques, manager et RH | Une seule transition gagnante ; première décision non écrasée ; états/réponses vérifiés via vraie DB et HTTP |
| A07 — AUD-014 | 12abc, séparateurs répétés/mélangés ; point et virgule ; décimales supplémentaires ; bornes numériques | Validation complète, équivalence, arrondi PostgreSQL conservé, erreur contrôlée sans détail DB |
| A08 — AUD-015/017 | Date absente, format incorrect, jour impossible, bissextile, futur ; minuit Paris ; affichage Paris/UTC/Los Angeles | Refus contrôlé selon contrat ; même jour calendaire affiché ; pas de déplacement lié au fuseau |
| A09 — G14 | Faux contenu annoncé PNG/PDF ; type déclaré incohérent | Refus avant création/stockage ; formats réels légitimes toujours acceptés |
| A10 — AUD-016 | Rejet réseau, HTTP d'erreur et réponse illisible sur les 12 fetch clients | Message, libération des neuf états actifs, saisie conservée, aucun retry automatique d'écriture |
| A11 — AUD-008 | Image corrompue et format OCR non supporté | Une panne ne ressemble pas à un succès vide ; dépôt PDF toujours possible sans OCR PDF ajouté |
| A12 — AUD-003/013/018 | Panne S3 après insertion ; panne compte après entreprise ; seed interrompu puis relancé | État cohérent selon les corrections retenues ; aucune entreprise orpheline ; reprise seed répare la même note |
| A13 — AUD-009 | Compte DB effectif, politique RH interentreprises, contexte absent/réutilisé et droit propriétaire | RLS réellement appliquée, pas d'accès B ; finalisation permise mais auto-approbation et modifications libres interdites |

Le code actuel ne satisfait pas tous ces attendus. L'étape CI crée et exécute les tests pertinents déjà exprimables ; un échec connu est relié à son ID et reste visible/bloquant. Le harnais d'audit actuel ne peut pas être repris tel quel comme gate : son processus peut sortir avec 0 malgré des assertions pass=false. Les suites CI doivent réellement sortir en échec si leurs assertions échouent.

Pour A13, distinguer le compte fourni par la configuration originale et un compte limité utilisé pour examiner les politiques. Ne pas renforcer silencieusement la fixture, puis prétendre avoir validé les privilèges livrés par le dépôt.

## Tests à ajouter avec les mécanismes futurs

Ces critères sont approuvables dans le plan, mais leur réalisation appartient aux lots qui créent les mécanismes. Aucune suite fictivement verte ou test ignoré ne remplace leur absence.

| Mécanisme absent actuellement | Tests à livrer avec sa réalisation |
| --- | --- |
| AUD-003 : incomplete, demande stable et reprise | Même clé/même note ; deux demandes légitimes identiques distinctes ; même clé/autre contenu 409 ; rechargement ; objet présent sans référence ; réponse perdue ; concurrent refusé ; note décidée non réinitialisée ; legacy sans en-tête conservé |
| AUD-008 : pool et arrêt effectif | Moteur réutilisé ; aucun libre → 503 ; pas de file ; tâche arrêtée à 40 s ; remplacement/libération ; borne d'entrée ; défaut de capacité puis ajustement mesuré |
| Hexagonal | Contrats des adaptateurs réels/test et tests par interface de soumission ; contrôle des imports limité au module effectivement extrait |

## Contrôles séparés et rapports complémentaires

- **Dépendances :** produire npm audit et son statut réels. Les 8 packages signalés ne sont pas 8 exploits démontrés. Proposition : rapport distinct de qualification, informatif pour ce premier lot, sans upgrade automatique ; aucun résultat global ne doit dire « dépendances sûres ». Le blocage par gravité attend la qualification AUD-023, pas une exception silencieuse à un test fonctionnel.
- **Performance :** garder les mesures longues de charge OCR/listes dans une exécution manuelle dédiée ; effectuer en CI un OCR réel borné et les tests déterministes nécessaires. Ne pas bloquer sur un seuil de latence arbitraire dépendant du runner.
- **Couverture :** publier la mesure utile si instrumentée, sans inventer 100 % ni un seuil arbitraire. Pas de tests de getters ou de copie de l'implémentation pour gonfler le compte.
- **Documentation :** manifeste permanent et préfixes de la base PR/push ; détecter aussi une réécriture d'une ancienne section IMPLEMENTATION. Une snapshot capturée seulement après modification ne suffit pas.

## Exécution et outillage proposés

GitHub Actions, Node 24 fixé, PostgreSQL 16 et LocalStack S3 dédiés ; Vitest pour les règles isolées utiles, Playwright pour API HTTP et navigateur. Versions exactes vérifiées/verrouillées pendant l'implémentation après validation. Chromium d'abord, fuseaux paramétrés ; pas de matrice multi-OS/multi-navigateurs coûteuse sans besoin démontré.

Déclenchements proposés : pull requests, pushes sur main/feat/ci/feat/implementation et lancement manuel. Annuler les exécutions devenues obsolètes de la même branche ; limiter les permissions GitHub au nécessaire. Les paramètres de protection de branche ne sont pas modifiés par cette spec.

Chaque job d'intégration possède sa propre DB/bucket/fixtures (deux entreprises et plusieurs rôles). Attendre la disponibilité réelle des services, pas un sleep fixe ; contrôler que le serveur construit est démarré avant les requêtes. Données jetables et credentials fictifs ; services locaux préservés. Rapports et nettoyage même après échec, aucun cookie ou URL signée dans les artefacts.

Sources officielles consultées pour le choix : [jobs et dépendances GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs), [tests HTTP Playwright](https://playwright.dev/docs/api-testing), [Vitest](https://vitest.dev/guide/). Versions retenues : Playwright 1.64.1 et Vitest 5.0.4, verrouillées dans package-lock.json.

## Fichiers prévus après validation

Workflow(s) sous .github/workflows ; configurations et suites de tests ; fixtures SQL/fichiers et orchestration isolée ; scripts de tests ajoutés au package.json et lockfile pour leurs dépendances ; instructions d'exécution. Conserver scripts existants et code applicatif. Un besoin exceptionnel d'extraction pour testabilité doit être justifié comme changement distinct, pas réalisé silencieusement dans ce lot.

Ajouter alors IMPLEMENTATION dans AUD-011 pour le dispositif réellement réalisé et ses preuves ; ne pas marquer les autres défauts corrigés parce que leurs tests existent. Les fiches des défauts peuvent recevoir un ajout précisant un test/constat, avec statut explicite « défaut non corrigé », seulement si la réalisation le concerne réellement. Conserver tous les préfixes et anciennes entrées.

## Critères d'acceptation du lot CI

1. Étapes distinctes visibles, dépendances cohérentes et même environnement local/CI documenté.
2. Parcours et API listés couverts ou absence explicitement liée à un mécanisme futur ; aucune sélection cachée ou suite vide réussie.
3. Une assertion échouée rend la suite et le résultat requis rouges ; synthèse publiée même après échec.
4. Défauts connus distingués des régressions, sans changer les attentes ni corriger l'application dans ce lot.
5. Rapports avec SHA, comptes réellement exécutés/réussis/échoués/ignorés et traces d'échec ; protection ajout uniquement vérifiée.
6. Commandes actuelles, services utilisateur, contrats et UI préservés.

Validation reçue de Maia : périmètre F/A, étapes et outillage acceptés, avec identifiant d'issue sur chaque test. Les tests de sécurité restent bloquants ; le rapport de dépendances est informatif pendant qualification.

## Convention de traçabilité validée

Chaque titre contient `[AUD-007][DEC-001][correction] description` : une ou plusieurs issues existantes, un identifiant de cas unique, puis `reference`, `correction` ou `outillage`. Le catalogue vérifie ces règles et refuse les tests ignorés ou exclus. `npm run test:issue -- AUD-007` lance uniquement les cas liés ; une issue sans cas exécutable échoue explicitement. Cette sélection ne remplace pas le passage complet requis avant intégration.

La synthèse indique les réussites, échecs et absences par issue. Elle conserve les couvertures différées : aucun statut « issue corrigée » n'est déduit automatiquement d'un sous-ensemble vert. Les rapports portent la révision, l'état commité/local, la date, la version Node et la portée exacte. Les traces contenant les cookies sont désactivées ; les captures d'échec et erreurs filtrées restent disponibles.

Les résultats et limites réels sont consignés dans l'ajout IMPLEMENTATION d'AUD-011 et la preuve de campagne CI ; cette spec ne transforme pas un test ajouté en correction applicative.


## Résultat de réalisation

178 cas exécutés :105 réussites,73 échecs,0 absent. Unitaires6/6 ; API61/112 ; navigateur38/60. Tous les échecs portent le type correction ; aucune assertion reference en échec. Installation verrouillée, lint, types, build, actionlint et protection documentaire réussis. Aucun défaut applicatif corrigé dans ce lot. Voir la [campagne et ses limites](../audit/evidence/ci-20261015/README.md) et l'[ajout AUD-011](../audit/solutions-to-audit/AUD-011-validation-isolee.md#implementation). La validation locale ne remplace pas une exécution hébergée GitHub.
