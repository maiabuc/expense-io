> Archive de préparation : ce document décrit sa révision datée, pas l’état actuel du produit. Voir [l’index courant](../README.md).

# Changements retenus et état réel de l'audit

État actuel, 15 octobre : [dossier de passation documentaire finalisé](../05-lots-et-acceptation.md), cinq fichiers de référence produits. Les bilans antérieurs ci-dessous décrivent les étapes ; les réserves restent explicites. Aucun correctif applicatif livré. Plan de migration/retour arrière exclu par demande de Maia.

15 octobre 2026. Source : `265924bc7274047989e708ab635c2854d376230f`. Aucune correction applicative implémentée. Décisions et preuves : [journal](../DECISION_LOG.md), [couverture](../coverage.md), [solutions](../README.md).

## Liste des corrections retenues

| Changement | Référence | Préparation / limites |
| --- | --- | --- |
| Limiter l'accès aux reçus au périmètre manager et entreprise ; vérifier l'entreprise du manager affecté dans l'API et en DB | AUD-006 | SQL, contrainte, migration et tests A/B à préparer |
| Relire le rôle actuel à chaque requête protégée | G10 | Inventorier les routes, conserver identité authentifiée et périmètres |
| Corriger les politiques RLS d'entreprise et le compte DB ; finaliser la soumission sous contexte utilisateur avec droits limités | AUD-009 | Vérifier compte réel, politiques cumulées et finalisation légitime sans auto-approbation |
| Soumission incomplete, reçu vérifié, reprise explicite sur la même note et passage pending après finalisation ; identifiant stable contre doublons | AUD-003 | Migration, identité persistée, reprise/lost-response, contrats et compatibilité fonctionnelle à préparer |
| Approbation/rejet atomique par UPDATE conditionnel pending, sans écraser une décision | AUD-007 | Conserver autorisation ; réponses répétées/conflits et concurrence à tester |
| Tri via options fixes insensibles à la casse ; valeur inconnue rejetée avant SQL | AUD-004 | Préserver tris légitimes et comportement sans paramètre |
| Message public compréhensible, code technique/diagnostics dans les logs internes ; pas de stack ni message DB brut public | AUD-005 | Contrats/codes exacts à préparer, champ error compatible, erreurs API anglaises standard admises |
| Pool OCR sans file, 40 s max de traitement, message si occupé ; distinguer succès vide et panne | AUD-008 | Arrêt réel, tailles/capacité à mesurer ; formats formellement acceptés uniquement |
| Créer entreprise et premier RH dans une transaction ; connexion automatique après commit | AUD-013 | Même connexion, rollback et concurrence ; préserver entreprise existante |
| Validation serveur complète du montant ; point/virgule unique ; arrondi du stockage conservé | AUD-014 | Espaces, bornes et représentation à préparer ; pas d'arrondi JS nouveau |
| Valider format date existant, jour réel et absence de date future ; aujourd'hui selon horloge serveur Europe/Paris | AUD-015 | Restriction future absente du code : compatibilité à clarifier avant changement |
| Vérifier format du reçu depuis les octets, avant création/stockage | G14 | Bibliothèque à choisir ; formats/taille conservés ; pas de garantie d'innocuité complète |
| Gérer les erreurs réseau UI et libérer les indicateurs en finally ; saisie conservée, pas de retry automatique d'écriture | AUD-016 | Neuf chemins mesurés isolément, trois lectures de reçus supplémentaires relevées ; navigateur à vérifier |
| Afficher la date calendaire sans glissement de jour selon le fuseau | AUD-017 | Trois écrans ; conserver affichage français et données |
| Récupérer le reçu manquant sur la même note de démonstration au réessai du seed | AUD-018 | Panne/reprise reproduites en isolation : commande réussie mais reçu manquant ; correction à tester |

La validation isolée avec deux entreprises et plusieurs rôles (AUD-011) est retenue comme dispositif de preuve. Elle précède les changements structurants ; ne pas modifier les données/services actuels. Les commandes build/README et l'apparence UI restent inchangées.

## Propositions, reports et compatibilité

Architecture hexagonale simple et progressive validée ; premier module de soumission préparé dans la [revue](../structure-review.md), [ADR accepté](../../adr/0002-hexagonal-soumission.md). Les détails techniques et vérifications préalables restent à réaliser. Conserver le monolithe et les technologies ; pas de refonte générale, notifications ou queue ajoutées. Le choix précédent de non-centralisation des permissions manager/RH n'est pas remplacé automatiquement.

Secret d'authentification (AUD-010) : reporté ; [question au professeur](../questions-professeur.md). Formats OCR : préserver ceux formellement acceptés ; la source formelle reste à confirmer si elle n'est pas fournie. Révocation immédiate de liens déjà délivrés : aucun chantier sélectionné ; cinq minutes actuelles documentées et recommandées.

Compatibilité fonctionnelle pas encore démontrée : l'état incomplete et sa reprise, les entrées désormais rejetées et notamment la date future changent certains résultats observables. Les décisions de correction sont retenues, mais elles ne prouvent pas leur conformité aux tests du professeur. Définir les fonctions attendues et les contrats avant implémentation, sans réécrire les tests pour accepter arbitrairement une régression.

## Couverture des axes d'architecture du playbook

Source pédagogique de cette matrice : ARLA_Audit_Playbook §4 et ARLA_context ; supports originaux non relus dans cette passe. « Abordé » signifie discuté/inspecté, pas terminé ou validé.

| Axe | Ce qui a été abordé | Ce qui manque pour clôturer l'audit sur cet axe |
| --- | --- | --- |
| Contraintes et compromis | Solo, échéance, UI/commandes préservées, alternatives | Priorités proposées dans le classement ; lots, dépendances et effort à préciser |
| Responsabilités et décisions | Cartographie source, journal, deux ADR acceptés | Synthèse existant/cible, cohérence des décisions et coûts ; dates/statuts exacts |
| Découpage fonctionnel | Soumission, permissions, décisions manager/RH et monolithe | Interfaces et responsabilités de la cible à figer ; bénéfice d'extraction à démontrer |
| Hexagonal/clean | 40 fichiers TS/TSX, 91 imports, 12 des 14 routes vers DB, domaine/adaptateurs non raccordés | Cible simple acceptée ; référence fonctionnelle et interfaces à préciser ; vérifier inversion réelle et tests via interfaces après refactor |
| Identité, permissions, isolation | Rôle actuel, reçu manager, affectation, RLS | Compte Docker reconstitué et plusieurs accès A/B testés ; matrice complète, parité et cible à vérifier ; secret reporté |
| Interfaces API et styles | Routes/consommateurs inventoriés, HTTP actuel conservé | Contrats détaillés d'entrées/sorties/erreurs et vérification de tous les consommateurs |
| Contrats et compatibilité | Préservation demandée, risques incomplete/reprise identifiés | Catalogue fonctionnel attendu, contrats de référence et tests professeur non inspectés ; OpenAPI non imposé |
| Erreurs et diagnostics | Frontière public/interne, UI réseau, échec OCR | Fuite publique reproduite ; catalogue de codes/logs et contrats futurs à figer ; corrélation facultative |
| Répétition et concurrence | Identifiant demande et décision pending atomique | Lost-response, retries et opérations concurrentes sur vraie DB ; contrats de refus exacts |
| Cohérence des données | DB/S3, signup atomique, seed, montant/date | Pannes upload/seed reproduites ; inscription, contraintes, migrations, anciennes données et rollback restent à préparer |
| Performance et asynchrone | Pool OCR, durée max et rejet de file | Mesures comparables latence/CPU/RAM, tailles, saturation et lifecycle ; 40 s est un choix, pas une mesure |
| CAP et internationalisation | Fuseaux/date, monolithe conservé, géographie hors scope | Justifier l'applicabilité ou la non-applicabilité des scénarios distribués ; expliciter hypothèses monnaie/région sans ajouter de fonctions |
| Qualité, exploitation et assistance IA | Données isolées, règles agents, scripts et plan de preuve | Installation/build/lint/types/startup acquis ; suite navigateur, CI, qualification des dépendances et préparation live coding restent ouverts |

Les grands thèmes ont été couverts à des degrés différents. Ils ne sont pas tous évalués en profondeur et plusieurs n'ont encore que des hypothèses/plans. On ne peut pas conclure « tous les points évalués correctement » à partir du grill ou de l'inventaire de fichiers.

## Preuves déjà acquises et preuves manquantes

Acquis : SHA identifié ; lecture de parcours/commentaires ; comptage des imports ; observations isolées UI/date ; installation propre, lint/types/build et démarrage réussis ; 47 vérifications de scénarios HTTP/SQL/S3/OCR (26 conformes, 21 écarts), plus 3 contrôles de fixtures ; 20 mesures HTTP de listes et un index expérimental supprimé. [Résultats et limites](../mesures-et-preuves.md).

À terminer : référence navigateur, matrice de permissions complète, contrats communs de reprise/décision/erreurs, plan de migration et retour arrière, inscription et autres frontières, capacité OCR et qualification des dépendances. Les tests du professeur ne sont pas fournis. Ni pourcentage de couverture comportementale ni réussite des corrections ne sont inférés. Le [bilan de cohérence et passation](../coherence-et-passation.md) distingue les tensions de contrat, les dépendances entre corrections et les règles de cible encore non vérifiées.

## Suite recommandée

Terminer l'audit par les preuves/contrats et une synthèse des priorités, puis préparer une trajectoire limitée à des chantiers cohérents : accès/isolation, cohérence du workflow, fiabilité OCR. Conserver toutes les corrections retenues au registre, sans les présenter comme un engagement de tout implémenter simultanément. Une extraction structurelle reste séparée des corrections et du formatage. Aucun nouveau quiz demandé dans ce bilan ; explication du flux à reprendre ultérieurement avant refactor structurant.

## Actualisation après campagne du 14–15 octobre

[Processus suivi](../processus-audit.md), [classement et priorités](../audit_issues_classified.md), [revue API](../api-standardisation-review.md), [preuves](../mesures-et-preuves.md). Installation propre, lint/types/build réussis ; 47 vérifications de scénarios, 26 conformes et 21 écarts ; services d’audit nettoyés. AUD-019 convention conservée, AUD-020/021 retenus, AUD-022 optimisation si simple sans gain HTTP démontré. Nouvelle alerte AUD-023 sur dépendances, qualification et correction non sélectionnées. Audit encore non clos : navigateur/E2E, capacité OCR, contrats de reprise/décision, migrations et plusieurs frontières restent ouverts ; secret reporté. Les tableaux antérieurs décrivent l’état de préparation et ne doivent pas annuler ces preuves actuelles.

## Passation aux équipes — 15 octobre

[Revue croisée des corrections](../coherence-et-passation.md) : points d’intégration, règles d’architecture, cinq livrables finis et ordre de lots proposé. Les principales tensions sont incomplete/reprise face à la compatibilité UI/API et options de tri nommées face aux anciennes expressions. RLS/finalisation, décisions/reprise, rôle/affectation et erreurs/OCR/UI sont des dépendances à coordonner, pas des choix opposés. Aucun nouveau mécanisme sélectionné par cette revue.