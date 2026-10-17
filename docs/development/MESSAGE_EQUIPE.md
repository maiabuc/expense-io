# Message pour l’équipe

Bonjour à tous,

La CI est fusionnée dans `main`. Nous allons réaliser les corrections de l’audit à quatre, avec une branche et une PR par spec. Voici la répartition :

| Personne | Specs à prendre | Contenu |
| --- | --- | --- |
| **A** | **SPEC-01, SPEC-02, SPEC-03, SPEC-12** | Erreurs API et logs, récupération UI après panne, pool OCR sans file avec arrêt réel à 40 s, qualification des dépendances |
| **B** | **SPEC-04, SPEC-05, SPEC-11** | Tri/montant/date/reçus et affichage, inscription entreprise + premier RH atomique, mesures et optimisation simple des listes si justifiée |
| **C** | **SPEC-06, SPEC-07, SPEC-08** | Droits selon rôle actuel, périmètres entreprise/manager, affectations sans cycle et décisions atomiques |
| **D** | **SPEC-09, SPEC-10** | Soumission récupérable, isolation RLS et module hexagonal simple, seed réparable sans doublon ni perte de décision |

Les fichiers sont dans `docs/specs/`. Commencez par `docs/specs/README.md` pour les dépendances, puis votre spec. SPEC-09 est plus lourde que les autres : B fournit les validations partagées et C relit les politiques DB de D. A/B se relisent ; D relit la concurrence de C.

Pour chaque spec :

1. Actualiser `main`, créer `feat/spec-xx` (exemple : `feat/spec-04`) et ouvrir une PR. Lire `docs/development/INSTRUCTIONS_IMPLEMENTATION.md`, la fiche AUD et les cinq références de passation. Noter le vrai SHA de départ.
2. Avant toute modification des fiches, capturer leurs préfixes avec `check-append-only.mjs capture`. Implémenter uniquement le périmètre retenu, en conservant fonctionnalités attendues, contrats API, commandes build/README et apparence des écrans. Messages et commentaires nouveaux en français.
3. Conserver les tests existants, ajouter ceux du nouveau mécanisme et garder l’ID AUD/G dans chaque test. Vérifier les succès, refus, pannes et concurrents pertinents ; utiliser uniquement DB/S3 de test isolés.
4. Compléter chaque fiche AUD concernée **en ajout uniquement** : ne modifier aucune ligne déjà présente, même une ancienne IMPLEMENTATION. Ajouter une entrée datée sous `## IMPLEMENTATION` indiquant ce qui a été réalisé, les fichiers/repères, le nouveau fonctionnement, les tests réellement exécutés, leurs résultats, le SHA et les limites. Actualiser aussi la spec et `docs/audit/DECISION_LOG.md`, puis vérifier les préfixes avec le snapshot initial.
5. Exécuter lint, types, unitaires, build, tests liés à toutes les issues du lot et suites API/navigateur complètes. Joindre les comptes réels et les preuves à la PR ; ne pas déclarer une issue corrigée uniquement parce qu’un test isolé est vert.
6. Faire relire, résoudre les conflits avec les autres specs, relancer les contrôles sur le code combiné, puis intégrer vers `main` quand la CI complète est verte.

**Point d’organisation proposé pour l’intégration :** la CI de départ est rouge sur les défauts à corriger. Nous proposons des PR de specs vers `feat/integration`, puis une PR commune vers `main` quand tous les contrôles requis sont verts. Ainsi, les quatre personnes peuvent avancer sans supprimer les tests rouges des autres lots. Cette organisation reste à confirmer ; elle ne change pas les assertions ni n’autorise des merges finaux rouges. Ouvrir une PR déclenche la CI ; un push seul sur `feat/spec-xx` ne suffit pas dans le workflow actuel.

**Ordre à respecter :** A publie SPEC-01, puis SPEC-02 ; C livre SPEC-06. B peut avancer sur SPEC-05 et prépare SPEC-04 ; intégrer SPEC-04 après les changements UI de SPEC-02. A branche ensuite SPEC-03 sur la validation de fichiers de B. D réalise SPEC-09 avec ces fondations ; C vérifie SPEC-08 avec le nouvel état incomplete et les droits DB. D termine SPEC-10 ; B mesure SPEC-11 après stabilisation. Les tests et la conception peuvent être préparés en parallèle dès le début.

Prévenez les autres avant de modifier un fichier partagé : particulièrement `expense-notes/route.ts`, `expenses/page.tsx`, les migrations et le lockfile. Une correction, une extraction et du formatage doivent rester des changements distincts. Les ajouts concurrents dans une fiche AUD doivent être conservés tous les deux, dans l’ordre.

SPEC-11 n’autorise qu’une optimisation simple justifiée ; SPEC-12 est une qualification, pas un `npm audit fix/force`. AUD-019 reste la convention de domaine actuelle ; AUD-010 attend le professeur. Aucun nouveau circuit métier, nouvelle file, refonte REST ou UI n’est prévu. Aucun test ne doit être supprimé, ignoré ou affaibli pour obtenir une CI verte.
