# CI-002 — Contrôles distincts par spec et revue des six PR

## Identification

Demande de Maia le 19 octobre 2026 : vérifier les six PR de G4BI2004 et voir un contrôle de spec identifiable dans GitHub. Base `73774862cb4f1b172d2b15bdbcb00c75b7cff6c6`, main propre au départ. Source d’audit `265924bc7274047989e708ab635c2854d376230f`. Issue de dispositif : AUD-011 ; aucun correctif applicatif ni merge des PR demandé dans ce lot.

## Problème et résultat attendu

Les étapes API/E2E actuelles mélangent plusieurs AUD et restent rouges tant que tous les lots ne sont pas corrigés. L’identifiant AUD dans les tests est nécessaire, mais il ne donne pas un contrôle GitHub distinct par spec. Plusieurs anciens contrôles du lot peuvent réussir alors que des frontières importantes ne sont pas testées.

Afficher `SPEC-01 — tests du lot`, jusqu’à SPEC-10, comme jobs séparés. Chaque job réutilise les résultats complets de la même révision, vérifie les cas qui lui appartiennent et sa couverture obligatoire. Une autre spec rouge ne rend pas automatiquement ce lot rouge. Les prérequis qualité/build restent exigés et le bilan global reste bloquant. SPEC-11/12 correspondent à des mesures et à une qualification humaines : les afficher comme `manual-review` dans la synthèse, sans inventer un test fonctionnel vert ni une suite ignorée.

## Contrats et périmètre

Conserver les titres et IDs AUD/G existants, les assertions, les suites complètes et les commandes originales. Ajouter une correspondance vérifiable entre specs, issues et cas. L’affectation AUD-006 distingue consultation et hiérarchie ; une spec peut dépendre de plusieurs AUD. Les nouveaux cas liés à ces AUD rejoignent la sélection automatiquement. Les cas minimaux obligatoires ne disparaissent pas simplement parce qu’un test a été omis.

Fichiers : workflowCI, scripts de catalogue/synthèse/contrôle, manifeste tests/specifications.json, tests du contrôleur et tests de frontières publiques, documentation et preuve de revue. Code applicatif, UI et branches des six auteurs préservés. Les fiches AUD restent en ajout uniquement ; seul AUD-011 reçoit l’implémentation du dispositif.

## Critères d’acceptation

| Critère | Contrôle |
| --- | --- |
| Un job distinct par spec fonctionnelle | Matrice GitHub SPEC-01…10 ; résultats par cas, AUD et spec |
| Pas de faux vert | Résultat absent/ignoré/dupliqué, mauvais SHA, prérequis en échec, erreur globale ou couverture obligatoire absente bloquent le job |
| Indépendance des lots | Un échec API/E2E d’une autre spec ne suffit pas à invalider les contrôles présents du lot ; le bilan global reste rouge |
| Portée explicite | SPEC-11/12 restent à revue/mesures humaines ; un vert automatique ne remplace jamais la revue du code |
| Régressions de frontières | Logs privés, petits montants, prototype du tri, grammaire/bornes décimales, messageOCR 503, compte conservé après échec de connexion testés |
| Revue source fixée | Six heads et base figés ; Standards/Spec séparés ; preuves exécutées distinguées de la lecture et des tests historiques |
| Documentation protégée | Snapshot avant travail et contrôle des 22 fiches ; ajout daté AUD-011, journal et guide actualisés |

## Validation et limites

Utiliser Node 24 et npm ci dans une copie isolée, puis tests du contrôleur, lint/types/build, API et navigateur avec servicesCI dédiés. Vérifier le workflow avec actionlint. Relire les résultats réels dans la preuve de campagne et l’ajout AUD-011. Au début de ce lot, aucune exécution nouvelle n’est acquise par cette spec.

Le choix de cas obligatoires opérationnalise les critères existants des SPEC-01…10 ; il n’autorise pas une nouvelle fonctionnalité. Certains cas de mécanismes futurs restent absents, donc le job est explicitement incomplet. Les noms peuvent être adaptés avec une justification et une revue, pas supprimés pour obtenir du vert. Les données des anciens runs de PR ne prouvent pas l’exécution des nouveaux tests.

Actualiser les branches de PR avec le main contenant ce dispositif pour que leur prochain run utilise les nouveaux jobs. Une relance d’un ancien workflow conserve son ancien code ; aucun head de PR n’est modifié dans ce lot.

## Résultats de réalisation

Le dispositif est implémenté et vérifié localement :200 cas,122 réussites/78 échecs/0 absent, tous les échecs de type correction sur main non corrigé. Les21 unitaires réussissent, lint/types/build et actionlint passent. Les tests de preuve du contrôleur couvrent ensemble le job et la synthèse. [Preuves et limites](../audit/evidence/ci-specs-20261019/README.md), [ajout AUD-011](../audit/solutions-to-audit/AUD-011-validation-isolee.md#implementation). Les branches des six PR restent intactes ; aucune de ces PR n’est fusionnée par cette réalisation.
