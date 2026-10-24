# Processus d'audit suivi

> Rapport historique de la phase d’audit : ses chiffres et états sont datés. Pour les réalisations intégrées, lire le [journal actuel](DECISION_LOG.md) et les derniers ajouts IMPLEMENTATION des fiches AUD.

Mise à jour : 14 octobre 2026. Code original : `265924bc7274047989e708ab635c2854d376230f`. L'objectif est de relier un problème concret à une correction proportionnée, puis à une preuve reproductible. Les décisions de correction ne sont pas encore des corrections implémentées.

## 1. Fixer le cadre et la référence

Nous avons lu les consignes et le barème, vérifié le fork et fixé le SHA source. Nous avons conservé le code, les commandes du README, l'interface et les services locaux. Les consignes du cours sont séparées des préférences de Maia et des hypothèses de l'agent. [Baseline](baseline.md), [contexte](../../AGENT_Files/Documentation/ARLA_context.md), [playbook](../../AGENT_Files/Documentation/ARLA_Audit_Playbook.md).

## 2. Suivre les parcours du produit

Nous avons suivi les acteurs employé, manager et RH : saisie → appel serveur → identité et droits → règle métier → SQL/stockage/OCR → réponse → affichage. La soumission a notamment révélé que l'insertion SQL, l'upload et la référence du reçu sont des étapes distinctes. Nous avons aussi comparé les contrôles entre routes au lieu de supposer que la liste affichée protège un appel direct. [Architecture](architecture.md), [inventaire API](api-inventory.md).

## 3. Inspecter les axes d'architecture

La revue a couvert responsabilités, dépendances, permissions, contrats, erreurs, concurrence, cohérence, performance, exploitation et scénarios futurs. Le comptage des imports a montré que les dossiers domaine/ports/adaptateurs ne suffisent pas à constituer une architecture hexagonale utilisée. Les commentaires ont été comparés au code : leur présence n'est pas une preuve d'erreur ou de provenance IA. [Structure](architecture.md), [commentaires](comment-review.md), [décisions consolidées](DECISION_LOG.md).

## 4. Distinguer les preuves et décider

Chaque point distingue OBSERVATION du source, HYPOTHÈSE de conséquence, PROPOSITION de correction et MEASUREMENT exécutée. Les décisions ont été discutées une par une en français, avec exemples simplifiés lorsque nécessaire. Un accord sur une solution n'a pas été enregistré comme une preuve de maîtrise indépendante. Les choix, alternatives et limites sont conservés dans [le journal](DECISION_LOG.md), les [solutions](README.md) et les [ADR](../adr/README.md).

Le premier passage a été complété par les commentaires et les axes structurels, puis par AUD-019 à AUD-022. Une convention d'inscription a été conservée ; les boucles sont désormais interdites ; l'optimisation des listes est conditionnée à sa simplicité. Le secret reste reporté au professeur. Le classement sépare les vrais enjeux des dossiers de processus et des évolutions conditionnelles : [issues classées](audit_issues_classified.md). La [revue API](api-standardisation-review.md) examine une standardisation sans présumer qu'un renommage REST résout les défauts.

## 5. Exécuter les contrôles sur une copie isolée

Maia a explicitement demandé de commencer les mesures le 14 octobre. Le source a été extrait via git archive dans `/tmp/expense-io-audit-20261014`. Les dépendances existantes ont d'abord été utilisées pour lint/types, puis copiées pour ne pas modifier le checkout. Cela ne vaut pas preuve d'une installation propre depuis le lockfile.

Les services d'audit utilisent un projet Docker distinct, PostgreSQL sur 15433 et S3 sur 14567, avec credentials fictifs et bucket séparé. Les services utilisateur sur 5433/4567 n'ont été ni migrés, ni peuplés, ni arrêtés. Les fixtures initiales contiennent deux entreprises, dix comptes de plusieurs rôles et six notes. Les comptes, sessions et secrets réels ne figurent pas dans les preuves.

Lint et TypeScript passent. Les migrations et la préparation du bucket passent après levée des restrictions d'accès local du sandbox. Les premiers builds ont échoué dans l'environnement hôte (polices puis port interne Turbopack) ; leur échec est conservé, puis le build réussit dans le conteneur Node 24. Installation propre et contrôles finaux lint/types/build passent également. La campagne comporte 47 vérifications de scénarios, 26 conformes et 21 écarts, sans navigateur. Les résultats finaux et limites sont consignés dans [la campagne de mesures](mesures-et-preuves.md), sans confondre contrôle HTTP/SQL et test navigateur.

## 6. Critères de clôture et suite

La clôture demande : constats sourcés, classification/priorités justifiées, solutions décrivant original et proposition, résultats bruts et reproductibles, contrats et trajectoire de migration pour les chantiers retenus, limites explicites. Une liste de fichiers lus ou quelques contrôles réussis ne prouvent pas tous les comportements.

Restent distincts : clôture de l'audit, implémentation, validation de non-régression et préparation de soutenance. Les mesures après correction et les tests de la cible hexagonale seront réalisés après implémentation. Les tests externes du professeur ne sont pas fournis ; aucune réussite n'est affirmée à leur place. L'audit peut délimiter ses angles morts, mais ne doit pas les présenter comme vérifiés.

## Clôture documentaire du périmètre — 15 octobre

À la demande de Maia, création des cinq références de passation indexées dans le README et exclusion du plan de migration/retour arrière. Les précisions techniques rendent les décisions exécutables : contrats, matrice de droits/transitions, responsabilités/dépendances, contrôles et lots. Le [bilan de clôture](05-lots-et-acceptation.md) conserve les réserves de tests/professeur/OCR/compte DB et distingue cette clôture documentaire d’une validation runtime exhaustive ou de corrections livrées. Aucun nouveau test exécuté par la rédaction.
