# G14 — Contrôle du format des reçus

Statut : solution retenue le 14 octobre 2026, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

Clarification obtenue : la confusion PNG/PDF concernait l'OCR. PDF accepté pour le dépôt du reçu ; aucune extension de la prise en charge OCR sélectionnée. Préserver PDF/PNG/JPEG/WebP pour le dépôt.

OBSERVATION : la route vérifie le type annoncé et la taille (`src/app/api/expense-notes/route.ts:81–85`), puis transmet les octets au stockage (`:100–101`, `src/lib/storage.ts:29–31`). Aucun contrôle explicite du type par le contenu avant stockage. Scénario HTTP non exécuté.

Pourquoi c'est un problème : le type annoncé est fourni par l'appelant. Un fichier texte déclaré PDF pourrait donc satisfaire le contrôle de type sans être un reçu PDF exploitable. Renommer son extension ne change pas ses octets. C'est un défaut de contrôle du format, pas la preuve qu'un fichier malveillant a été exécuté.

## Solution retenue

Ajouter côté serveur une détection du type à partir des octets du fichier, via un détecteur maintenu à sélectionner après vérification de compatibilité. Une signature de fichier désigne ici les octets caractéristiques d'un format, pas une signature cryptographique. Vérifier que le type détecté est autorisé et cohérent avec le type annoncé avant création/upload. Conserver la limite de taille existante et les noms de stockage générés par le serveur. Refuser un contenu non reconnu ou incompatible avec un message compréhensible ; codes et contrat à définir selon AUD-005.

Choix accepté : contrôle du contenu côté serveur, formats actuels conservés, sans modification du schéma DB ni de l'apparence de l'UI. Les détails de bibliothèque et d'erreur ne sont pas encore sélectionnés.

Alternative extension seule : un renommage ne change pas le contenu. Type annoncé seul : fourni par l'appelant. La [référence OWASP](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html#file-signature-validation) recommande de combiner les contrôles et souligne qu'une signature seule ne garantit pas la validité complète ni l'innocuité du document. Aucun antivirus, OCR PDF, service externe ou validation exhaustive de document sélectionné.

## Validation prévue

PDF/images valides toujours acceptés ; fichier texte annoncé PDF refusé ; format non reconnu et incohérence type/contenu refusés ; limites de taille conservées. Caractériser les cas de vrais fichiers et types annoncés génériques avant durcissement pour préserver les contrats et tests du professeur. Bibliothèque et traitement des fichiers corrompus restent à préciser. 0 test exécuté ; UI et DB inchangées.

## Actualisation des preuves — campagne du 14–15 octobre

Texte arbitraire déclaré image/png accepté HTTP 201. La détection par octets n’est pas encore implémentée ou testée. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-18 — SPEC-04, personne B

Statut : implémentée et vérifiée sur le périmètre décrit.
Spec : [SPEC-04](../../specs/SPEC-04-entrees-et-affichage.md). Révision de départ : `7377486`. Réalisation : `c445659`.

#### Ce qui a été implémenté

`detectReceiptType` (src/utils/validators.ts) lit les premiers octets du fichier et reconnaît les quatre formats acceptés par leur signature propre : PNG (`89 50 4E 47 0D 0A 1A 0A`), JPEG (`FF D8 FF`), WebP (`RIFF`…`WEBP` aux octets 0–3 et 8–11) et PDF (`%PDF-`). Aucune bibliothèque externe ajoutée : les quatre signatures nécessaires sont courtes et stables, sans justifier une nouvelle dépendance pour ce périmètre borné. La route POST lit désormais le corps du fichier **avant** l'insertion en base (au lieu d'après), détecte son type réel, et refuse (400) si aucun format n'est reconnu ou si le type détecté diffère du type annoncé — avant toute écriture DB ou upload S3.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/utils/validators.ts : `bytesStartWith`, `RECEIPT_SIGNATURES`, `detectReceiptType` | Détection par signature de fichier | Le type annoncé seul ne suffit plus |
| src/app/api/expense-notes/route.ts : `POST` | Lecture du buffer déplacée avant l'`INSERT` ; comparaison détecté/annoncé | Refus avant écriture DB et upload S3 |

#### Nouveau fonctionnement

POST avec `receipt` → type annoncé et taille vérifiés (inchangé) → `buffer = Buffer.from(await receipt.arrayBuffer())` lu immédiatement (déplacé avant l'étape DB) → `detectReceiptType(buffer)` compare les octets aux quatre signatures → si aucune signature ne correspond, ou si le type détecté diffère du type annoncé (`receipt.type`), HTTP 400 "Format de fichier non reconnu ou incohérent avec le type annoncé" sans INSERT ni upload → sinon le parcours existant (INSERT, calcul de `receiptKey`, upload, UPDATE) continue avec le même `buffer` déjà lu.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npm run test:issue -- G14` | NOTE-002…005, NOTE-023/024/025/026/028, NOTE-031/032 réussis | 11/11 réussis (dépôts légitimes PNG/JPEG/WebP/PDF acceptés ; texte déguisé en PNG, faux PDF et PNG déclaré PDF refusés avant écriture/upload, confirmé sans variation du compte de notes ni du compte d'objets S3) | `reports/issues.json`, run local 2026-10-18 |
| `npm run test:api` (suite complète) | Aucune régression | 82/112 (G14 0 échec) | `reports/issues.json` |

Comptes réels : vérification explicite `objectCount()` avant/après (LocalStack isolé) pour les cas de refus, confirmant l'absence d'upload.

#### Écarts et limites

Détection limitée aux quatre formats déjà acceptés (PNG/JPEG/WebP/PDF) : aucun antivirus, OCR PDF ou validation exhaustive du document, conformément à la solution retenue. Un PDF ou une image structurellement corrompue au-delà de l'en-tête (signature correcte mais contenu invalide plus loin) n'est pas détecté par ce contrôle — hors périmètre de la vérification par octets de tête.
