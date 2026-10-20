# AUD-008 — Ressources et durée du traitement OCR

Pool accepté le 13 octobre, saturation/timeout précisés le 14 octobre 2026 ; non implémenté. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuves

OBSERVATION : [suggestion:12–19](../../../src/app/api/expense-notes/receipt-suggestion/route.ts#L12) lit le fichier en mémoire sans limite de taille dédiée ; [ocr.ts:118–128](../../../src/lib/ocr.ts#L118) crée et termine un moteur par appel. La borne 10 MiB de la [création:9,84–85](../../../src/app/api/expense-notes/route.ts#L9) ne protège pas cette autre route. Coût CPU/RAM, capacité et latence restent non mesurés ; aucune indisponibilité reproduite.

## Solution retenue

Pool borné de moteurs réutilisables, sans file FIFO ni file durable. Si aucun moteur n'est libre, refuser temporairement avec « Service temporairement occupé, veuillez réessayer ». Un moteur sain rejoint le pool après succès/échec ; retirer/remplacer un moteur cassé sans dépasser la capacité. Prévoir recyclage, arrêt et reprise du processus.

Le traitement OCR est limité à 40 secondes depuis son démarrage. Arrêter réellement le travail au dépassement avant de récupérer/remplacer le moteur ; un délai sur la réponse qui laisse le moteur actif ne suffit pas. 40 secondes est un choix, pas une mesure. Code HTTP/message exact du timeout et mécanisme d'arrêt à définir.

```mermaid
flowchart TD
    A[Demande de suggestion] --> B[Vérifier format et limite de taille]
    B -->|Invalide| C[Refus contrôlé]
    B -->|Valide| D{Moteur libre ?}
    D -->|Non| E[Service temporairement occupé]
    D -->|Oui| F[Démarrer OCR et délai de 40 secondes]
    F -->|Terminé| G{Moteur sain ?}
    F -->|Erreur ou dépassement| H[Arrêter le travail et vérifier le moteur]
    H --> G
    G -->|Oui| I[Rendre le moteur disponible]
    G -->|Non| J[Retirer et remplacer sans dépasser la limite]
    I --> K[Renvoyer résultat ou erreur sûre]
    J --> K
```

Taille maximale, capacité et ingestion à mesurer avant implémentation : formData peut allouer de la mémoire avant le contrôle de route. Un pool borne un processus, pas automatiquement tous les serveurs. Les documents de Tesseract installés (README ligne 45 et workers_vs_schedulers) décrivent réutilisation/recréation ; cela ne mesure pas un gain dans ce projet.

## Distinguer résultat vide et échec — solution retenue

Localisation initiale au SHA source : [ocr.ts:131–132](../../../src/lib/ocr.ts#L131) journalise une panne moteur puis retourne {}, comme [ocr.ts:113–114](../../../src/lib/ocr.ts#L113) pour un format non pris en charge. [La route:19–20](../../../src/app/api/expense-notes/receipt-suggestion/route.ts#L19) renvoie alors une réponse réussie ; [page.tsx:125–137](../../../src/app/expenses/page.tsx#L125) interprète le vide comme absence de champs reconnus. Pourquoi c'est un problème : l'utilisateur reçoit une explication d'analyse sans résultat alors qu'aucune analyse réussie n'a eu lieu. Construction observée, panne moteur/HTTP non reproduite.

Décision à la demande explicite de proposition acceptée : une analyse réussie sans champs reconnus reste HTTP 200 avec résultat vide ; une panne OCR, une saturation ou un dépassement des 40 secondes ne doivent pas se transformer en succès vide. Retourner une erreur HTTP adaptée avec un message sûr dans le champ string error compatible avec les consommateurs. Diagnostic et code technique dans les logs internes, sans secrets ni stack publique, selon AUD-005. Statuts/messages exacts à préparer ; aucune nouvelle convention API imposée.

L'UI utilise son emplacement d'erreur standard et lit le message contrôlé avec un fallback compréhensible. Saturation : message « Service temporairement occupé, veuillez réessayer » déjà retenu. Les champs saisis restent conservés. Succès vide : invitation actuelle à saisir les champs manuellement. Aucune modification des polices, couleurs ou positions. Le traitement d'un format non pris en charge doit rester cohérent avec le périmètre formel OCR, distinct des formats de pièces jointes ; aucune extension PDF OCR sélectionnée.

Pourquoi : ne pas faire croire qu'un reçu a été analysé lorsque le moteur n'a pas pu travailler. Alternative laisser catch renvoyer {} écartée. Vérifier séparément succès avec champs, succès sans champs, exception moteur, pool plein, arrêt à 40 s et affichage de chaque message. Anciennes réponses à caractériser pour les tests du professeur ; non implémenté, pas de tests de correction.

## Formats et alternatives

Respecter uniquement les formats formellement acceptés, sans élargissement. Le code présent traite PNG/JPEG/WebP (`src/lib/ocr.ts:4,113–114`) ; cette liste n'est pas une preuve des exigences du professeur. Si la source formelle n'est pas fournie, la vérifier avant toute modification de périmètre. Le dépôt accepte séparément les pièces jointes PDF (`src/app/api/expense-notes/route.ts:8`) ; ni suppression des PDF joints ni OCR PDF ajouté.

FIFO envisagée puis écartée pour complexité : attente en mémoire, capacité et annulation supplémentaires. Un compteur seul limite les démarrages mais conserve la création par appel. Une file durable ajoute persistance, états, retries et récupération des résultats, non justifiés actuellement. Le pool limite les traitements actifs avec un coût de mémoire résidente et de lifecycle.

## Validation prévue

Mesurer images fixes petites/grandes, froid/chaud et concurrence, avec durées et ressources. Tester taille/ingestion, saturation, succès, erreur, arrêt réel à 40 s, libération/remplacement, recyclage et arrêt/restart. Conserver saisie manuelle et dépôt légitime des reçus. Tests et mesures exécutés : 0. [Journal](../DECISION_LOG.md).

## Actualisation des preuves — campagne du 14–15 octobre

Trois appels OCR réels ; image corrompue renvoyée 200 avec résultat vide. Gros fichiers, saturation, CPU/RAM et arrêt 40 s non mesurés ; aucun gain du pool encore vérifié. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-18 — SPEC-03, personne A

Statut : implémentée, validation incomplète sur le périmètre décrit (voir écarts : charge/CPU/RAM restent une campagne manuelle distincte, déjà notée hors automatisation dans `tests/deferred-coverage.json`).
Spec : [SPEC-03](../../specs/SPEC-03-ocr-borne.md). Révision de départ : `7377486`. Réalisation : `5393aee` (fusionne `feat/spec-04`, dépendance non encore mergée dans `main` — voir Écarts).

#### Ce qui a été implémenté

`src/lib/ocr.ts` gère désormais un pool borné d'un moteur par processus (`POOL_CAPACITY = 1`, à mesurer avant d'augmenter), sans file FIFO : `acquireEngine` renvoie immédiatement `EngineBusyError` si aucun moteur n'est libre et que la capacité est atteinte. `recognizeWithTimeout` borne la reconnaissance à 40 s via `Promise.race` ; au dépassement, `RecognitionTimeoutError` est levée. Dans les deux cas de panne (erreur moteur réelle ou délai dépassé), `releaseEngine(worker, false)` retire le moteur du pool et l'arrête réellement (`worker.terminate()`) au lieu de le remettre en circulation — un remplacement est créé à la demande suivante, sans dépasser la capacité. Une analyse réussie sans champ reconnu reste `{}` avec 200 (succès réel, inchangé) ; toute exception (y compris une donnée non décodable) remonte désormais jusqu'à la route au lieu d'être avalée en `{}`. La route `receipt-suggestion` vérifie elle-même le format annoncé (`SUPPORTED_MIME_TYPES`, PDF exclu) et la taille (10 MiB) avant tout appel au moteur, puis traduit `EngineBusyError`→503, `RecognitionTimeoutError`→504, et laisse toute autre exception atteindre `respondError`→500. Un `errorHandler` no-op est fourni à `createWorker` : sans lui, tesseract.js relance l'erreur dans son gestionnaire de messages en plus de rejeter la promesse du job, un `throw` non intercepté qui fait planter tout le processus Node — reproduit en vérification manuelle avec une image corrompue (voir Validation), avant correction.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/lib/ocr.ts : `acquireEngine`, `releaseEngine`, `recognizeWithTimeout`, `EngineBusyError`, `RecognitionTimeoutError` | Pool borné, délai réel, arrêt effectif | Distingue panne/saturation/délai d'un succès vide |
| src/lib/ocr.ts : `createWorker(..., { errorHandler: () => {} })` | Supprime le `throw` secondaire non intercepté de tesseract.js | Évite un crash processus sur image non décodable |
| src/app/api/expense-notes/receipt-suggestion/route.ts | Vérifie format/taille avant l'appel moteur ; traduit les erreurs en 503/504/500 | Contrat HTTP conforme à C2 |

#### Nouveau fonctionnement

POST avec `receipt` → format annoncé vérifié (`SUPPORTED_MIME_TYPES`, PDF refusé) → taille vérifiée (≤10 MiB) → `suggestFields` : `acquireEngine()` (moteur idle réutilisé, ou nouveau créé si capacité disponible, sinon `EngineBusyError` immédiat) → `recognizeWithTimeout` course le job contre un délai de 40 s → succès : moteur remis au pool (`releaseEngine(worker, true)`), résultat (`{}` ou champs reconnus) renvoyé 200 → échec (délai ou panne moteur) : moteur arrêté et retiré (`releaseEngine(worker, false)`), exception propagée → la route traduit en 503 (saturation), 504 (délai) ou 500 (autre panne, via `respondError`), jamais en succès vide.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:issue -- AUD-008` | OCR-001…006, NAV-016/017 réussis | 8/8 réussis, dont OCR-003 (image corrompue → 500, pas 200 vide) et OCR-004 (PDF → 400) désormais corrects | `reports/issues.json`, run local 2026-10-18 |
| `npm run test:api`/`test:e2e` (suites complètes) | Aucune régression | api 84/112 (AUD-008 0 échec) ; e2e 39/60 (identique à la mesure SPEC-04, AUD-008 0 échec) | `reports/issues.json` |
| Vérification manuelle : deux appels concurrents (capacité 1) | Un réussit, l'autre `EngineBusyError` | Confirmé (script Node ad hoc, supprimé après vérification, non committé) | Sortie locale 2026-10-18, voir Écarts |
| Vérification manuelle : image corrompue puis nouvel appel | Rejet propre sans crash processus ; pool opérationnel ensuite | Confirmé après ajout de `errorHandler` (sans lui : crash processus reproduit) | Sortie locale 2026-10-18 |
| Vérification manuelle : appel séquentiel après libération | Moteur réutilisé (pas de nouvelle création) | Confirmé (résultat identique, pas de délai de réinitialisation supplémentaire observé) | Sortie locale 2026-10-18 |

#### Écarts et limites

Dépend de `feat/spec-04` (validation de fichiers/contenu) comme prévu par la coordination de la spec ; cette branche n'est pas encore mergée dans `main`, donc fusionnée directement dans `feat/spec-03` (SHA `19bdd4c`) pour pouvoir construire dessus — à refléter à l'intégration. **Mesures non faites, conformément à `tests/deferred-coverage.json`** (« Pool réutilisable, saturation et arrêt effectif à 40 s : mécanisme à implémenter » / « Charge CPU/RAM : campagne manuelle dédiée ») : le délai réel de 40 s n'a pas été attendu en conditions réelles (coût prohibitif pour cette vérification), la concurrence 2/4 et le CPU/RAM ne sont pas mesurés. Seule la saturation à capacité 1 (cas le plus simple) et la panne/récupération ont été vérifiées manuellement. Capacité laissée à 1 moteur, conformément à l'instruction « mesurer avant d'augmenter ».

### 2026-10-19 — SPEC-03, correction après revue (personne A)

Statut : implémentée et vérifiée sur le périmètre décrit (mesures de la section Validation ; limites ci-dessous).
Spec : [SPEC-03](../../specs/SPEC-03-ocr-borne.md). Révision de départ : `feat/spec-03` actualisée avec `main` `651b067` et avec `feat/spec-04` corrigée. Réalisation : commit de cette entrée sur `feat/spec-03`.

#### Ce qui a été implémenté

La [revue du 19 octobre](../revue-pr-g4bi2004-20261019.md) relève (P1, C3/C4) que l'entrée du 18 octobre décrémentait la capacité *avant* la fin de l'arrêt et ignorait l'échec de `worker.terminate()` (`.catch(() => {})`). Un remplaçant pouvait donc démarrer pendant que l'ancien thread tournait encore. Elle relève aussi qu'aucun test ne prouvait l'arrêt effectif ni le remplacement. Constat confirmé à la lecture de tesseract.js : son `terminate()` demande l'arrêt du thread sans l'attendre et se résout immédiatement, ce qui n'est pas une preuve.

Le pool est désormais une fabrique testable, `createEnginePool`. Un moteur est un thread réel (`worker_threads.Worker`, exposé par tesseract.js) et une fonction de reconnaissance. En cas de panne ou de délai, `stop` demande l'arrêt du thread puis attend son événement `exit`, borné à 5 s. La place n'est rendue qu'après cette confirmation. Si l'arrêt n'est pas confirmé, la place reste réservée : aucun remplaçant ne peut s'ajouter à un thread peut-être actif. L'échec est compté (`unconfirmedStops`) et journalisé (`OCR_STOP_UNCONFIRMED`), jamais ignoré. L'erreur d'origine (panne → 500, délai → 504) est relayée au client. `close()` arrête les moteurs au repos avec la même confirmation (recyclage, fin de processus).

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/lib/ocr.ts : `createEnginePool`, `confirmThreadExit`, `stop`, `close`, `stats` | Pool réécrit en fabrique ; capacité rendue après `exit` | Arrêt effectif avant remplacement |
| src/lib/ocr.ts : `createTesseractEngine` | Adaptateur vers le thread réel de tesseract.js ; refus si le thread est inaccessible | Arrêt vérifiable |
| src/lib/ocr.ts : `suggestFields` | Utilise le pool par défaut (capacité 1, 40 s) | Contrat de la route inchangé |
| tests/unit/ocr-pool.test.ts | OCR-POOL-001…004 | Réutilisation, saturation, arrêt réel au délai, remplacement |
| docs/audit/evidence/ocr-pool-20261019/ | Script et résultats de mesure | Critère C4 |

#### Nouveau fonctionnement

Demande OCR → `acquire` : moteur au repos réutilisé, ou création si la capacité le permet, sinon `EngineBusyError` immédiat (503) → reconnaissance en course contre le délai → succès : moteur rendu au repos, résultat renvoyé → panne ou délai : `stop` appelle `thread.terminate()` et attend l'événement `exit` → arrêt confirmé : place rendue, un remplaçant sera créé à la demande suivante → arrêt non confirmé en 5 s : place conservée, échec journalisé → dans les deux cas l'erreur d'origine est relayée à la route (500 ou 504).

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:unit` | OCR-POOL-001…004 réussis | 25/25 (dont les 4 nouveaux cas) | `reports/unit.json` |
| Réintroduction volontaire du défaut (place rendue avant confirmation) | Les tests doivent échouer | OCR-POOL-001, 003 et 004 échouent ; code restauré, 4/4 de nouveau | Sortie locale 2026-10-19 |
| `npm run test:api` ; `npm run test:e2e` (suites complètes) | OCR-001…006, NAV-016/017 réussis | Tous réussis ; api 88/117, e2e 40/62, échecs restants hors SPEC-03/04 | `reports/api.json`, `reports/e2e.json` |
| `npm run test:spec:report -- SPEC-03` | Contrôle par spec vert, couverture complète | `passed`, 12/12, aucune couverture manquante (référence `main` : `incomplete`, OCR-POOL absents) | `reports/SPEC-03.json` |
| Campagne de mesure (C4) | Initialisation, reconnaissance, arrêt, concurrence 1/2/4, mémoire/CPU, délai de 40 s réel | Froid 241 ms, chaud ~43 ms, arrêt confirmé 3,2 ms ; concurrence 2/4 : 1 réussite + refus en 0,1 ms ; délai de production : rejet à 40 012 ms, `exit` observé, `threadId` −1 ; ~60 Mio par moteur | [README et résultats](../evidence/ocr-pool-20261019/README.md) |
| Garde append-only | Préfixes conservés | `check` réussi avec `/tmp/arla-spec-03-review-gf.json` | Sortie locale 2026-10-19 |

#### Écarts et limites

L'entrée du 18 octobre décrivait l'arrêt comme « réel » et le remplacement comme vérifié. Ces affirmations reposaient sur `worker.terminate()` de tesseract.js, qui n'attend pas l'arrêt du thread : elles n'étaient pas prouvées. Ce point est corrigé ici, l'entrée antérieure est conservée telle quelle.

Limites :
- Le délai de production de 40 s est mesuré sur un thread bloqué synthétique, pas sur une reconnaissance Tesseract réellement longue.
- Mesures uniques sur une machine de développement, sans grande image.
- Si la création d'un moteur échoue après le démarrage de son thread, tesseract.js ne rend aucun accès à ce thread : son arrêt n'est pas vérifiable et la place est rendue.
- Le `.catch(() => {})` restant porte sur la promesse d'un job abandonné après un délai, pas sur l'arrêt du moteur.
- Capacité maintenue à 1 moteur : une augmentation exigerait une nouvelle mesure.
