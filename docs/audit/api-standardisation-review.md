# Appels API : que faut-il réellement standardiser ?

Revue du 14 octobre 2026. Source originale et HEAD relu : `265924bc7274047989e708ab635c2854d376230f`. Statut : **audit et recommandations**, aucun changement applicatif ni nouveau contrat sélectionné.

**La priorité est de rendre les contrats et les erreurs cohérents, pas de renommer les routes pour les rendre « REST ».** L'application utilise déjà HTTP, des chemins décrivant les notes et les utilisateurs, des lectures GET, une création POST et une affectation PUT. Aucune panne n'est démontrée du seul fait de son style d'API.

## Les trois questions à distinguer

| Question | Sens concret dans Expense.io | Conclusion |
| --- | --- | --- |
| Style REST | Organiser les échanges autour de ressources identifiées, avec des méthodes HTTP et des représentations de ces ressources | Orientation déjà partiellement présente ; cette lecture ne certifie pas une conformité à toutes les contraintes REST |
| Contrat cohérent | Savoir quoi envoyer, quoi recevoir et comment interpréter un refus | Travail utile et nécessaire avant les corrections retenues ; déjà lié à AUD-005, AUD-020 et aux points AX de préparation |
| Fonction cliente commune | Éviter que chaque composant réécrive la lecture des erreurs et la gestion du transport | Option simple à examiner pendant AUD-016 ; l'extraction n'est pas automatiquement préférable à des corrections locales |

REST n'est ni une bibliothèque à installer ni une assurance contre les erreurs d'autorisation, les doublons ou les écritures partielles. Les corrections AUD-003, AUD-006, AUD-007 et AUD-009 restent nécessaires quel que soit le nom des routes.

## Ce que fait le code original

OBSERVATION : 14 modules `route.ts` existent, dont un délègue GET et POST à Auth.js. Les 13 autres modules portent 14 couples méthode/chemin métier, car `/api/expense-notes` expose GET et POST. Douze occurrences de `fetch` sont présentes dans les trois consommateurs UI ci-dessous. Ces comptes sont une inspection du code, pas douze requêtes exécutées.

| Étape du flux | Source originale | Fonctionnement |
| --- | --- | --- |
| Consulter ses notes | `src/app/expenses/page.tsx:57–64` → `src/app/api/expense-notes/route.ts:31–49` | GET ; renvoie directement un tableau de notes |
| Créer une note avec reçu | `src/app/expenses/page.tsx:74–100` → `src/app/api/expense-notes/route.ts:56–108` | POST multipart ; montant/date/description/reçu ; réponse JSON d'une note, statut 201 |
| Extraire une suggestion | `src/app/expenses/page.tsx:103–142` → `src/app/api/expense-notes/receipt-suggestion/route.ts:5–20` | POST multipart ; réponse contenant éventuellement montant et date |
| Obtenir le lien d'un reçu | `src/app/expenses/page.tsx:145–152` → `src/app/api/expense-notes/[id]/receipt-url/route.ts:6–26` | GET ; réponse `{ url }`, ouverture dans un nouvel onglet |
| Approuver/rejeter | `src/components/PendingApprovalsPanel.tsx:53–69` → `src/app/api/manager/expense-notes/[id]/approve/route.ts:5–45` et route reject équivalente | POST sans corps sur une action ; réponse JSON de la note mise à jour |
| Affecter un manager | `src/components/AdminConsole.tsx:71–87` → `src/app/api/hr/users/[id]/manager/route.ts:5–60` | PUT JSON `{ managerId }`, null retire l'affectation ; réponse JSON de l'utilisateur |

Les autres appels du manager se trouvent dans `PendingApprovalsPanel.tsx:27–50` ; ceux de la RH dans `AdminConsole.tsx:43–60` et `91–118`. L'[inventaire API](api-inventory.md) décrit aussi les variantes RH et les gardes d'accès. Inscription et connexion sont en plus des actions serveur dans `src/app/actions/auth.ts` : elles ne doivent pas être converties en nouvelles routes pour obtenir une uniformité de façade.

## Les problèmes concrets et leur portée

### 1. Erreurs publiques et pannes réseau — défauts déjà recensés

**OBSERVATION, AUD-005 :** `src/lib/errors.ts:1–5` envoie le message de l'exception et sa pile au client dans une réponse 500. La pile expose le chemin technique du programme ; une exception peut aussi contenir des détails internes. La correction acceptée garde un message public sûr et les diagnostics en logs internes. Le champ public `error` reste compatible.

**OBSERVATION, AUD-016 :** les douze appels clients n'ont pas de `catch` autour de `fetch`. Dans neuf chemins avec un état d'attente, une panne peut interrompre le handler avant sa remise à zéro. Les [mesures isolées déjà consignées](comment-review.md) portent sur ces neuf chemins, pas sur une exécution navigateur complète. Les trois lectures de reçu n'ont pas cet état à libérer, mais nécessitent aussi un message en cas d'échec de transport. Une erreur HTTP et une panne réseau sont différentes : dans la première, le serveur a répondu ; dans la seconde, le client ne dispose pas d'une réponse exploitable.

**OBSERVATION :** la soumission lit `body.error` (`expenses/page.tsx:94–99`), tandis que l'OCR affiche toujours un texte générique sur réponse non réussie (`expenses/page.tsx:121–123`). AUD-008 veut distinguer saturation, timeout et succès sans résultat. Cette distinction doit traverser le contrat et être comprise par le consommateur, sans exposer les diagnostics techniques.

Recommandation : traiter ces observations dans les issues existantes, sans créer une seconde issue « erreurs REST » décrivant la même correction.

### 2. Sémantique des refus d'accès — incohérence observée, impact à vérifier

Les routes manager utilisent 401 à la fois pour une session absente et un rôle incorrect (`src/app/api/manager/expense-notes/route.ts:20–22`, route approve:7–9). Les routes RH utilisent 403 dans ces deux cas (`src/app/api/hr/expense-notes/route.ts:20–22`, `src/app/api/hr/users/[id]/manager/route.ts:7–9`).

Cette différence rend le contrat moins prévisible. Les consommateurs lus testent principalement `response.ok` : ils ne démontrent pas aujourd'hui un parcours distinct selon 401 ou 403. Il n'y a donc pas de régression utilisateur constatée sur cette différence seule. **PROPOSITION :** documenter et tester séparément absence d'identité, rôle interdit et ressource hors périmètre. Une harmonisation des statuts reste à sélectionner après contrôle des contrats et des tests du professeur ; ce rapport ne change pas silencieusement ces réponses. Les choix 404 pour ne pas révéler une ressource hors périmètre doivent rester explicites.

### 3. Contrats incomplets — manque de preuve, pas obligation de tout réécrire

L'inventaire décrit les méthodes et les flux, mais pas encore tous les champs, leurs cas optionnels, les erreurs et les répétitions. Les types UI sont locaux (`expenses/page.tsx:5–12`, `PendingApprovalsPanel.tsx:5–12`, `AdminConsole.tsx:5–20`) et ne constituent pas une validation des réponses reçues. Une assertion TypeScript ne vérifie pas un JSON en exécution.

**PROPOSITION :** compléter les contrats des flux modifiés et leurs tests de compatibilité. Un tableau documenté peut suffire au départ ; OpenAPI est une alternative si sa maintenance et sa vérification sont assurées. Aucun besoin de générateur de SDK ou de validation exhaustive de toute réponse n'est démontré. Les formes différentes — tableau de notes, note créée, suggestion optionnelle, URL — correspondent à des usages différents ; les envelopper toutes dans `{ data }` changerait les consommateurs sans traiter un défaut identifié.

## Proposition minimale de fonctionnement futur

1. Conserver les chemins, méthodes, corps JSON/multipart, réponses de succès et périmètres actuels, sauf évolution déjà retenue et documentée.
2. Pour chaque correction retenue, figer l'entrée, la sortie, les erreurs et les effets de bord avant implémentation. Préserver les erreurs standard anglaises autorisées ; rédiger les nouveaux messages compréhensibles en français.
3. Appliquer AUD-005 pour les erreurs serveur, AUD-020 pour l'entrée d'affectation, AUD-008 pour l'OCR et AUD-016 pour les erreurs clientes. Distinguer réponse HTTP en erreur, échec réseau et réponse impossible à lire.
4. Si la répétition gêne réellement ces corrections, extraire une petite fonction de requête : conserver la méthode/le corps fournis, lire une erreur publique sûre ou un texte de repli, et propager un résultat utilisable par le composant. Le composant garde la responsabilité de ses états, de son message et de son `finally`.
5. Ne pas rejouer automatiquement une écriture après panne ou timeout : le serveur peut avoir écrit malgré l'absence de réponse. La reprise de soumission relève du mécanisme idempotent retenu dans AUD-003.

Pour un reçu multipart, la fonction éventuelle doit laisser le navigateur construire `Content-Type` et sa frontière multipart ; elle ne doit pas imposer `application/json` à toutes les requêtes. Elle ne doit pas non plus transformer chaque erreur en tableau vide ou suggestion vide : cela masquerait une panne.

Cette fonction n'est pas une couche métier ni un port hexagonal obligatoire. Elle n'a pas à centraliser les permissions manager/RH ou à créer une nouvelle classe pour chaque route.

## Alternatives et priorités proposées

| Option | Bénéfice et coût | Avis dans ce projet |
| --- | --- | --- |
| Corriger localement puis documenter/tester les contrats | Petit diff, peu de nouveaux concepts ; quelques répétitions subsistent | Option crédible et suffisante pour les défauts actuels |
| Petite fonction cliente commune | Une même lecture des erreurs de transport/HTTP ; nécessite un contrat propre, tests et adaptation des 12 appels si tous migrent | À choisir seulement si elle simplifie le diff réel ; priorité secondaire par rapport aux défauts |
| Remplacer approve/reject par PATCH d'une ressource, renommer les variantes par rôle | Style plus uniforme au prix de contrats et consommateurs modifiés | Non recommandé sous la contrainte de compatibilité ; renommer ne rend pas l'UPDATE atomique |
| Enveloppe universelle, SDK généré, bibliothèque de requêtes supplémentaire | Outillage possible pour une API plus large ; coût d'installation, maintenance et migration | Aucun besoin démontré ici |

Priorité haute : fuite de détails internes AUD-005 et erreurs réseau bloquant l'UI AUD-016 ; compléter les contrats nécessaires aux corrections d'isolation/concurrence. Priorité de préparation : catalogue d'erreurs et tests de contrat. Priorité basse et conditionnelle : helper client et harmonisation 401/403 après vérification de compatibilité. Aucun chantier « migration REST » n'est justifié par les sources lues.

Si un identifiant supplémentaire est souhaité dans le registre, le nom pertinent serait **« contrats HTTP et traitement des erreurs cohérents »**, avec un statut proposition, et un périmètre qui référence les issues existantes au lieu de les dupliquer. L'attribution d'un nouvel ID appartient à la consolidation du registre ; aucun ID AUD supplémentaire n'est créé ici.

## Validation attendue et limites de cette revue

Tests à prévoir : succès et erreurs pour chaque contrat touché ; champs publics conservés ; JSON et multipart préservés ; session absente/rôle interdit/hors entreprise ; 404 et 409 maîtrisés ; rejet réseau et réponse non JSON côté UI ; libération des états et conservation de la saisie ; absence de renvoi automatique des écritures ; absence de stack publique ; succès OCR sans champ distinct d'une panne.

Il faut ensuite exécuter les parcours avec deux entreprises et plusieurs rôles dans un environnement isolé. Les tests du professeur n'ont pas été inspectés. Cette revue a relu routes et consommateurs, mais n'a exécuté aucune requête HTTP, aucun navigateur, DB, S3 ni OCR. Elle ne mesure pas le gain d'un helper, ne prouve pas une conformité REST complète et ne sélectionne aucun refactor.

Lien avec le cours : axe styles/frontières API (C3 3–9, 11–18), contrats (23–24), erreurs (30–36), selon le [playbook](../../AGENT_Files/Documentation/ARLA_Audit_Playbook.md). La maîtrise attendue consiste à expliquer et vérifier ces choix dans Expense.io, pas à multiplier les conventions et les outils.
