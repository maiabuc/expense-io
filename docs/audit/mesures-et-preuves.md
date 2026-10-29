# Mesures et preuves sur le code original

Campagne du 14 octobre 2026. SHA : `265924bc7274047989e708ab635c2854d376230f`. Aucune correction applicative réalisée. [Harnais](evidence/runtime-campaign.mjs), [résultats principaux](evidence/runtime-20261014/campaign.json), [pannes](evidence/runtime-20261014/storage-failure.json), [fixtures](evidence/runtime-20261014/fixtures.json).

## Environnement et méthode

Source extrait par git archive dans `/tmp/expense-io-audit-20261014`. Node hôte 24.6.0/npm 11.5.1 ; build et serveur dans `node:24-bookworm-slim`, Node 24.21.0/npm 11.19.0, image téléchargée avec digest `sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20`. Next 16.3.5, React 19.2.8. PostgreSQL 16.15, image `postgres:16-alpine` déjà présente ; LocalStack 3.8.1. Les images historiques ne sont pas présentées comme des tags immuables.

Projet Docker `expense-audit-20261014`, ports 15433/14567 pour DB/S3 et 13400/13401 pour les serveurs. [Configuration des services](evidence/runtime-20261014/audit-compose.yml). Deux entreprises, dix comptes (RH, managers racine/subordonné, employés rattaché/non rattaché), six notes initiales et un PNG de référence. Les essais ajoutent des notes ; le scénario seed crée séparément une troisième entreprise fictive. Aucun accès au .env utilisateur, aucune écriture sur ses services 5433/4567.

Les sessions sont obtenues par le vrai parcours HTTP Credentials avec CSRF et cookies ; ces données privées ne sont pas sauvegardées. La soumission positive est vérifiée via HTTP, ligne PostgreSQL et objet S3 réel. Les manipulations de rôle/relations et les pannes ciblent exclusivement les fixtures.

## Contrôles de préparation

| Contrôle exécuté | Résultat | Portée / limite |
| --- | --- | --- |
| npm run lint, dépendances déjà installées | 0 erreur, exit 0, 7,728 s | Copie source et dépendances existantes ; pas preuve d'installation propre |
| npm run typecheck, dépendances déjà installées | Exit 0, 6,279 s | TypeScript, sans validation métier ou navigateur |
| npm run build sur hôte | Échec : téléchargement des polices dans sandbox, puis port interne Turbopack refusé même après relance autorisée | Limite de l'environnement d'exécution ; pas une preuve de défaut du produit |
| Même npm run build en conteneur Node 24 | Exit 0 ; compilation 7,1 s, types 5,2 s, génération 13/13 pages | Durées des étapes affichées par Next, pas durée totale ; dépendances initialement copiées |
| npm ci en copie séparée et conteneur Node 24 | Exit 0 ; 449 packages ajoutés, 450 audités en 39 s selon npm | npm 11.19 signale deux scripts d'installation non autorisés par sa politique ; aucun contournement appliqué |
| npm run migrate:up sur base isolée | Exit 0, migration initiale appliquée | Premier essai sandbox EPERM, relance autorisée réussie ; pas de migration utilisateur |
| npm run ensure-bucket sur S3 isolé | Exit 0, bucket dédié créé | Premier essai sandbox EPERM ; relance réussie |
| npm run start de la copie construite | Démarrage annoncé en 208 ms, puis HTTP/auth/DB/S3 exécutés | Pas test d'interaction navigateur ; seconde instance de panne en 153 ms |
| Préparation fixtures | 3 vérifications réussies : 2 entreprises, 10 utilisateurs, 6 notes | Contrôles de préparation, séparés des scénarios |

**Contrôles finaux avec dépendances issues du npm ci : lint=0, typecheck=0, build=0.** [Résumé](evidence/runtime-20261014/summary.json), [lint](evidence/runtime-20261014/clean-lint.log), [types](evidence/runtime-20261014/typecheck.json), [build](evidence/runtime-20261014/clean-build.log). Les erreurs de déplacement liées à la propriété root des fichiers Docker ont nécessité une correction dans /tmp ; un essai intermédiaire sans node_modules a échoué `next: not found`, sans être attribué au code applicatif.

## Résultats des scénarios

**47 vérifications de scénarios : 26 conformes à l'attendu, 21 écarts.** Ce sont des assertions du harnais, pas 47 tests E2E indépendants : un parcours peut avoir plusieurs assertions. Les trois contrôles de fixtures sont comptés séparément. Les 20 requêtes de mesure des listes et trois appels OCR sont également consignés ; leur latence ne constitue pas un contrôle navigateur.

Les attentes incluent des corrections choisies et une règle ajoutée pendant l'audit (date future). Un écart ne prouve donc pas automatiquement une régression de la fonction d'origine. Aucun test du professeur n'a été exécuté. Les contrôles ne sont ni ignorés ni affaiblis pour obtenir un succès.

| Issue | Observation exécutée | Conclusion limitée |
| --- | --- | --- |
| AUD-003 | Bucket absent → POST 500 ; note persistée pending avec clé vide | Panne partielle note/reçu reproduite ; réponse perdue, doublons et reprise cible non testés |
| AUD-004 | Tri inexistant → 500, au lieu du rejet contrôlé 400 choisi | Validation absente reproduite ; aucun exploit destructif ou injection avancée exécuté |
| AUD-005 | Date invalide et panne stockage renvoient une stack publique | Fuite de détails techniques reproduite ; aucun secret réel collecté |
| AUD-006 | Manager A obtient 200 pour reçus d'employé non rattaché et de B ; affectation manager B à employé A acceptée 200 | Frontières API non protégées reproduites avec configuration d'origine reconstituée ; un lien signé autorisé ouvre le PNG réel |
| AUD-007 | Deux transactions reproduisent SELECT/contrôle/UPDATE du source : première approved puis deuxième rejected | Écrasement SQL reproduit avec lectures chevauchées ; pas deux requêtes HTTP synchronisées |
| AUD-008 | Image corrompue → HTTP 200 avec suggestion vide après échec moteur | Panne confondue avec succès vide reproduite ; ni saturation, ni coût maximal, ni arrêt à 40 s mesurés |
| AUD-009 | Compte Docker expense : superuser=true, bypassrls=true ; compte de test non privilégié : RH-A lit note de manager racine B et finalisation sans contexte modifie 0 ligne | Contournement de RLS dans configuration reconstituée et insuffisance des politiques reproduits séparément ; privilèges des services utilisateur inconnus |
| AUD-014 | 12abc → 201 ; 1,2 persisté/retourné comme 1 | Validation et normalisation manquantes reproduites |
| AUD-015 | Date impossible → 500 ; date 2099-01-01 → 201 | Erreur de validation contrôlée absente ; refus du futur reste règle nouvellement choisie, pas exigence initiale prouvée |
| AUD-018 | Seed échoue sur bucket absent ; relance sort avec 0 mais note employé garde clé vide | Reprise incomplète reproduite ; ne pas confondre commande réussie et données complètes |
| AUD-020 | JSON cassé → 200 et manager_id devient null | Mutation involontaire reproduite via HTTP et DB |
| AUD-021 | Manager racine A affecté à son subordonné → 200 | Boucle à deux managers reproduite ; boucle longue et concurrence non testées |
| G10 | Rôle manager rétrogradé en DB, session conservée → liste manager toujours 200 | Rôle de session obsolète reproduit sur nouvelle requête |
| G14 | Texte arbitraire déclaré image/png → 201 | Confiance dans type annoncé reproduite ; innocuité ou antivirus hors preuve |

Contrôles positifs : connexions correctes, refus de mot de passe incorrect, refus anonymes, listes propriétaire/manager/RH bornées dans les fixtures normales, refus propriétaire/RH interentreprises, création valide avec montant/date/statut SQL et objet S3, retrait explicite null, approbation puis conflit séquentiel 409. Les détails figurent dans les résultats bruts ; le total de 26 inclut aussi les contrôles de panne attendue.

## Listes : index expérimental et volume

10 000 notes ajoutées au même propriétaire ; réponse de **10 007 notes**, **2 620 680 octets**. Dix appels HTTP séquentiels avant et dix après un index temporaire `(user_id, created_at DESC)`. Aucune modification du source ou de ses migrations ; l'index a été supprimé après mesure. Les données sont volontairement concentrées chez un propriétaire : ce n'est pas une distribution représentative de toutes les entreprises.

| Mesure | Avant index | Après index expérimental |
| --- | ---: | ---: |
| Plan SQL observé | Sort | Index Scan |
| Execution Time EXPLAIN ANALYZE, une exécution | 4,176 ms | 2,981 ms |
| HTTP médiane, n=10 | 142,94 ms | 145,08 ms |
| HTTP p95 empirique, n=10 | 200,57 ms | 285,63 ms |
| Notes et taille de réponse | 10 007 / 2 620 680 octets | 10 007 / 2 620 680 octets |

Le p95 utilise le rang supérieur ceil(0,95×n), donc le maximum pour dix appels. Échantillon petit, pas de concurrence, ordre avant/puis après et cache non contrôlé : aucune causalité ni amélioration HTTP démontrée. L'index évite le tri SQL sur cet essai mais ne réduit pas le transfert/rendu ; le navigateur et le coût d'écriture ne sont pas mesurés. AUD-022 reste une optimisation conditionnelle, sans promesse de gain.

## OCR : observations limitées

Un appel par cas : PNG 1×1 → environ 764 ms, image corrompue → 367 ms et succès vide, PDF non supporté → 10 ms et succès vide. Tous HTTP 200. Ces trois valeurs ne sont ni médiane/p95 représentatifs, ni comparaison froid/chaud : le source crée un nouveau moteur pour chaque image supportée. Aucun texte utile attendu dans le PNG ; cette preuve ne valide pas la qualité d'extraction. Capacité, RAM/CPU sous charge, gros fichiers et timeout restent ouverts.

## Dépendances et angles morts

npm audit renvoie exit 1 et **8 packages signalés : 7 high, 1 critical**. Ce compte n'est pas huit vulnérabilités applicatives démontrées ; plusieurs packages héritent de la même alerte. [Rapport brut](evidence/runtime-20261014/audit-dependencies.json), [qualification AUD-023](solutions-to-audit/AUD-023-dependances.md). Aucun npm audit fix ni mise à jour automatique effectué.

Non exécutés : navigateur/UI réel et E2E de référence ; inscription/rollback/concurrence ; replay/clé stable ; décision HTTP concurrente ; cycle long/concurrent ; migration/rollback de la cible ; OCR volume/ressources/arrêt ; expiration réelle des liens ; tests externes du professeur. AUD-016 et AUD-017 conservent leurs preuves isolées antérieures, sans validation navigateur ajoutée.

**État de la campagne initiale : audit alors non clos.** Les cinq fichiers de passation permettent désormais une clôture documentaire bornée, voir [le bilan](05-lots-et-acceptation.md). Preuves runtime acquises et limites restantes explicites. Aucune validation de correction n'est annoncée avant implémentation. Le [processus](processus-audit.md) et le [classement](audit_issues_classified.md) servent à présenter une démarche justifiée, pas une maîtrise personnelle inférée.

Montage de l’expérience : une sauvegarde de dépendances sous la racine a pollué un contrôle intermédiaire. Elle a été déplacée hors périmètre avant relance, sans modifier tsconfig ou exclure le vrai code. Cet échec ne caractérise pas le produit.

Nettoyage : deux serveurs d’audit arrêtés, deux conteneurs DB/S3 et réseau dédiés supprimés. Copies /tmp et image Node téléchargée conservées. Aucun nettoyage de services utilisateur ; volumes anonymes éventuels non réputés supprimés sans inventaire.

Les statuts précis du harnais constituent des attendus de contrôle proposés quand le contrat n’est pas encore figé ; les effets sur les données sont vérifiés séparément. Aucun volume portant le label du projet d’audit n’est listé après nettoyage. Vérification finale : seuls les deux conteneurs utilisateur expense-io-postgres-1 et expense-io-localstack-1 restent actifs sur leurs ports initiaux.
