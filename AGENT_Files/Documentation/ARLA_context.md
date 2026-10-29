> Source historique de cadrage : les consignes restent des références de travail, mais les inventaires et étapes de préparation ci-dessous décrivent leur date initiale. Voir le [README courant](../../README.md) et le [statut des specs](../../docs/specs/README.md) pour les réalisations et validations intégrées.

# ARLA — Contexte et règles du projet

**Responsable :** Maia Bucamp, réalisation solo sous la condition indiquée ci-dessous.  
**Date de cadrage et de mise à jour :** 5 octobre 2026.  
**Échéance communiquée :** lundi 26 octobre 2026.  
**Statut :** cadrage enrichi par les précisions de Maia, avant audit complet et implémentation.  
**Dépôt pédagogique :** https://github.com/NathanPrats/expense-io  
**Référence consultée :** branche `main`, commit `265924bc7274047989e708ab635c2854d376230f`.

Ce document guide les prochains travaux de Maia et de Codex. Il distingue les consignes des professeurs, les règles demandées par Maia et les propositions de travail. Les propositions ne deviennent pas automatiquement des exigences pédagogiques.

## 1. Objectif et périmètre

Faire évoluer la codebase fournie pour le cours d’Architecture Logicielle : comprendre son fonctionnement, auditer son architecture, hiérarchiser les problèmes, puis mettre en œuvre des recommandations justifiées par le cours et les besoins d’Expense.io.

Les objectifs de Maia sont :

1. Respecter le barème et réunir les preuves nécessaires pour viser les meilleures notes.
2. Comprendre le code et pouvoir expliquer chaque changement. Privilégier des solutions simples.
3. Utiliser les concepts du cours pour prendre des décisions adaptées à ce projet.
4. Construire une CI fiable qui vérifie le format, les types, les règles métier, les API et les parcours utilisateurs.

La phase actuelle produit uniquement le cadrage. Elle ne constitue ni un audit exhaustif, ni une décision d’architecture définitive. Le dépôt pédagogique n’a pas été modifié et l’application n’a pas été exécutée pendant cette phase.

### Consignes explicites des professeurs

Le cours 2, slide 49, demande un **audit d’architecture logicielle**, suivi de refactorisations techniques fondées sur les concepts enseignés. Les exemples de facturation en clean architecture ou d’unification des échanges asynchrones illustrent des possibilités, sans imposer leur implémentation dans chaque projet.

La soutenance annoncée comporte :

- **15 minutes :** présentation de l’audit, avec justification des choix par le cours et la codebase.
- **15 minutes :** ajout d’une fonctionnalité en live avec assistance IA, explicitation des prompts et vérification de son intégration, si le temps le permet.

Le cours 3, slide 39, demande de **forker le dépôt** et de transmettre le lien du fork à Nathan Prats à `nathan.prats@epita.fr`. L’envoi reste à effectuer par Maia.

### Précisions communiquées par Maia le 5 octobre 2026

- **Échéance : lundi 26 octobre 2026.** Le mois et l’année sont interprétés dans le contexte de cette conversation. L’horaire et les modalités de dépôt ne sont pas encore précisés.
- **Solo :** le rendu peut être accepté « à condition que l’équipe ait bien compris ». Cette condition est conservée telle que communiquée. Ce document ne prétend pas qu’elle est déjà satisfaite et ne remplace pas cette formulation par une validation définitive.
- **Support de soutenance : PPTX**, présentant la compréhension de l’existant, les résultats de l’audit, les modifications techniques et leurs justifications à partir du cours. Les deux séquences durent chacune 15 minutes.
- **Live coding :** ajouter une nouvelle fonctionnalité dans l’application avec assistance IA, détailler les prompts et montrer une intégration cohérente. Préparer des moyens rapides de vérifier le résultat et sa compatibilité avec l’existant.
- **Tests :** il appartient au projet de déterminer les tests et de comprendre le code. L’absence de suite E2E dans le dépôt n’est donc plus une clarification bloquante : nous devons construire la suite de référence.
- **Contraintes :** préserver les fonctionnalités attendues. Conserver de préférence l’UI lorsqu’aucun besoin ne justifie sa modification. Les autres décisions techniques dépendent des résultats de l’audit.

Le livrable actuellement créé reste ce document Markdown. Le PPTX, les tests et les refactorisations constituent les travaux à venir.

## 2. Barème officiel sur 20

Source : image du barème fournie et cours 3, slide 38. Les cellules ci-dessous transcrivent les critères, avec normalisation de la ponctuation. Elles ne constituent pas une garantie de note.

| Critère | Maximum | Niveau maximal | Niveau intermédiaire | Niveau faible | Zéro |
| --- | ---: | --- | --- | --- | --- |
| Qualité de l’audit de code | 5 | Propositions techniques cohérentes avec les évolutions métiers futures d’Expense.io. Hiérarchie des problématiques claire et réfléchie. Rapports chiffrés. | **3–4 :** propositions majoritairement cohérentes malgré des imprécisions. Quelques chiffres plus ou moins bien employés. | **1–2 :** bonnes pratiques génériques sans remise en contexte du cas d’étude. | Contenu techniquement pauvre et hors sujet avec Expense.io. |
| Qualité de la présentation | 3 | Visuels clairs et compréhensibles. Langage adapté à une discussion avec un CTO. Positionnement d’architecte logiciel maîtrisé. | **2 :** visuels autoportants. Positionnement légèrement trop ou pas assez technique/haut niveau. | **1 :** présentation décousue. Positionnement à revoir. | Exercice non compris. |
| Qualité des réponses aux questions | 4 | Maîtrise des sujets au-delà du contenu présenté. Capacité à approfondir une notion présentée pendant l’audit. | **3 :** capacité à répondre aux questions dans le cadre de la présentation. | **1–2 :** justifications incomplètes ou partiellement fausses. | Incapacité à justifier les choix présentés. |
| Qualité de la phase de co-conception assistée par IA | 3 | Le résultat demandé fonctionne. La décision d’architecture d’intégration est bonne. L’outillage permet d’être serein. | **2 :** résultat fonctionnant plus ou moins. Décision critiquable. Outillage perfectible. | **1 :** intégration relevant davantage du vibe-coding que d’une décision architecturale. Absence de harnais de validation. | Exercice non compris. |
| Respect des contraintes techniques et qualité technique du projet | 5 | **100 % des tests E2E fonctionnent toujours.** Outillage qualitatif. Code propre, lisible et documenté pour un humain comme pour un LLM. | **3–4 :** quelques tests échouent. Code plus clair qu’avant l’audit, mais certaines parties restent à revoir. | **1–2 :** plus de 50 % des tests échouent. Changements et documentation peu maîtrisés. | Projet non modifié, ou modifié pour devenir encore moins performant. |

### Preuves à préparer pour viser le niveau maximal

| Critère | Preuves concrètes proposées |
| --- | --- |
| Audit, 5 points | Constats reliés à des fichiers et des comportements reproductibles. Priorités justifiées. Mesures avant/après. Lien entre recommandation et besoin métier. |
| Présentation, 3 points | Schéma de l’existant, schéma de la cible retenue, trajectoire de migration, recommandations et compromis compréhensibles pour un CTO. |
| Questions, 4 points | Pour chaque choix : problème traité, alternative envisagée, justification, limites et conditions qui feraient changer la décision. |
| IA, 3 points | Environnement prêt, instructions de projet, prompts précis, modifications ciblées, tests rapides puis validation de l’intégration. Répétition d’un exercice de 15 minutes. |
| Technique, 5 points | E2E de référence conservés, CI bloquante, code plus clair, documentation de démarrage et des choix, absence de régression mesurée. |

**Distinction essentielle :** 100 % des tests E2E réussis ne signifie pas 100 % de couverture du code. Aucun seuil officiel de couverture n’apparaît dans les sources fournies.

## 3. Produit pédagogique et code réellement présent

### Scénario du cours

Expense.io est présenté comme un SaaS B2B de gestion de notes de frais, initialement développé par un fondateur avec assistance IA. Le scénario explore l’ajout de rôles, l’isolation entre entreprises, le traitement automatisé, les lenteurs, l’asynchrone, l’internationalisation et la maintenance.

Ces étapes servent à raisonner sur les compromis. Elles ne prouvent pas que la codebase contient déjà tous ces composants. Une évolution future ne doit pas être ajoutée uniquement parce qu’elle apparaît dans une slide.

### État observé au 5 octobre 2026

| Élément | Observation vérifiée | Conséquence pour le cadrage |
| --- | --- | --- |
| Stack | Next.js `16.3.5`, React `19.2.8`, TypeScript, npm et `package-lock.json`. Le README demande Node.js 24+. | Conserver la stack au départ. Fixer les versions réellement utilisées pour rendre les mesures reproductibles. |
| Exécution locale | PostgreSQL 16 et LocalStack S3 via Docker Compose. `make dev` installe, prépare les services, migre, crée le bucket, peuple la base et lance l’application. | Réutiliser cet environnement et rendre sa préparation déterministe en CI. |
| Authentification | NextAuth/Auth.js figure dans les dépendances et le code. | Tester la connexion réelle dans les tests d’intégration et E2E. |
| Rôles | `employee`, `manager`, `hr_admin`. Validation/rejet par manager et par RH pour les managers racines. | Écrire une matrice de permissions conforme à ces rôles. Ne pas supposer un rôle finance déjà implémenté. |
| Notes de frais | États `pending`, `approved`, `rejected`, création avec reçu, historique, consultation de reçus. | Préserver les parcours et les transitions valides. |
| Extraction des reçus | `tesseract.js` et données de langue française locales dans `tessdata`. | Le traitement présent est un OCR local. Aucune intégration OpenAI n’est identifiée dans les fichiers examinés. |
| Organisation | Dossiers `domain`, `ports`, `adapters`, mais les routes consultées effectuent aussi directement des requêtes SQL. | Vérifier l’usage réel des abstractions avant de conclure à une architecture hexagonale. |
| Qualité | Scripts `lint`, `typecheck`, `build`, migrations et seed. | Réutiliser les commandes existantes avant d’introduire de nouveaux outils. |
| Tests et CI | Aucun fichier de test, configuration E2E ou workflow GitHub Actions identifié dans l’arborescence complète consultée. Aucun script `test` dans `package.json`. | Définir et créer les tests selon les précisions de Maia. Établir une suite E2E de référence avant les refactorisations, complétée par les tests métier, API et intégration. |

Le cadrage résulte d’une lecture du README, des configurations, de l’arborescence et de fichiers ciblés. Il ne prouve pas que les parcours fonctionnent ni qu’une vulnérabilité est exploitable. Ces conclusions demanderont une exécution et des tests.

## 4. Règles de travail pour Maia et Codex

### R1 — Priorité aux consignes et à la traçabilité

- Relier chaque chantier à un problème constaté, un concept du cours et une preuve attendue au barème.
- Distinguer systématiquement **fait observé**, **hypothèse**, **mesure** et **proposition**.
- Signaler toute nouvelle consigne qui contredit ce cadrage et mettre à jour le document.
- Ne jamais inventer un résultat de test, un benchmark, une fonctionnalité exigée ou une pondération.

### R2 — Comprendre avant de modifier

Avant une modification, expliquer le parcours concerné : entrée utilisateur, route/action, règle métier, accès aux données ou au stockage, résultat et erreurs possibles.

Chaque contribution doit être accompagnée d’une explication accessible : ce qui change, pourquoi, comment cela fonctionne et comment le vérifier. Maia doit pouvoir retracer le flux et justifier le code produit avec assistance IA.

Pour les changements structurants, ajouter une courte question de compréhension ou un exercice de reformulation. Une difficulté de compréhension doit conduire à clarifier ou simplifier la solution.

### R3 — Simplicité et périmètre limité

- Privilégier des fonctions courtes, des noms métier explicites et des dépendances peu nombreuses.
- Conserver le monolithe initial tant qu’un besoin démontré ne justifie pas une distribution.
- Introduire un port ou une abstraction lorsqu’il rend une dépendance remplaçable ou une règle métier testable.
- Éviter la généralisation pour des besoins hypothétiques, les couches répétitives et les changements de stack sans justification.
- Découper les travaux en changements petits et vérifiables. Séparer les reformattages massifs des refactorisations fonctionnelles.
- Choisir quelques recommandations solides à implémenter. Le nombre de technologies ajoutées n’est pas un objectif.

**Orientation proposée, à confirmer après audit :** évolution progressive vers un monolithe modulaire avec des frontières claires entre les routes, les cas d’usage métier et l’infrastructure.

### R4 — Préserver les comportements et les données

- Établir une référence fonctionnelle avant la première refactorisation.
- Définir nous-mêmes la suite de référence à partir de l’inventaire fonctionnel et des règles attendues, puis conserver ses assertions de non-régression. Conserver aussi toute suite fournie ultérieurement. Ne pas supprimer, ignorer ou affaiblir un test pour obtenir une CI verte.
- Distinguer les fonctionnalités attendues des défauts de l’existant : les tests de caractérisation décrivent le comportement initial, mais une faille ou une règle erronée doit être corrigée avec une justification et un test du comportement attendu.
- Si une consigne impose une évolution incompatible, documenter le changement et obtenir la clarification pédagogique nécessaire.
- Préserver les contrats consommés par l’interface, les formats, les statuts et les permissions, sauf changement explicitement justifié.
- Préparer les migrations et une procédure de retour à un état connu. Tester uniquement sur des données de démonstration isolées.

### R5 — Architecture adaptée aux contraintes

Pour chaque décision structurante, écrire un ADR court : contexte, options, décision, lien avec le cours, compromis, conséquences et validation. Deux options pertinentes peuvent suffire, dont la conservation de l’existant si elle est crédible.

Évaluer le bénéfice en tenant compte du travail solo, de l’échéance du 26 octobre, du coût et de la facilité d’exploitation. L’absence d’une architecture plus élaborée doit elle aussi être un choix argumenté. La stack et l’architecture initiales sont des points de départ, pas des contraintes pédagogiques imposées : tout changement doit découler de l’audit.

### R6 — Contrats d’API explicites

- Inventorier les routes existantes : méthode, chemin, authentification, autorisation, entrée, sortie, erreurs et effets de bord.
- Définir le contrat avant d’implémenter une nouvelle interface ou une évolution de contrat.
- Documenter les interfaces HTTP pertinentes en OpenAPI si ce choix est retenu, en distinguant JSON et `multipart/form-data`.
- Vérifier la conformité des réponses et la compatibilité du contrat dans les tests.
- Harmoniser progressivement les codes HTTP et les erreurs. L’adoption de Problem Details doit aussi adapter les consommateurs et préserver les contraintes d’évaluation.
- N’introduire REST, GraphQL, RPC ou gRPC qu’en réponse aux besoins du consommateur.

### R7 — Authentification, autorisation et isolation

Tester séparément l’identité, le rôle, le rattachement au manager et l’entreprise. Le contrôle visuel dans l’interface ne suffit pas : les règles doivent être appliquées côté serveur.

Utiliser au moins deux entreprises et plusieurs rôles dans les jeux de tests. Vérifier également les reçus et les URL signées. Inspecter les politiques RLS et le rôle PostgreSQL réellement utilisé : les commentaires et la présence de RLS ne garantissent pas à eux seuls l’isolation.

Les données et secrets de production ne doivent pas entrer dans les fixtures ou rapports CI. Les erreurs publiques doivent rester utiles sans exposer les détails internes.

### R8 — Assistance IA contrôlée

- Donner à l’IA un objectif précis, le périmètre de fichiers, les invariants et les critères d’acceptation.
- Demander un changement ciblé et son explication. Relire le diff avant intégration.
- Valider par des tests, y compris les effets sur les parcours existants.
- Documenter les décisions importantes et quelques prompts représentatifs pour préparer le live coding.
- Préparer des instructions de dépôt, par exemple `AGENTS.md`, cohérentes avec ce document. Ce fichier est un livrable futur proposé, pas un fichier déjà créé.
- Ne pas intégrer une solution que Maia ne peut pas expliquer. Aucun déploiement payant ou changement d’infrastructure n’est nécessaire au cadrage actuel.

### R9 — Fonctionnalités préservées et UI conservée par défaut

- Établir un catalogue des fonctionnalités attendues, avec rôles, parcours, permissions et critères d’acceptation.
- Relier ce catalogue aux tests. Les refactorisations doivent préserver ces fonctionnalités et corriger les défauts identifiés.
- Garder l’UI existante tant qu’un besoin fonctionnel, un problème constaté ou la fonctionnalité du live coding ne justifie pas sa modification.
- Si l’UI change, expliquer le besoin, limiter la modification à ce périmètre et adapter les tests concernés.
- Faire dépendre les choix de stack, de structure, de stockage et de communication de l’audit et des compromis. Préserver les interfaces consommées ou accompagner explicitement leur évolution.

## 5. Concepts du cours à mobiliser

| Concept et source | Application utile à Expense.io | Critère de décision |
| --- | --- | --- |
| Compromis et build vs buy, cours 2, slides 20 et 26 | Comparer simplicité, coût, temps et dépendances externes. | Choix relié à une contrainte réelle. |
| Découplage fonctionnel et monolithe modulaire, cours 2, slides 30–32 | Séparer les responsabilités de soumission, permissions et validation. | Réduire les duplications et faciliter une évolution métier. |
| Hexagonal/clean, cours 2, slides 44–48 | Isoler une règle métier du SQL, du stockage ou de l’OCR lorsque cela facilite les tests. | Inversion des dépendances réelle, sans multiplier les couches inutiles. |
| Asynchrone, cours 2, slides 33–40 | Étudier un traitement différé si les mesures montrent que l’OCR bloque les requêtes. | D’abord mesurer. Puis traiter suivi d’état, retries bornés, idempotence et traçabilité. DLQ seulement si une file est retenue. |
| CAP et internationalisation, cours 2, slides 41–42 | Expliquer les compromis si une cible distribuée est discutée. | Ne pas implémenter du multi-région sans exigence. En cas de partition, préciser le compromis entre cohérence et disponibilité. |
| API comme frontière, cours 3, slides 3–9 | Expliciter les contrats et distinguer interface et implémentation. | Consommateur identifié et contrat vérifiable. |
| Styles et API asynchrones, cours 3, slides 11–21 | Choisir des interfaces cohérentes. Si nécessaire, distinguer acceptation et fin du traitement. | Le style répond à l’usage. Un `202` ne signifie pas que le traitement a réussi. |
| Contract First et versionnement, cours 3, slides 23–24 | Définir les contrats et détecter les ruptures. | Migration explicite pour les consommateurs et tests concernés. |
| Authentification/autorisation, cours 3, slides 25–27 | Protéger les actions et les ressources selon identité, rôle et entreprise. | Tests de refus, autant que tests de succès. |
| Idempotence, cours 3, slides 28–29 | Vérifier les doubles appels et les décisions concurrentes. | Même état final après répétition, sans exiger une réponse identique. |
| Erreurs et codes HTTP, cours 3, slides 30–36 | Réponses cohérentes, exploitables par l’interface, sans fuite interne. | Contrat respecté et comportement utilisateur préservé. |

Les cours 4 et 5 sont annoncés dans le programme mais ne sont pas fournis. Actualiser ce cadrage après réception de leurs consignes.

## 6. CI proposée : fiable, reproductible et utile

Cette section est une **cible de conception**, pas une pipeline déjà implémentée. La meilleure CI pour ce projet est celle qui détecte les régressions importantes et reste rapide à comprendre et à utiliser.

### Déclenchements et règles

- Exécuter les contrôles sur les pull requests et les pushes vers la branche de rendu. Conserver un déclenchement manuel pour la démonstration.
- Utiliser une version Node.js 24 explicitement fixée et `npm ci` à partir du lockfile.
- Réutiliser PostgreSQL et LocalStack. Attendre des contrôles de disponibilité, puis appliquer migrations, préparation du bucket et fixtures.
- Utiliser un environnement et des données isolés par job ou par worker. Nettoyer même en cas d’échec.
- Paralléliser les contrôles indépendants. Éviter les collisions entre tests partageant la même base.
- Limiter les permissions GitHub Actions au nécessaire. Mettre en cache les téléchargements, sans conserver une base de tests d’un run précédent.
- Bloquer l’intégration sur les contrôles obligatoires. Prévoir un check final qui échoue si un job requis a échoué ou a été ignoré à tort.
- Conserver des rapports avec le commit testé. Une commande doit échouer lorsqu’aucun test attendu n’a été exécuté.

### Étapes et critères de réussite

| Étape | Contrôles | Résultat attendu |
| --- | --- | --- |
| 1. Installation | Installation verrouillée, environnement documenté. | Installation reproductible sur un runner neuf. |
| 2. Qualité statique | ESLint existant, `npm run typecheck`, vérification de format à ajouter après choix de la convention. | Aucun échec. Le job de format vérifie sans réécrire les fichiers. |
| 3. Tests unitaires | Règles d’approbation/rejet, validation des entrées, parsing des montants/dates et permissions extraites. | Tests rapides et déterministes, sans base ni réseau externe. |
| 4. Intégration | SQL et migrations sur PostgreSQL réel, stockage S3 sur LocalStack, persistance et erreurs d’infrastructure. | Les interactions réellement utilisées fonctionnent. Les migrations réussissent sur une base vide et, après évolution, depuis le schéma précédent. |
| 5. API HTTP et contrats | Appels au serveur lancé, authentification, permissions, entrées/sorties, codes HTTP, contrats documentés. | Succès et refus conformes. Les tests ne se limitent pas à des fonctions avec toutes les dépendances mockées. |
| 6. Build | `npm run build`, avec l’environnement nécessaire. | Build de production réussi, sans ignorer les erreurs de types. |
| 7. E2E | Suite de référence définie par le projet à partir des fonctionnalités attendues, contre l’application réellement démarrée, avec DB et stockage de test. | 100 % de cette suite passe après les refactorisations. Les nouvelles fonctionnalités disposent aussi de parcours de validation. |
| 8. Rapport final | Résultats, nombre de tests, couverture pertinente, logs, traces/captures en cas d’échec. | Preuves consultables et aucun faux succès dû à une suite vide ou ignorée. |

**Outillage proposé à confirmer :** GitHub Actions pour la CI, Vitest pour les tests unitaires/intégration et Playwright pour les API HTTP/E2E. ESLint et TypeScript sont déjà présents. Ajouter un formateur seulement après choix d’une convention cohérente avec le code. Aucun script de test futur n’est présenté comme existant.

### Scénarios prioritaires

| Domaine | Cas à vérifier |
| --- | --- |
| Authentification | Connexion valide/invalide, déconnexion, accès sans session. |
| Soumission | Création valide avec reçu, champs manquants, montant invalide, date invalide, type et taille de fichier. |
| Workflow | Approbation/rejet autorisés, état déjà décidé, double appel, décisions concurrentes, interdiction pour un rôle non autorisé. |
| Entreprises et managers | L’entreprise A ne lit ni ne modifie les notes/reçus de B. Un manager n’agit pas sur une personne hors de son périmètre. |
| Reçus | Upload, persistance de la référence, accès autorisé et refusé, échec du stockage, expiration du lien selon le contrat. |
| OCR | Extraction sur un petit reçu de référence, entrée non supportée, erreur du moteur, fichier trop volumineux, coût/durée bornés. |
| Cohérence | Une panne entre insertion SQL et upload ne laisse pas une note inutilisable sans état ou traitement explicite. |
| API | Tri et paramètres contrôlés, réponses conformes, erreurs sans stack publique, maintien du contrat consommé par l’interface. |

Garder des doubles de test pour provoquer les erreurs et vérifier rapidement les règles. Les compléter par une intégration réelle PostgreSQL/S3 et quelques parcours OCR réels. Si une API externe est ajoutée plus tard, utiliser des réponses déterministes en CI et un test réel séparé, volontaire et budgété.

Ne pas imposer arbitrairement 100 % de couverture. Mesurer la couverture des règles importantes et les branches d’erreur, puis décider d’un seuil utile après la référence initiale. Pour les E2E, le critère du barème reste la réussite de toute la suite de référence.

Prévoir une validation locale courte pour le live coding : types, tests du module modifié et test d’intégration concerné. La suite complète confirme ensuite l’absence de régression. Limiter les retries automatiques et conserver le premier échec pour rendre les tests instables visibles.

Un contrôle des dépendances et secrets peut compléter la CI après le socle fonctionnel. Classer les résultats applicables au projet et documenter les exceptions plutôt que rendre la pipeline inexploitable sur des alertes non qualifiées.

## 7. Premières pistes d’audit à vérifier

Ces pistes viennent de fichiers réellement lus. Leur priorité est **provisoire** : mesurer l’impact, reproduire les comportements et vérifier les protections avant de conclure.

| Priorité proposée | Observation | Vérification / évolution possible |
| --- | --- | --- |
| P0 | Le tri reçu par `GET /api/expense-notes` est interpolé dans `ORDER BY`. | Tester les paramètres inattendus et remplacer le SQL libre par une liste autorisée si le risque est confirmé. |
| P0 | `respondError` renvoie le message et la stack de l’exception au client. | Tester une erreur contrôlée. Séparer le détail interne du contrat public d’erreur. |
| P0 | Les politiques RLS RH consultées ne vérifient pas explicitement l’égalité des entreprises. Des routes ajoutent leur propre filtre. | Tester l’isolation à chaque frontière et vérifier les privilèges du compte DB. Ne pas conclure que la RLS ou les filtres suffisent. |
| P1 | Les routes d’approbation manager et RH répètent sélection, transition et sérialisation. Une entité `ExpenseNote` contient déjà des règles de décision. | Cartographier les usages, extraire un cas d’usage simple et vérifier les autorisations et accès atomiques. |
| P1 | La création insère la note, envoie le reçu à S3, puis met à jour sa référence dans des étapes distinctes. | Simuler l’échec du stockage et décider d’un mécanisme simple de compensation ou d’état intermédiaire. |
| P1 | La lecture puis la mise à jour d’un statut ne comportent pas de condition `pending` dans l’UPDATE consulté. | Tester deux décisions concurrentes et envisager une transition conditionnelle atomique. |
| P1 | L’OCR crée un worker par appel et ne limite pas la taille dans `suggestFields`. | Mesurer durée, ressources et comportement sur fichiers volumineux. Comparer une limite simple à un traitement différé. |
| P1 | Les routes consultées utilisent des codes d’erreur d’authentification/autorisation différents. | Inventorier les contrats et leurs consommateurs avant harmonisation. |

**Proposition de périmètre solo :** auditer l’ensemble, puis sélectionner deux ou trois chantiers cohérents selon les résultats. Une combinaison possible est : permissions/isolation, workflow de validation testable, fiabilité du traitement des reçus. La CI et les preuves accompagnent ces chantiers. La liste ne devient pas un engagement d’implémentation avant l’audit.

## 8. Mesures et preuves avant/après

Le barème demande des rapports chiffrés. Les produire à partir de mesures, en conservant la méthode et les résultats bruts.

| Mesure | Méthode proposée | Usage |
| --- | --- | --- |
| Fiabilité | Nombre de tests exécutés/réussis/échoués/ignorés, par niveau. | Prouver la non-régression et identifier les zones non couvertes. |
| Maintenabilité | Duplications et responsabilités dans les routes concernées, avant/après. | Montrer la simplification avec des exemples de code. |
| API/OCR | Latence médiane et p95 sous charge fixe, nombre de requêtes, erreurs et consommation de ressources si pertinente. | Justifier ou écarter une évolution asynchrone. |
| Cohérence | Scénarios de panne et concurrence, nombre de notes ou reçus incohérents observés. | Prouver le résultat d’une correction. |
| Expérience de développement | Temps de démarrage et durée de CI, installation sur un environnement neuf. | Préparer une démonstration et un live coding fiables. |

Comparer sur la même machine ou le même runner, avec les mêmes versions, données, reçus et conditions de charge. Distinguer démarrage à froid et exécution à chaud. Documenter les répétitions et limites. Ne pas annoncer de gain en pourcentage sans mesure comparable.

## 9. Trajectoire de travail et définition de terminé

| Étape | Résultat | Condition pour passer à la suite |
| --- | --- | --- |
| Cadrage actuel | Ce document, questions et hypothèses explicites. | Les inconnues bloquantes sont identifiées. |
| Référence initiale | Démarrage reproductible, inventaire fonctionnel/API, schéma de l’existant, résultats initiaux. | Les parcours et les E2E disponibles ont un état connu. |
| Audit | Constats, preuves, priorités et mesures. | Les recommandations répondent à des problèmes contextualisés. |
| Choix | Périmètre solo réaliste, ADR et trajectoire de migration. | Maia peut expliquer les alternatives et compromis. |
| Implémentation | Petites refactorisations, tests et CI progressivement renforcée. | Chaque changement satisfait sa définition de terminé. |
| Soutenance | Présentation de 15 minutes, annexes de preuve, entraînement aux questions et au live coding. | Démonstration reproductible depuis un état connu. |

Une modification est terminée lorsque :

- Son problème et son critère d’acceptation sont explicites.
- Maia comprend le parcours et les choix.
- Les tests pertinents et les contrôles obligatoires passent.
- Les contrats et les parcours existants restent compatibles, ou leur évolution est justifiée et autorisée par les contraintes applicables.
- Les erreurs et permissions concernées sont vérifiées.
- La documentation et, si nécessaire, l’ADR sont à jour.
- Le résultat avant/après dispose d’une preuve. Aucune dette importante créée par le changement n’est cachée.

### Calendrier de travail proposé jusqu’au 26 octobre

Ce calendrier est une proposition d’organisation, à ajuster au temps disponible. Les décisions d’architecture restent conditionnées par les résultats de l’audit.

| Période | Objectif | Livrables de travail proposés |
| --- | --- | --- |
| 5–9 octobre | Comprendre et établir la référence. | Démarrage reproductible, carte des flux, catalogue fonctionnel, premières mesures et premiers tests de référence. |
| 10–14 octobre | Terminer l’audit et choisir les chantiers. | Constats hiérarchisés, ADR, périmètre réaliste, suite E2E de référence et première CI. |
| 15–21 octobre | Implémenter progressivement et vérifier. | Refactorisations ciblées, CI complète sur le périmètre retenu, preuves avant/après et documentation. |
| 22–25 octobre | Préparer la soutenance. | PPTX, répétition de l’audit en 15 minutes, entraînement aux questions et exercice de live coding en 15 minutes. |
| Lundi 26 octobre | Échéance communiquée. | Version finale du code, rapports et support prêts selon les modalités de remise. |

## 10. Clarifications reçues et points restants

### Questions résolues par les précisions de Maia

| Sujet | Réponse retenue |
| --- | --- |
| Date | Lundi 26 octobre 2026. |
| Solo | Peut être accepté « à condition que l’équipe ait bien compris ». Condition à respecter, sans affirmer qu’elle est déjà satisfaite. |
| Soutenance | PPTX de compréhension, audit et modifications, 15 minutes. Puis ajout d’une fonctionnalité en live avec IA et prompts détaillés, 15 minutes. |
| Responsabilité des tests | À nous de les déterminer et de comprendre le code. Construire la suite de référence puis prouver la non-régression. |
| Contraintes | Fonctionnalités à respecter. Préférence pour préserver l’UI. Les autres choix dépendent de l’audit. |

### Points non bloquants pour commencer l’audit

- Quel temps Maia peut-elle consacrer au projet chaque semaine ?
- Quels sont l’horaire et le canal de remise du 26 octobre ?
- Quelles évolutions métiers futures sont imposées pour contextualiser l’audit ? Sinon, quelles hypothèses les professeurs souhaitent-ils voir discuter ?
- La fonctionnalité du live coding sera-t-elle révélée le jour même ? Quels outils, accès réseau et modèles seront autorisés ?
- Une démonstration locale suffit-elle, ou un hébergement est-il demandé ?

**Hypothèses provisoires :** commencer avec la stack existante, travailler et démontrer en local, éviter les services payants et ne pas déployer de cible distribuée avant justification. Ces choix restent révisables après audit. L’échéance communiquée est le 26 octobre 2026. Aucun budget, horaire de remise ou accord définitif sur le solo n’est inventé.

## 11. Points importants ajoutés au cadrage initial

Les quatre objectifs de Maia sont pertinents. Les compléments nécessaires sont :

- Une référence de départ pour savoir ce qui fonctionne et préserver le comportement.
- Une matrice de permissions et des tests entre entreprises, essentiels pour ce SaaS B2B.
- Une méthode de mesure pour les rapports chiffrés demandés au barème.
- Des choix documentés et des alternatives pour les questions à l’oral.
- Une préparation spécifique au live coding assisté par IA, qui représente 3 points.
- Un périmètre solo limité et progressif, permettant de terminer et de maîtriser les évolutions.
- La création de notre propre suite de référence, conformément à la précision de Maia, et sa conservation pendant les refactorisations.
- La conservation de l’UI par défaut et la préparation du PPTX pour le 26 octobre.

## 12. Sources et entretien du document

Sources utilisées :

- `Cours 1 & 2 ARLA 2026.pptx` : rôle de l’architecte et ADR, principes, étude de cas, compromis, KISS, consignes de projet et soutenance.
- `ARLA 2026 Cours 3.pptx` : contrats, styles d’API, sécurité, idempotence, erreurs, barème et consigne de fork.
- `image.png` : barème fourni, concordant avec le cours 3, slide 38.
- Précisions de Maia du 5 octobre 2026 : échéance, condition du solo, PPTX et live coding, responsabilité de définir les tests, contraintes fonctionnelles et préférence de conserver l’UI.
- [Dépôt au commit de référence](https://github.com/NathanPrats/expense-io/tree/265924bc7274047989e708ab635c2854d376230f) : README, `package.json`, Makefile, Docker Compose, arborescence, routes de notes et d’approbation, domaine `ExpenseNote`, DB, migration, OCR, stockage et erreurs.

Actualiser ce document après chaque nouvelle consigne pédagogique, décision de périmètre ou évolution d’architecture. Conserver le commit de départ et dater les décisions. Un nouveau cours doit enrichir les règles seulement après lecture de son contenu.

### Journal initial

| Date | Décision / état | Motif |
| --- | --- | --- |
| 2026-10-05 | Cadrage uniquement. | Demande actuelle de Maia. |
| 2026-10-05 | Simplicité et compréhension prioritaires. | Préférence de Maia, KISS dans le cours et maîtrise exigée à l’oral. |
| 2026-10-05 | CI progressive, avec tests de non-régression et preuves. | Barème technique et préparation de la phase IA. |
| 2026-10-05 | Architecture cible et chantiers laissés à l’état de propositions. | Les décisions techniques dépendent de l’audit, selon la précision de Maia. |
| 2026-10-05 | Échéance fixée au lundi 26 octobre 2026. | Date communiquée par Maia, interprétée dans le mois de la conversation. |
| 2026-10-05 | Rendu solo possible sous condition que l’équipe ait bien compris. | Formulation de Maia, conservée sans présumer la condition satisfaite. |
| 2026-10-05 | Suite de tests à définir par le projet. | Responsabilité clarifiée par Maia. L’absence de suite initiale n’est plus bloquante. |
| 2026-10-05 | Fonctionnalités préservées et UI conservée par défaut. | Contraintes et préférence communiquées par Maia. |
| 2026-10-05 | PPTX et entraînement aux deux séquences de 15 minutes prévus. | Format de soutenance confirmé par Maia. |
