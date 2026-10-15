# Revue des commentaires et de leur contexte

14 octobre 2026. Source : `265924bc7274047989e708ab635c2854d376230f`. Audit uniquement ; aucun code applicatif, donnée ou service modifié. L'ancien tracker de grill reste supprimé.

## Conclusion et périmètre

Non, l'audit précédent n'avait pas identifié tous les points relevés par cette passe. L'affirmation précédente portait sur les problèmes déjà recensés, pas sur une preuve d'exhaustivité. Cette passe ajoute deux comportements reproduits sur code isolé (AUD-016 et AUD-017) et un risque de récupération du seed observé au source (AUD-018). Elle complète aussi AUD-008/AUD-009.

HYPOTHÈSE fournie : les commentaires signaleraient des erreurs introduites avec l'IA. L'intention du professeur n'est pas vérifiée ici. La règle « chaque commentaire implique une erreur » n'est pas établie : plusieurs commentaires décrivent correctement le code. Les commentaires sont des pistes de lecture, pas des preuves d'incident.

MEASUREMENT d'inventaire : 41 fichiers suivis sous src inventoriés ; 12 groupes de commentaires trouvés dans 10 fichiers, puis leur contexte relu. Cette mesure ne signifie pas que les 41 fichiers ont tous été audités fonctionnellement. Les commentaires de migration, seed, préparation bucket, Makefile, ESLint et Compose ont aussi été lus comme contexte opérationnel. [Inventaire exact](evidence/comment-audit/inventaire.json).

## Tous les groupes de commentaires sous src

| Commentaire au SHA source | Vérification | Rattachement / conclusion |
| --- | --- | --- |
| `src/app/api/expense-notes/route.ts:39–41` | La distinction valeur/identifiant SQL n'autorise pas à concaténer le tri reçu | AUD-004 déjà recensé |
| `src/app/api/hr/users/[id]/manager/route.ts:35–38` | L'annuaire UI ne garantit pas l'entreprise d'un manager transmis directement à l'API | AUD-006 déjà recensé |
| `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:14–16` | Un appel direct contourne le passage préalable par la liste | AUD-006 déjà recensé |
| `src/lib/auth.ts:6–7` | Garder la clé après redémarrage peut être normal ; l'inscrire dans le dépôt est le problème distinct | AUD-010 reporté ; valeur non incluse |
| `src/lib/ocr.ts:106–108` | Absence de limite dédiée réellement présente ; durée et réponse vide méritent examen | AUD-008 déjà recensé, complément ci-dessous |
| `src/lib/db.ts:22–27` | Une déclaration RLS ne garantit pas toute l'isolation ; routes, contexte et privilèges doivent être vérifiés | AUD-009 déjà recensé, complément ci-dessous |
| `src/lib/db.ts:3–4` | Le parseur garde bien une chaîne date, sans conversion à cet endroit | Commentaire cohérent ; AUD-017 se situe ensuite dans l'affichage |
| `src/lib/storage.ts:23–24` | La clé utilise effectivement receipt_seq | Pas de défaut établi par sa prévisibilité seule ; une clé opaque ne remplace pas l'autorisation |
| `src/app/expenses/page.tsx:68–70` | Le chargement met à jour les données après await ; suppression d'une règle ESLint | Aucun défaut démontré par la suppression elle-même ; pannes du loader couvertes par AUD-016 |
| `src/components/PendingApprovalsPanel.tsx:38` | Directive ESLint autour d'un chargement asynchrone | Même distinction ; AUD-016 dans le traitement réseau |
| `src/components/AdminConsole.tsx:64` | Directive ESLint autour des chargements annuaire/notes | Même distinction ; AUD-016 dans le traitement réseau |
| `src/app/expenses/page.tsx:125–126` | Une suggestion vide affiche bien une invitation à saisir manuellement | Cohérent sur HTTP réussi ; vide/no-fields et échec moteur sont actuellement confondus, complément AUD-008 |

## AUD-016 — États UI conservés après erreur réseau

Mise à jour : [solution retenue](solutions-to-audit/AUD-016-erreurs-reseau-ui.md), non implémentée. Gestion d'erreur, libération en finally, saisie conservée et pas de retry automatique d'écriture. La proposition initiale ci-dessous est désormais acceptée.

OBSERVATION : les handlers attendent fetch puis réinitialisent loading/submitting/extracting/decidingId/savingId sans catch/finally couvrant un rejet réseau. Un HTTP 400/500 produit une Response ; une panne réseau peut rejeter la promesse avant ces réinitialisations. Ce sont deux cas distincts.

Sources : `src/app/expenses/page.tsx:57–71,74–100,103–141` ; `src/components/PendingApprovalsPanel.tsx:27–40,53–71` ; `src/components/AdminConsole.tsx:43–67,71–89,102–120`. Les contrôles désactivés dépendent de ces indicateurs (`expenses/page.tsx:232,243`, panel `:136,144`, console `:170`).

MEASUREMENT : 9 handlers/loaders extraits du source exécutés chacun avec succès simulé et rejet fetch simulé. Les 9 contrôles de succès rendent l'indicateur inactif ; les 9 pannes laissent un indicateur actif et une exception non traitée, sans message utilisateur. Sur cinq actions, un bouton/contrôle dépend de cet état ; sur quatre loaders, l'indicateur de chargement reste actif.

Limite : setters et fetch simulés, React non monté ; aucun navigateur ni appel réel exécuté. Le défaut de nettoyage des fonctions est reproduit, l'effet visuel doit être confirmé en navigateur isolé. PROPOSITION : traitement réseau explicite et libération d'état en finally, message sûr dans l'UI existante, sans relancer automatiquement une écriture au résultat incertain. Aucun choix de correction accepté pour ce nouveau sujet.

## AUD-017 — Date affichée la veille selon le fuseau

Mise à jour : correction acceptée, non implémentée. [Solution retenue et validation prévue](solutions-to-audit/AUD-017-affichage-date.md). Le statut de proposition dans le constat initial ci-dessous est remplacé par cette décision.

OBSERVATION : PostgreSQL renvoie la date comme chaîne (`src/lib/db.ts:3–5`) mais l'UI fait new Date(chaine) puis formate dans le fuseau local : `src/app/expenses/page.tsx:22,285`, panel `:19,120`, console `:30,228`. `src/utils/format.ts:5–7` contient aussi cette construction, sans consommateur applicatif trouvé par la recherche.

MEASUREMENT : avec la même expression et `2026-10-14`, Europe/Paris et UTC affichent « 14 oct. 2026 » ; America/Los_Angeles affiche « 13 oct. 2026 ». Trois fuseaux vérifiés dans des sous-processus Node isolés. Une date de dépense est ici une date calendaire, pas un instant à déplacer selon la position du lecteur.

Ce point concerne la restitution de la date ; AUD-015 concerne validation et définition d'aujourd'hui côté serveur. Il n'était pas résolu par le choix Europe/Paris d'AUD-015. PROPOSITION : afficher la date calendaire sans glissement de jour, en conservant format français et UI ; mécanisme à choisir. Pas de correction acceptée ni de test navigateur.

## AUD-018 — Réessai du seed après panne du reçu

Mise à jour : [récupération sur la même note acceptée](solutions-to-audit/AUD-018-reprise-seed.md), non implémentée. Contrôler la complétude et réparer seulement le reçu manquant ; tests sur environnement isolé. La proposition initiale ci-dessous est retenue, sans transformer l'hypothèse en panne démontrée.

OBSERVATION : `scripts/seed.mjs:1–6` annonce un jeu navigable, relançable sans duplication. `:76–81` quitte dès qu'une note du même utilisateur/description existe ; `:83–94` crée cette note avant upload puis enregistre le reçu. HYPOTHÈSE : si l'upload échoue, le prochain seed trouve la note sans reçu et n'effectue plus l'upload. Ne pas dupliquer est compatible avec le commentaire, mais ne garantit pas une reprise complète.

Complément opérationnel d'AUD-003/AUD-011 : il concerne le générateur de données, pas le POST applicatif. Non reproduit ; aucun seed, migration ou service lancé. PROPOSITION : contrôler la complétude du reçu et reprendre la même note, sur un environnement réservé aux tests, en préservant les commandes. Ne pas modifier les données actuelles. `scripts/seed.mjs:62,72,109–111` modifie aussi des rôles existants et peut afficher les mots de passe fournis au seed ; valeurs non incluses dans cette preuve. Cet aspect reste à cadrer comme outil local de démonstration, sans prétendre à une fuite observée de secret réel.

## Compléments aux constats existants

AUD-009 : avec un compte DB appliquant réellement RLS, la finalisation POST (`src/app/api/expense-notes/route.ts:103`) utilise getPool sans withUserScope. La migration n'a aucune politique owner UPDATE (`migrations/1700000000001_init-schema.sql:42–100`). L'insertion sous contexte propriétaire peut être permise alors que la mise à jour finale n'a ni contexte propriétaire explicite ni politique correspondante. Privilèges réels inconnus : hypothèse de panne de soumission, pas résultat DB mesuré. Les autres routes directes getPool doivent aussi être vérifiées avant d'imposer le rôle DB restrictif déjà proposé.

AUD-008 : `src/lib/ocr.ts:113–114,131–133` renvoie {} pour un format non pris en charge ou une exception moteur ; la route renvoie alors HTTP réussi (`receipt-suggestion/route.ts:19–20`). L'UI affiche « aucune information reconnue » dans tous ces cas. Distinction succès sans champs/échec infra à vérifier avant de garantir les messages de saturation et timeout choisis. Ce point avait été listé dans les retours, mais le contrat exact n'est pas résolu.

Makefile:14–15 annonce la génération de AUTH_SECRET sans l'effectuer : déjà rattaché à AUD-010. Migration RLS et commentaire séquence de reçu : mêmes limites que les commentaires src. ensure-bucket comporte bien une boucle bornée et le chargement dotenv ; aucun défaut spécifique établi par ces commentaires seuls. Les commentaires historiques Compose sur les images/licences ne sont pas vérifiés auprès des fournisseurs dans cette passe ; cette revue ne démarre pas Docker. ESLint décrit ses exclusions : la présence de ce commentaire n'établit pas une erreur.

## Protocole, résultats et angles morts

[Script reproductible](evidence/comment-audit/controle.cjs), [résultats bruts](evidence/comment-audit/mesures.json). Depuis la racine : `node docs/audit/evidence/comment-audit/controle.cjs`. Il écrit uniquement dans `/tmp/arla-comment-audit-20261014` par défaut ; ARLA_AUDIT_OUTPUT peut désigner un autre répertoire de preuves isolé. Node v24.6.0, TypeScript installé 5.9.3, pas d'installation de dépendances.

18 exécutions de handlers (9 succès simulés, 9 pannes simulées) + 3 observations de fuseau. Aucun résultat de suite E2E, HTTP, DB, S3, build ou OCR réel. Première tentative bloquée par EPERM lors d'un sous-processus ; réexécution autorisée hors sandbox achevée, exit 0. Aucun secret réel lu, aucune valeur de clé d'authentification copiée. La provenance IA et l'intention d'injection d'erreurs ne sont pas vérifiées.

Cette revue couvre tous les commentaires src inventoriés, pas toutes les erreurs possibles de l'application. AUD-016, AUD-017 et AUD-018 ont une correction retenue, non implémentée. Les compléments RLS/finalisation et échec OCR/résultat vide restent à examiner ; le secret reste reporté au professeur.

Vérification documentaire : 116 liens locaux contrôlés, 0 cible/ ancre manquante. Vérification git : aucun diff applicatif dans src, scripts, migrations, manifest/lockfile, Makefile, README racine ou Compose.
