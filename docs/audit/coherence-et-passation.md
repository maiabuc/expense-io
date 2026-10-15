# Cohérence des corrections et préparation de la passation

15 octobre 2026. Source relue : `265924bc7274047989e708ab635c2854d376230f`. Revue des décisions et de leurs interactions, sans modification applicative ni nouveau test runtime. [Décisions](DECISION_LOG.md), [classement](audit_issues_classified.md), [preuves exécutées](mesures-et-preuves.md).

## Conclusion de la revue

État de la revue initiale : les directions retenues peuvent fonctionner ensemble mais nécessitaient une spécification commune. Celle-ci est désormais rédigée dans les cinq références indexées dans le README ; les réserves restent explicites au fichier 5. Les manques principaux concernent les contrats communs, les migrations et l'ordre de mise en service. La lecture des axes d'architecture a été faite ; la conformité de l'architecture future reste à vérifier après réalisation.

Il faut distinguer trois situations : une tension réelle entre contraintes, une dépendance entre corrections compatibles, et une preuve encore absente. Les éléments ci-dessous ne créent pas automatiquement de nouvelles issues ou de nouvelles fonctionnalités.

## Interactions à verrouiller avant développement

| Corrections | Point concret et source originale | Ce qui doit être fixé dans le contrat commun |
| --- | --- | --- |
| AUD-003 + UI/compatibilité | `incomplete` et reprise acceptés, mais apparence/contrats à préserver. `src/app/expenses/page.tsx:30–41` traduit seulement trois états et affiche sinon le texte brut ; `src/domain/ExpenseNote.ts:1` ne connaît que trois états. | Tension réelle : si le nouvel état est exposé tel quel, il apparaît en anglais ; la reprise n'a pas encore de contrôle client défini. Fixer représentation API, visibilité dans les listes, total et interaction minimale de reprise. Ne pas promettre simultanément un état public nouveau et zéro changement observable. Apparence conservée ne signifie pas que cette interaction est déjà spécifiée. |
| AUD-003 + AUD-009 | La finalisation originale écrit hors contexte utilisateur (`src/app/api/expense-notes/route.ts:103–106`). Les politiques propriétaire ne donnent pas d'UPDATE (`migrations/1700000000001_init-schema.sql:42–68`). | Dépendance bloquante : ne pas rendre RLS effective avant que le compte applicatif, le contexte et le droit borné de finalisation fonctionnent ensemble. Le droit de compléter reçu/état ne doit pas permettre de modifier librement statut, propriétaire ou montant, ni de s'auto-approuver. RLS filtre les lignes ; elle ne suffit pas à limiter les colonnes modifiables. |
| AUD-003 + AUD-007 | Reprise/finalisation et décisions touchent le même état ; les décisions actuelles écrivent par ID (`src/app/api/manager/expense-notes/[id]/approve/route.ts:24–30`). | Définir toutes les transitions et leurs opérations atomiques. Une reprise ne remet jamais approved/rejected à pending ; incomplete n'est pas éligible à une décision. Fixer les réponses aux répétitions, conflits et résultats incertains. Le contrôle métier en mémoire ne remplace pas la condition SQL. |
| AUD-006 + AUD-020 + AUD-021 + G10 | Une seule route affecte le manager (`src/app/api/hr/users/[id]/manager/route.ts:12–51`) ; rôle, entreprise, corps et hiérarchie y sont liés. | Un flux d'affectation commun : valider le corps, autoriser l'acteur actuel, contrôler entreprise/rôle/cycle, écrire avec protection contre la concurrence. Le retrait explicitement null reste valide. Une lecture de chaîne suivie d'un UPDATE séparé peut laisser deux requêtes créer une boucle. Mécanisme exact encore proposé, pas choisi. |
| G10 + AUD-009 | Les politiques manager vérifient le rattachement sans vérifier explicitement le rôle actuel de l'acteur (`migrations/1700000000001_init-schema.sql:50–68`). | Les contrôles API et DB doivent exprimer la même matrice de droits actuels. Ne pas supposer qu'une relecture du rôle dans la route corrige automatiquement la politique DB. Garanties pour les actions déjà engagées à délimiter ; révocation instantanée et révocation des liens déjà émis non sélectionnées. |
| AUD-005 + AUD-008 + AUD-016 + AUD-020 | Chaque flux expose et consomme des erreurs ; l'OCR transforme une panne en résultat vide (`src/lib/ocr.ts:130–132`). | Un catalogue partagé : cas, HTTP, message public français, code interne et comportement UI. Préserver le champ error string. Distinguer saturation, timeout, échec, succès sans champs et panne réseau. Catalogue et statuts exacts restent à figer ; pas d'enveloppe API universelle ajoutée automatiquement. |
| AUD-014 + AUD-015 + G14 + compatibilité | Les contrôles deviennent plus stricts ; PostgreSQL et le formulaire acceptent actuellement des entrées différentes (`src/app/api/expense-notes/route.ts:69–85`). | Un tableau précis des entrées conservées/refusées. Préserver arrondi DB existant ; préciser espaces, bornes et représentation monétaire. Conserver yyyy-mm-dd, jour réel, règle future choisie. Formats du dépôt et OCR sont deux contrats distincts ; la détection du contenu ne signifie pas innocuité complète. |
| AUD-004 + compatibilité | La cible retient des options nommées ; le code original insère une expression de tri (`src/app/api/expense-notes/route.ts:42–47`). | Tension réelle de contrat : amount_desc et l'ancienne expression amount DESC ne sont pas la même entrée. Conserver le défaut ne prouve pas la compatibilité de tous les consommateurs. Inventorier les usages et tests avant de figer le contrat cible, sans rouvrir la décision de supprimer le SQL libre. |
| AUD-008 + exploitation | Pool sans file et 40 s acceptés ; le source charge le fichier puis crée son moteur (`src/app/api/expense-notes/receipt-suggestion/route.ts:12–19`, `src/lib/ocr.ts:118–128`). | Fixer taille d'entrée, nombre de moteurs, démarrage/arrêt, recyclage et refus quand occupé. Les 40 s portent sur le traitement choisi, pas automatiquement sur toute la requête ni l'ingestion mémoire. Borner un pool par processus ne fixe pas à lui seul une capacité globale sur plusieurs instances. Pas de file ajoutée. |
| AUD-013 + AUD-019 | Inscription par domaine conservée ; transaction entreprise/RH retenue (`src/app/actions/auth.ts:41–72`). | Compatible : la transaction protège la création partielle, pas la possession du domaine. Définir conflit d'inscriptions simultanées et résultat perdu ; connexion après commit, sans suppression du compte lors d'une panne de connexion. |
| AUD-018 + AUD-003 | Le seed doit récupérer une note existante (`scripts/seed.mjs:76–94`), tandis que le schéma et les états vont évoluer. | Garder le seed compatible avec le schéma cible, la clé durable et les états. Une réparation de reçu ne réinitialise pas une décision existante. Prévoir l'ordre de migration, sans réparer ou reclasser aveuglément les données locales. |
| AUD-022 + AUD-023 | Index expérimental sans gain HTTP démontré ; alertes de dépendances sans correction choisie. | Ne pas transformer les propositions en tâches de réalisation obligatoires. Optimisation uniquement si simple et utile ; dépendances à qualifier puis mise à jour compatible à sélectionner. Aucun downgrade automatique d'outillage. |

## Règles d'architecture : établies, à préciser et à vérifier

| Règle | État actuel | Preuve ou livrable manquant |
| --- | --- | --- |
| Monolithe conservé, hexagonal simple et progressif, premier flux soumission | Accepté dans ADR-0002 | Interfaces exactes et critères de fin du premier module ; la cible n'existe pas encore |
| Domaine et orchestration indépendants de Next.js, pg et SDK S3 | Accepté pour le module cible | Vérification des imports après extraction ; ne pas étendre cette promesse à toutes les routes existantes |
| Routes : adaptation HTTP ; module : orchestration/règles ; adaptateurs : SQL/S3 | Orientation acceptée | Préciser qui valide quoi, qui ouvre les transactions et comment les erreurs métier deviennent des réponses HTTP ; pas de dépendance HTTP remontant dans le domaine |
| Autorisation serveur et isolation par entreprise, rôle actuel et rattachement | Principes acceptés | Matrice action × rôle × entreprise × relation × état, puis tests positifs/négatifs ; permissions manager/RH restent distinctes |
| Écriture atomique des invariants et externalité de S3 | Accepté | Contrats de reprise, unicité, concurrence, finalisation et contraintes ; une transaction DB n'annule pas S3 |
| Formats monétaires, date calendaire, messages publics et erreurs internes | Directions acceptées | Contrats détaillés communs aux validations, API, UI et DB ; pas d'arrondi JS ajouté |
| Pas de microservices, file OCR, notification activée ou distribution pour illustrer le cours | Périmètre conservé | Justification des limites et hypothèses futures ; CAP multi-région n'est pas une fonctionnalité obligatoire à implémenter |
| Compatibilité et migration sans perte de données | Exigence retenue | Plan sur anciennes données, coexistence code/schéma, retour arrière et tests de migration ; ne pas supprimer un état utilisé pour revenir en arrière |
| Validation reproductible avant intégration | Principe et première campagne acquis | Suite navigateur de référence, assertions de correction, mesures OCR et contrôles de contrats ; CI pas implémentée |

Un port doit cacher une vraie responsabilité et servir les tests ou le changement de dépendance. Le choix d'une interface, d'un outil d'injection ou d'un helper partagé n'est pas automatiquement imposé par le nom « hexagonal ». Aucune centralisation générale manager/RH ou réécriture REST n'est sélectionnée.

## Livrables finis nécessaires pour passer aux équipes

1. **Contrats figés** pour les zones ci-dessus : entrées, sorties, erreurs, états, répétitions et compatibilité. Décrire les exceptions au comportement d'origine comme corrections ou règles choisies, pas comme refactorisation invisible.
2. **Matrice de permissions et transitions** unique, utilisée par API, SQL/RLS et tests. Enlever les divergences entre couches avant de multiplier les implémentations.
3. **Périmètre et dépendances** : responsabilités des modules et corrections à coordonner. Ce livrable remplace le plan de migration et de retour arrière, explicitement exclu par Maia le 15 octobre.
4. **Référence de validation** : parcours navigateur prioritaires, complément OCR/charge et frontières restantes. L'audit peut conserver des limites explicites ; les tests des corrections futures ne sont pas exigibles avant leur implémentation.
5. **Lots d'implémentation** : pour chacun, périmètre de fichiers, dépendances, invariants, critères d'acceptation, preuves attendues et personne responsable à attribuer par l'équipe. Les équipes ne doivent pas modifier indépendamment un même contrat ou une même migration.

## Ordre de travail proposé, pas nouveau périmètre accepté

| Lot | Résultat attendu | Dépendance principale |
| --- | --- | --- |
| 0 — Contrats et référence | Contrats communs, matrice, tests de référence et plan de migration | Avant les changements de comportement et les extractions |
| 1 — Erreurs et validations ciblées | AUD-005/014/015/G14/020 avec messages et contrats vérifiés | Contrats du lot 0 ; compatibilité des nouveaux refus |
| 2 — Identité et affectation | G10, AUD-006/021 ; corps valide et relations cohérentes | AUD-020 ; matrice de droits ; migrations préparées |
| 3 — Soumission et isolation | AUD-003/009 et adaptation seed AUD-018 ; module soumission simple | Compte DB, autorisation, états et reprise compatibles ; déploiement coordonné |
| 4 — Décision et inscription | AUD-007/013, séparés en changements ciblés | Matrice de droits/transitions ; aucune généralisation transactionnelle obligatoire |
| 5 — OCR | AUD-008/016, bornes et cycle de vie réellement vérifiés | Catalogue d'erreurs, mesures de capacité, UI de panne |
| Conditionnels / reportés | AUD-022, AUD-023 et clarification AUD-010 | Résultats, coût, choix de version et réponse du professeur |

Les lots décrivent des dépendances, pas une durée estimée ni un engagement à réaliser tous les sujets. Le tri AUD-004 et la date affichée AUD-017 peuvent être des correctifs ciblés après les contrats correspondants. Séparer les commits d'extraction structurelle, de correction et de formatage ; leur mise en service peut rester coordonnée. Une équipe peut préparer des tests en parallèle ; l'absence de conflit de fichiers ne prouve pas l'indépendance des contrats.

## Critère de clôture de l'audit

Le dossier de passation est prêt quand chaque chantier retenu indique **ce qui change, ce qui reste compatible, ses dépendances, ses règles et comment le vérifier**, sans choix métier caché laissé aux implémenteurs. Il n'est pas nécessaire d'avoir déjà implémenté les corrections pour clôturer l'audit. En revanche, dire que toutes les règles de la cible sont vérifiées serait inexact avant sa réalisation.

Cette revue n'approuve aucune proposition encore ouverte et ne réouvre pas les décisions acquises. Elle identifie les contrats et preuves à terminer avant une réalisation indépendante par plusieurs équipes.

## Actualisation de clôture — 15 octobre

Les cinq références de réalisation sont rédigées : contrats, permissions/transitions, périmètre/dépendances, validation, lots/acceptation. Le [fichier 5](05-lots-et-acceptation.md) fixe la portée de clôture documentaire et les réserves. Le plan de migration et de retour arrière est exclu à la demande de Maia ; il ne reste pas une condition de clôture. Les observations de manque ci-dessus décrivent la revue initiale et ne rouvrent pas les décisions.
