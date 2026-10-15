# Coverage ledger

Read = inspected source; traced = followed caller to dependencies; executed = runtime call; tested = checked expected outcome; measured = recorded protocol results. Le tableau initial décrit la phase source ; la [campagne du 14 octobre](mesures-et-preuves.md) ajoute HTTP/auth/SQL/S3/OCR et contrôles propres, sans navigateur. Les lignes d'actualisation ci-dessous font foi pour le périmètre exécuté.

| Surface | Read | Traced | Executed / tested / measured | Remaining |
| --- | --- | --- | --- | --- |
| Git/instructions/environment versions | Yes | Base verified live | Version/Git command evidence only | Installed packages and Docker availability |
| Submission UI and POST | Yes, relevant sections | Yes, source only | No / no / no | Real auth, receipt upload, persistence, failure |
| Own list/receipt | Yes | Caller identified | No / no / no | Sort and access refusals |
| OCR | Yes | UI/route/worker | No / no / no | Bounded file cases, latency, engine behavior |
| Auth/signup | Yes | Partial | No / no / no | Login/logout, concurrent signup, session trust |
| Manager and HR lists/approve | Yes | Caller identified | No / no / no | Learner walkthrough, actual roles, races |
| Manager and HR reject | Targeted sections only | Caller identified | No / no / no | Full parity review |
| Receipt routes / directory / assignment | Yes | Caller identified | No / no / no | Cross-company and unrelated-manager cases |
| DB/migration/storage/domain/ports | Yes | Submission dependencies | No / no / no | Database privileges and effective RLS |
| Notification adapter/port | Lecture complète et imports relus | Aucun consommateur applicatif identifié | No / no / no | Ne pas activer de notification pour démontrer l'architecture |
| Seed/bucket scripts | Source relu le 14 octobre | Seed insertion/upload/réessai et boucle bucket | No / no / no | Panne seed et récupération à reproduire en isolation ; jamais exécutés sur services actuels |
| Layout/pages/styles/format/validators | Partial or inventory only | No | No / no / no | Broad survey and expected UI behavior |
| Dependency lock/build config | Manifest and inventory only | No | No / no / no | Clean install and existing checks |
| Commentaires src et contexte | 12 groupes dans 10 fichiers ; 41 fichiers inventoriés | Chaque groupe comparé au code et aux constats | Lecture et observations isolées seulement | [Revue](comment-review.md) ; pas une couverture exhaustive des 41 fichiers |
| États UI lors d'erreur réseau | 9 handlers/loaders et consommateurs | Oui, par source | 18 exécutions extraites avec mocks / pas de navigateur / observations enregistrées | AUD-016 : 9 succès et 9 pannes ; React non monté |
| Affichage de date selon fuseau | 3 écrans et helper | Chaîne DB → Date → formatter | Expression isolée dans 3 fuseaux / pas de navigateur / affichages enregistrés | AUD-017 : 14 octobre devient 13 à Los Angeles ; helper sans consommateur trouvé |
| Structure domaine/ports/adaptateurs/routes | 40 fichiers TS/TSX inventoriés par imports, modules et routes critiques relus | 91 imports ; 14 routes dont 12 vers DB, aucune route vers le domaine/adaptateurs | Analyse statique / pas de test de cible / comptage enregistré | [Cible validée, non implémentée](structure-review.md), migration et baseline en attente |

No percentage of behavioral coverage claimed. [API inventory](api-inventory.md) tracks individual routes. Learning checkpoint: not assessed; no answer recorded.

## Actualisation runtime — 14 octobre

| Surface | Exécution acquise | Reste non vérifié |
| --- | --- | --- |
| Installation / lint / types / build / démarrage | npm ci puis lint/types/build réussis ; serveur production en Node 24 | Hôte restreint ; CI pas construite ; après correction à vérifier |
| Authentification | Credentials HTTP/CSRF, sessions correctes/incorrectes ; rôle rétrogradé avec session conservée | Inscription, secret, navigateur/logout |
| Soumission et reçus | HTTP valide + SQL + S3 ; montant/date/faux type ; panne upload | Reprise/clé stable/lost response et compatibilité future |
| Permissions | Listes A/B ; reçus propriétaire/manager/RH ; affectation interentreprises et retrait null | Toutes variantes/rôles/états et expiration |
| Affectation | JSON cassé modifie DB ; boucle à deux acceptée | Boucle longue et concurrence |
| Décision | Approbation HTTP puis conflit séquentiel ; écrasement SQL à lectures chevauchées | Course HTTP et parité manager/RH complète |
| RLS | Compte Docker reconstitué superuser ; rôle limité pour politiques/finalisation | Compte utilisateur réel et migrations futures |
| OCR | Trois appels : minuscule/corrompu/PDF ; panne renvoyée comme succès | Extraction, gros fichiers, charge/CPU/RAM et arrêt 40 s |
| Seed | Panne puis reprise, exit 0 mais reçu manquant | Correction et autres frontières |
| Volume | 20 appels, 10 000 notes ajoutées, EXPLAIN et index expérimental supprimé | Distribution réaliste, concurrence, navigateur et écritures |
| Dépendances | npm audit : huit packages signalés ; qualification initiale AUD-023 | Applicabilité complète et mises à jour compatibles |

47 vérifications de scénarios : 26 conformes, 21 écarts ; 3 contrôles de fixtures séparés. Aucun test navigateur ni du professeur. Aucun pourcentage de couverture comportementale calculé.
