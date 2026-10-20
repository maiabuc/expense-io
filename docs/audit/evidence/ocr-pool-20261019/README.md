# Pool OCR — mesures et preuves d'arrêt — 19 octobre 2026

SPEC-03 / AUD-008, personne A. Script : [measure.mjs](measure.mjs) ; résultats bruts : [results.json](results.json). Exécution locale unique (`node docs/audit/evidence/ocr-pool-20261019/measure.mjs`), Node 26.8.2, macOS arm64, fixtures du dépôt (`tests/fixtures/receipt.png` 1200×360, `blank.png` 40×40), aucun service externe.

## Résultats

| Mesure | Valeur observée | Lecture |
| --- | --- | --- |
| Initialisation + première reconnaissance (froid) | 241 ms | Création du thread Tesseract et chargement `fra` compris |
| Reconnaissance à chaud, moteur réutilisé (5 essais) | 42,5 à 43,5 ms | Un seul moteur créé pour les 6 reconnaissances : la réutilisation évite ~200 ms d'initialisation par demande |
| Reconnaissance d'une image vide (`blank.png`) | 0,4 ms | Succès sans champ, image minuscule |
| Arrêt confirmé (`close`, événement `exit` reçu) | 3,2 ms | Place rendue seulement après `exit` |
| Concurrence 1 | 1 réussite, 43,3 ms | — |
| Concurrence 2 | 1 réussite (42,7 ms), 1 refus `EngineBusyError` en 0,1 ms | Aucune file : le refus est immédiat |
| Concurrence 4 | 1 réussite (43,1 ms), 3 refus en 0,1 ms | Un seul moteur créé quel que soit le niveau |
| Délai de production sur thread réellement bloqué (`while (true) {}`) | Rejet `RecognitionTimeoutError` à 40 012 ms ; `exit` du thread observé à 40 011,9 ms ; `threadId` = −1 | Arrêt effectif du thread avant que la place ne soit rendue (`reserved` 0 ensuite) |
| Mémoire résidente du processus | 77 Mio avant moteur ; 134 Mio après initialisation ; 139–140 Mio en service | ~60 Mio pour un moteur `fra` |
| CPU utilisateur pendant le délai de 40 s | ~38 s | Consommé par le thread bloqué synthétique : illustre le coût d'un moteur qui ne serait pas arrêté |

## Limites

Mesure unique sur une machine de développement, pas une distribution : les durées varient selon la machine et la charge. Seule l'image du dépôt a été mesurée ; aucune « grande » image ni aucun PDF (hors périmètre OCR). La concurrence 2/4 montre le comportement de refus de la capacité 1, pas le débit d'un pool plus grand : augmenter la capacité exige une nouvelle mesure mémoire/CPU (~60 Mio et un cœur par moteur actif observés ici). Le délai de 40 s est vérifié sur un thread bloqué synthétique, pas sur une reconnaissance Tesseract réellement longue, qu'aucune fixture du dépôt ne produit. Les tests automatisés OCR-POOL-001…004 vérifient les mêmes propriétés avec un délai réduit (100 ms) ; seule cette campagne exécute le délai de production.
