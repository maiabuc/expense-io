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
