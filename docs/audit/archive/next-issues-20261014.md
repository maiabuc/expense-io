> Archive de préparation : ce document décrit sa révision datée, pas l’état actuel du produit. Voir [l’index courant](../README.md).

# Nouveaux points à discuter après revue des axes d'architecture

14 octobre 2026. Source : `265924bc7274047989e708ab635c2854d376230f`. Lecture de code et observation isolée de parsing uniquement ; aucun code applicatif ni service modifié. [Décisions](../DECISION_LOG.md), [couverture](../coverage.md), [bilan des axes](status-and-changes-20261015.md).

## Architecture désormais validée

L'architecture hexagonale est acceptée à condition de rester simple : monolithe conservé, interfaces utiles, adaptateurs DB/S3/test, première extraction de la soumission. [ADR accepté](../../adr/0002-hexagonal-soumission.md). Pas de framework d'injection, queue, notifications ou service réseau ajouté pour illustrer le cours. Ne pas remettre cette décision en question ; les détails et tests restent à préparer. Le checkpoint suspendu n'est pas réputé acquis.

## Résultat de cette passe

Séquence choisie : discuter AUD-019 à AUD-022 un par un, puis passer aux preuves et aux mesures. Commencer par AUD-019, convention d'inscription par domaine. Ne pas rouvrir les corrections acceptées ; pas de nouveau quiz de compréhension dans cette phase de choix. Après les décisions, les points AX servent à préparer les contrats/protocoles nécessaires, sans repousser indéfiniment la phase de preuves.

Quatre candidats applicatifs supplémentaires sont enregistrés (AUD-019 à AUD-022). Ils ne sont pas quatre défauts runtime prouvés : AUD-020 a un parsing reproduit isolément ; AUD-019 est un risque de confiance ; AUD-021 exige une règle métier ; AUD-022 exige une mesure de charge. Les points AX ci-dessous sont des choix de contrat/preuve qui restent ouverts, pas de nouveaux bugs.

Priorité d'investigation proposée : identité/entreprise et requête d'affectation invalide d'abord ; règle de hiérarchie et volume ensuite. Ce classement n'est pas une décision d'implémentation. Ne pas sélectionner une solution ou ajouter une fonctionnalité à partir de la seule présence dans ce fichier.

## AUD-019 — L'adresse saisie suffit à rejoindre ou créer une entreprise

Décision obtenue : fonctionnement conservé comme convention pédagogique, pas de correction à réaliser. Limite de confiance documentée dans [la décision](../solutions-to-audit/AUD-019-inscription-domaine.md). Ne pas reposer cette question ; avancer à AUD-020.

**Axe :** identité, permissions et isolation. **Statut :** risque source, attendu métier à confirmer ; non reproduit.

**Localisation initiale :** [signup:23–29](../../../src/app/actions/auth.ts#L23) valide la syntaxe de l'email ; [signup:41–62](../../../src/app/actions/auth.ts#L41) rattache l'utilisateur au domaine ou crée l'entreprise et attribue RH ; [signup:65–68](../../../src/app/actions/auth.ts#L65) crée le compte. Authentification Credentials : `src/lib/auth.ts:25–40` vérifie le mot de passe de ce compte, sans preuve de possession de l'adresse dans ce parcours.

**OBSERVATION :** aucune invitation ou vérification de possession de l'adresse n'est identifiée dans l'inscription inspectée. Le domaine vient d'une chaîne fournie par le visiteur. **HYPOTHÈSE :** quelqu'un saisissant une adresse d'un domaine qu'il ne contrôle pas peut obtenir un compte rattaché à cette entreprise ; le premier inscrit pour un domaine nouveau reçoit RH. Cela ne prouve pas qu'il lit des reçus d'autrui ni qu'il vole un compte RH existant.

**Pourquoi examiner :** des filtres d'entreprise corrects ne compensent pas un rattachement d'entreprise non fiable. La transaction AUD-013 évite les créations partielles mais ne prouve pas cette appartenance.

**Question à discuter :** l'inscription libre par domaine est-elle une convention volontaire de démonstration à préserver, ou faut-il une preuve avant rattachement/RH ? Si la convention est imposée par les tests, documenter la limite et clarifier avec le professeur. Aucun email de vérification, invitation ou service externe sélectionné.

**Preuve suivante :** sur deux domaines de test isolés, comparer inscription initiale et entreprise existante, rôles attribués, contrôles positifs et permissions effectives. Définir l'attendu avant de qualifier le résultat de faille.

## AUD-020 — Une requête invalide peut devenir un retrait de manager

Direction désormais retenue : distinguer JSON illisible, structure incorrecte, champ manquant et valeur invalide ; refuser sans mutation. Null explicite reste une demande valide de retrait. Codes techniques distincts dans les logs, messages publics compréhensibles. [Solution](../solutions-to-audit/AUD-020-validation-affectation.md), non implémentée.

**Axe :** contrat API, validation et autorisation. **Statut :** parsing observé et reproduit isolément ; mutation HTTP/DB non exécutée.

**Localisation initiale :** [affectation:12–13](../../../src/app/api/hr/users/[id]/manager/route.ts#L12) remplace l'échec JSON par null puis managerId absent par null ; [affectation:31–46](../../../src/app/api/hr/users/[id]/manager/route.ts#L31) ne vérifie le manager que s'il est non null ; [affectation:48–51](../../../src/app/api/hr/users/[id]/manager/route.ts#L48) sauvegarde cette valeur. Le [client RH:74–78](../../../src/components/AdminConsole.tsx#L74) envoie explicitement managerId, y compris null pour retirer une affectation.

**MEASUREMENT :** les deux déclarations extraites du source ont été exécutées sur huit corps. JSON cassé `{`, objet vide, null, tableau, nombre et chaîne aboutissent tous à managerId=null, comme le retrait explicite valide ; un identifiant explicite est conservé. [Résultats bruts](../evidence/manager-body-check.json). Aucun utilisateur ni DB modifié.

Reproduction depuis la racine : `node docs/audit/evidence/manager-body-check.cjs` ([script](../evidence/manager-body-check.cjs)). Il lit seulement le code, simule request.json et imprime les résultats ; aucune connexion réseau ni écriture DB.

**Pourquoi examiner :** un contenu mal formé ne devrait pas être silencieusement interprété comme une action valide qui change la hiérarchie et le périmètre de review. Le problème ne concerne pas le retrait explicite, qui doit rester disponible.

**Décision retenue :** contrat d'entrée serveur strict et erreurs différenciées avant toute mutation ; null explicite conservé comme retrait. Aucun changement UI nécessaire.

**Preuve suivante :** route réelle avec RH autorisé, état initial connu et assertion qu'aucune affectation ne change après corps invalide ; retrait null et affectation autorisée comme contrôles positifs. UUID/type du champ et réponses exactes à préciser selon AUD-005.

## AUD-021 — Les cycles entre managers ne sont pas contrôlés

Décision obtenue : interdire les boucles tout en conservant les affectations valides. [Solution retenue](../solutions-to-audit/AUD-021-boucles-managers.md). Mécanisme et contrat à préparer ; aucune correction implémentée. Prochain et dernier candidat de cette liste : AUD-022, puis preuves et mesures.

**Axe :** règles de domaine et cohérence. **Statut :** observation source et règle métier acceptée ; comportement HTTP/DB non reproduit.

**Localisation initiale :** [affectation:32–34](../../../src/app/api/hr/users/[id]/manager/route.ts#L32) bloque seulement managerId égal à l'utilisateur cible ; [affectation:39–51](../../../src/app/api/hr/users/[id]/manager/route.ts#L39) vérifie le rôle puis écrit. [Schéma:18](../../../migrations/1700000000001_init-schema.sql#L18) a une référence de user ID sans contrôle de cycle. Les managers sont aussi des cibles autorisées (`affectation:24`).

**HYPOTHÈSE :** A peut être rattaché à B, puis B à A, ou former une boucle plus longue. Deux requêtes concurrentes peuvent compliquer le contrôle. Le blocage de l'auto-affectation ne garantit pas une hiérarchie sans cycle.

**Pourquoi examiner :** le produit parle de managers racines et d'un organigramme ; une boucle peut modifier les chemins de review et empêcher de raisonner sur une racine. Cela ne signifie pas que le produit interdit formellement tout cycle aujourd'hui.

**Décision :** l'organigramme doit être sans boucles. Définir les cas et la concurrence avant un contrôle atomique. La règle même entreprise retenue dans AUD-006 ne résout pas les cycles au sein d'une entreprise.

**Preuve suivante :** deux managers de la même entreprise, boucle A/B et boucle longue, affectations valides et manager racine ; essais simultanés. Règle retenue, mécanisme de correction non implémenté.

## AUD-022 — Listes sans borne de volume

Décision obtenue : optimiser si et seulement si la solution est simple, en préservant le fonctionnement et l'UI. [Solution conditionnelle](../solutions-to-audit/AUD-022-optimisation-simple-listes.md). Les index sont une piste à préciser, pas un gain démontré. Les quatre candidats ont été discutés ; prochaine phase : preuves et mesures isolées.

**Axe :** performance et évolutions métier. **Statut :** observation source, risque de charge non mesuré.

**Localisation initiale :** [liste propriétaire:45–49](../../../src/app/api/expense-notes/route.ts#L45), [liste manager:26–33](../../../src/app/api/manager/expense-notes/route.ts#L26) et [liste RH:26–34](../../../src/app/api/hr/expense-notes/route.ts#L26) retournent tous les résultats du périmètre sans LIMIT/pagination. [UI:155,282–285](../../../src/app/expenses/page.tsx#L155) calcule le total des notes reçues et affiche chaque entrée.

**HYPOTHÈSE :** l'historique croissant augmente requête, taille de réponse et rendu. Aucune lenteur actuelle ni seuil critique démontré ; faible volume de démonstration possible. À distinguer du coût OCR.

**Pourquoi examiner :** une pagination introduite sans contrat changerait aussi le total calculé par le client. Elle peut modifier l'UI, donc ne pas la choisir automatiquement sous la contrainte de préservation.

**Décision :** une optimisation simple est acceptée sans exiger d'abord une lenteur démontrée. Préparer les index pertinents et mesurer leur effet ; pagination et total séparé ne sont pas sélectionnés. Volumes et protocole restent à définir sur données isolées.

**Preuve suivante :** données isolées de volume fixé, temps SQL/HTTP, taille de réponse et rendu, sous mêmes versions/conditions ; conserver l'isolation entreprise. Aucun nouveau jeu volumineux ou service lancé dans cette passe.

## Choix et vérifications à traiter sans inventer de nouveaux défauts

| Point | Axe / sources au SHA | Question réellement ouverte | Travail de l'agent avant décision |
| --- | --- | --- | --- |
| AX-01 — Référence fonctionnelle | Contrats ; routes/API inventory, tests professeur annoncés | Quels comportements observables doivent être préservés, notamment incomplete/reprise et dates futures ? | Inventorier inputs/outputs/statuts/consommateurs ; distinguer défaut corrigé et fonction changée ; ne pas affaiblir les tests |
| AX-02 — Identifiant de demande | Répétition ; AUD-003, route de création:88–108 | Conservation client, durée de reprise et même clé avec autre contenu | Préparer contrat/stockage atomique ; conserver la clé choisie, ne pas redécider l'absence de doublons |
| AX-03 — Décision déjà prise | Concurrence ; quatre routes approve/reject:24–30 et AUD-007 | Réponse à répétition identique ou conflit, sans révéler une note non autorisée | Relever les réponses actuelles, distinguer zéro ligne pour état/scope/inexistence, préparer essais concurrents |
| AX-04 — Migration/retour arrière | Cohérence ; schéma:18,32, AUD-003/AUD-006/AUD-009 | Trajectoire de schéma et compatibilité des anciennes versions/données | Préparer migrations isolées, invariants et rollback sans supprimer de notes ni reclasser aveuglément |
| AX-05 — Diagnostic structuré | Erreurs ; errors.ts:2–5, AUD-005 | Corréler une demande et son erreur sans code technique affiché | Proposer catalogue/logs et contexte sûr ; conserver le champ error et la décision d'affichage |
| AX-06 — Portée hexagonale et priorités | Découpage/compromis ; structure-review, ADR-0002 accepté | Ordre et nombre de modules à migrer sous contrainte de simplicité | Commencer par soumission ; justifier chaque port par orchestration/tests ; maintenir permissions manager/RH distinctes |
| AX-07 — Capacité et bornes OCR | Performance ; receipt-suggestion:12–19, ocr.ts:118–128 | Taille, nombre de moteurs et consommation supportables | Mesurer froid/chaud, concurrence, CPU/RAM et arrêt effectif ; conserver pool sans file et 40 s déjà choisis |
| AX-08 — Scénarios futurs | CAP/internationalisation ; EUR dans UI:15–18, monolithe existant | Quelles limites assumées face à monnaies/régions/volumes futurs ? | Justifier applicabilité/non-applicabilité ; pas de multi-région, FX ou distribution sans besoin sélectionné |
| AX-09 — Validation et exploitation | Qualité/IA ; package.json:5–16, Makefile:36–46, coverage | Contrôles requis, temps disponible et preuve finale attendue | Environnement isolé, lint/types/build/startup, tests unitaires/intégration/API/E2E, dépendances et protocole de reprise ; conserver commandes existantes |

L'absence de test script/workflow identifié ne prouve pas l'absence des tests externes du professeur. Un fichier présent ne prouve pas son comportement. Les travaux AX peuvent être menés en lecture/préparation sans un nouvel entretien pour chaque détail technique.

## Correspondance aux 13 axes du playbook

Contraintes/compromis → AX-06/09 ; responsabilités/ADRs → architecture validée et AX-06 ; découpage → AX-06/AUD-021 ; hexagonal → ADR-0002 et tests d'interfaces ; identité/isolation → AUD-019 et validations AUD-006/009/G10 ; API/styles → AUD-020/AX-01 ; contrats → AX-01/02/03 ; erreurs → AX-05 et corrections AUD-005/008/016 ; concurrence → AX-02/03/AUD-021 ; données → AX-04 et corrections de persistance ; performance → AUD-022/AX-07 ; CAP/internationalisation → AX-08 ; qualité/exploitation/IA → AX-09.

Cette correspondance identifie les discussions/preuves manquantes, pas 13 nouvelles erreurs ni une garantie de conformité au cours. Sources pédagogiques : ARLA_Audit_Playbook §4 et ARLA_context ; supports originaux non relus dans cette passe.

## Vérifications et limites

Source relu : inscription, affectation, listes, schéma, UI, scripts/config et décisions. Observation supplémentaire : 8 cas de parsing sur deux déclarations extraites, pas HTTP/DB. SHA inchangé. Aucun build, CI, OCR réel, migration ou test de service exécuté ici. Provenance IA des défauts non vérifiée, aucun secret réel lu. Les scripts/mesures précédents restent disponibles sans être présentés comme des tests E2E.

Les quatre points ont désormais été discutés : AUD-019 conservé, AUD-020/021 retenus, AUD-022 sous condition de simplicité. Aucun quiz ajouté ; fichier grill_me supprimé non recréé. Les mentions de non-exécution ci-dessus décrivent la revue initiale ; voir les [preuves désormais exécutées](../mesures-et-preuves.md). [État de l'audit](status-and-changes-20261015.md) : incomplet tant que contrats et vérifications restantes ne sont pas réunis.

Vérification documentaire : 195 liens locaux contrôlés, aucune cible ni ancre manquante. Syntaxe du script d'observation vérifiée. Aucun diff sur src, scripts applicatifs, migrations, Makefile, README racine, manifest/lockfile ou Compose.
