# Revue du contenu des fiches de solutions

14 octobre 2026. Source du code initial : `265924bc7274047989e708ab635c2854d376230f`. Périmètre : **21 fiches** dans `solutions-to-audit/`, relues pour répondre au format demandé par Maia. Cette revue vérifie la qualité documentaire ; elle n'est ni un test de l'application ni une preuve de maîtrise indépendante de Maia.

## Critères demandés

Chaque fiche doit expliquer : **le problème repéré**, **pourquoi il compte**, **sa localisation dans le code original avec SHA et lignes**, **le fonctionnement original**, puis **le fonctionnement retenu ou proposé**. Une sixième colonne vérifie la présence de la **validation prévue et des limites de preuve**.

« Présent » signifie que l'information est expliquée dans le texte, même lorsque plusieurs critères partagent une section. Un numéro de ligne et un titre seuls ne suffisent pas. Il n'est pas nécessaire de réorganiser toutes les fiches pour obtenir des titres identiques.

Le dossier conserve trois exceptions de nature, sans inventer une correction : AUD-010 est reporté avec alternative non sélectionnée ; AUD-011 décrit l'isolation des essais, pas un bug applicatif ; AUD-019 conserve une convention et explique pourquoi le fonctionnement reste identique. AUD-022 expose une hypothèse de coût et une optimisation conditionnelle, sans annoncer une lenteur mesurée.

## Résultat par fiche

| Fiche | Problème | Pourquoi | SHA / fichier / lignes | Fonctionnement original | Fonctionnement proposé / conservé | Validation et limites |
| --- | --- | --- | --- | --- | --- | --- |
| [AUD-003](solutions-to-audit/AUD-003-receipt-consistency.md) | Présent : soumission partielle / doublon | Présent : note ou reçu incomplet | Présent | Présent : insert, commit, upload, référence | Présent : incomplete, clé stable, reprise et finalisation | Présent : pannes, concurrence, migration, compatibilité |
| [AUD-004](solutions-to-audit/AUD-004-sort-input.md) | Présent : entrée libre dans SQL | Présent : structure contrôlée par client | Présent | Présent : interpolation après ORDER BY | Présent : options fixes et rejet avant SQL | Présent : consommateurs, tris et exploitabilité distincte |
| [AUD-005](solutions-to-audit/AUD-005-public-errors.md) | Présent : détails internes publics | Présent : feedback et confidentialité | Présent | Présent : message/stack, HTTP 500, lecture UI | Présent : message sûr, diagnostic interne | Présent : erreur HTTP contrôlée, catalogue encore ouvert |
| [AUD-006](solutions-to-audit/AUD-006-manager-receipt-authorisation.md) | Présent : deux frontières manager | Présent : accès et relation hors périmètre | Présent pour reçu et affectation | Présent : requêtes, lien, référence manager | Présent : recherche bornée, contrôle API et contrainte DB | Présent : A/B, rôles, droits DB, null, concurrence |
| [AUD-007](solutions-to-audit/AUD-007-decision-concurrency.md) | Présent : décision écrasable | Présent : lecture devenue ancienne | Présent | Présent : lire, contrôler, écrire par ID | Présent : UPDATE pending atomique | Présent : courses réelles et réponses encore ouvertes |
| [AUD-008](solutions-to-audit/AUD-008-ocr-resource-bounds.md) | Présent : bornage et panne cachée | Présent : ressources et résultat trompeur | Présent | Présent : buffer, moteur par appel, catch vide | Présent : pool sans file, 40 s, erreurs distinctes | Présent : arrêt réel, tailles, CPU/RAM, formats |
| [AUD-009](solutions-to-audit/AUD-009-database-company-isolation.md) | Présent : politiques et finalisation | Présent : entreprise et droit légitime | Présent pour les deux volets | Présent : politiques, contexte transactionnel et update | Présent : entreprise, compte RLS, finalisation bornée | Présent : compte réel, positifs/négatifs, auto-approbation |
| [AUD-010](solutions-to-audit/AUD-010-authentication-secret.md) | Présent : secret dans source | Présent : confiance dans les sessions | Présent, valeur omise | Présent : constante donnée à l'auth | Présent : alternative environnement privée, non sélectionnée | Présent : clarification professeur et effets de rotation |
| [AUD-011](solutions-to-audit/AUD-011-validation-isolee.md) | Présent : validation sur cible partagée | Présent : préserver données/services | Présent | Présent : commandes migration/seed configurées | Présent : base et stockage de test séparés | Présent : cibles, fixtures et protocole |
| [AUD-013](solutions-to-audit/AUD-013-signup-consistency.md) | Présent : inscription partielle | Présent : premier RH manquant | Présent | Présent : appels indépendants puis connexion | Présent : transaction commune, connexion après commit | Présent : rollback, reprise, concurrence |
| [AUD-014](solutions-to-audit/AUD-014-validation-montant.md) | Présent : préfixe accepté | Présent : API contournant le front | Présent | Présent : parseFloat, contrôles et numeric(10,2) | Présent : chaîne entière, point/virgule, arrondi préservé | Présent : cas invalides, stockage, bornes ouvertes |
| [AUD-015](solutions-to-audit/AUD-015-validation-date.md) | Présent : contrôle incomplet / règle future choisie | Présent : jour réel et horloge fiable | Présent | Présent : chaîne, HTML date et OCR | Présent : format existant et Europe/Paris | Présent : bissextile/minuit et compatibilité du futur |
| [AUD-016](solutions-to-audit/AUD-016-erreurs-reseau-ui.md) | Présent : état UI après rejet réseau | Présent : action bloquée / reprise incertaine | Présent | Présent : fetch puis libération sans finally | Présent : catch/finally, saisie conservée | Présent : neuf chemins, mocks distingués du navigateur |
| [AUD-017](solutions-to-audit/AUD-017-affichage-date.md) | Présent : jour décalé | Présent : préserver la date de dépense | Présent | Présent : date seule convertie en instant local | Présent : restitution du même jour | Présent : trois fuseaux et vérification navigateur prévue |
| [AUD-018](solutions-to-audit/AUD-018-reprise-seed.md) | Présent : reçu incomplet ignoré | Présent : préparation relançable | Présent | Présent : retour anticipé avant vérification reçu | Présent : compléter la même note | Présent : panne, reprise et objets/lignes |
| [AUD-019](solutions-to-audit/AUD-019-inscription-domaine.md) | Présent : confiance dans domaine déclaré | Présent : déclaration ≠ appartenance | Présent | Présent : domaine, entreprise et premier RH | Présent : fonctionnement conservé, aucun nouveau parcours | Présent : source uniquement, limite pédagogique assumée |
| [AUD-020](solutions-to-audit/AUD-020-validation-affectation.md) | Présent : entrée invalide devient retrait | Présent : mutation involontaire | Présent | Présent : JSON fallback puis null | Présent : erreurs différenciées, null explicite valide | Présent : huit parsing vs absence de mutation testée |
| [AUD-021](solutions-to-audit/AUD-021-boucles-managers.md) | Présent : cycles indirects | Présent : hiérarchie sans racine | Présent | Présent : auto-affectation seule bloquée | Présent : parcours des supérieurs et atomisation à préciser | Présent : cycles courts/longs, concurrence et positifs |
| [AUD-022](solutions-to-audit/AUD-022-optimisation-simple-listes.md) | Présent : volume sans borne | Présent : coût possible, non mesuré | Présent | Présent : listes complètes, total client | Présent : index candidats sous condition de simplicité | Présent : plans/coût/équivalence ; pagination non choisie |
| [G10](solutions-to-audit/G10-droits-role-actuel.md) | Présent : rôle de session ancien | Présent : nouveaux accès selon droits actuels | Présent | Présent : copie token/session, contrôle route | Présent : relire rôle DB, identité session conservée | Présent : changement rôle/session, frontières de révocation |
| [G14](solutions-to-audit/G14-controle-recus.md) | Présent : type annoncé seul | Présent : faux format possible | Présent | Présent : contrôle type/taille puis stockage | Présent : detection par octets avant création | Présent : vrais/faux formats, limites signature et compatibilité |

**Bilan documentaire : 21/21 fiches contiennent les cinq informations minimales et un volet de validation.** Ce nombre n'est pas un résultat de tests fonctionnels. Aucune fiche ne doit être lue comme un engagement de solution finalisée lorsque son contrat ou mécanisme reste ouvert.

Contrôle complémentaire sur les 21 fiches et ce rapport : SHA présent dans 21/21 fiches ; 81 liens locaux contrôlés, aucune cible absente ; aucune référence `#L...` au-delà des lignes du fichier ciblé. Les sections Markdown et le sens des localisations ont été relus ; ce contrôle de liens ne valide pas le comportement de ces sources.

## Corrections documentaires réalisées

Traduction en français de AUD-004, AUD-006, AUD-007, AUD-009 et AUD-010, avec suppression des tables anglaises redondantes en ouverture. Conservation des IDs, SHA, sources, directions acceptées, alternatives, compromis et limites. Les identifiants techniques SQL/API restent inchangés. Les graphes conservés ont leurs explications en français.

Ajout dans G14 d'une explication explicite du problème initial : type déclaré par l'appelant et faux PDF possible, sans assimilation à une exécution malveillante démontrée. Le complément français AUD-009 sur la finalisation bornée est conservé, notamment l'interdiction d'un droit UPDATE propriétaire général.

Aucun code applicatif, contrat, commande, donnée ou service modifié par cette revue. Aucun secret reproduit. Les mesures parallèles sont consignées par l'agent qui les exécute, puis doivent être reliées aux fiches concernées ; cette revue de format ne leur attribue pas de résultats anticipés.

## Pour défendre le dossier

Les fiches permettent d'expliquer l'écart entre fonctionnement initial et cible retenue, puis la preuve attendue. Le [classement](audit_issues_classified.md) évite de présenter conventions, choix architecturaux et hypothèses comme des bugs confirmés. Le [journal](DECISION_LOG.md) distingue accepté, reporté et non implémenté. Le [protocole](evidence/runtime-protocol.md) et les rapports de mesures servent à dire ce qui a réellement été exécuté.

La qualité du format ne suffit pas à clore l'audit : les preuves runtime, les blocages et la compatibilité doivent rester explicites dans la synthèse. Elle ne suffit pas non plus à affirmer que Maia sait défendre seule tous les mécanismes ; seuls ses explications et exercices réellement observés peuvent établir ce point.

## Complément après la campagne

Une 22e fiche, [AUD-023](solutions-to-audit/AUD-023-dependances.md), est ajoutée après le contrôle de dépendances. Elle explique version signalée, manifest/lockfile et lignes, installation originale, risque conditionnel, proposition ciblée et validation ; aucune mise à jour sélectionnée. Les fiches concernées sont reliées au rapport runtime. Les 21/21 ci-dessus décrivent le contrôle initial, avant cette nouvelle fiche.
