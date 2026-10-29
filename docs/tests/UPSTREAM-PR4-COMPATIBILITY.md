# Compatibilité avec la suite E2E externe — 29 octobre 2026

## Priorités et portée

Maia donne la priorité à la réussite des tests du professeur, puis à la conservation des fonctionnalités et à l’absence de régression. Les fusions de specs sont suspendues à sa demande pendant cette revue. La seule fusion réalisée est la réparation d’installation PR #13.

La référence fournie par Maia est [NathanPrats/expense-io#4](https://github.com/NathanPrats/expense-io/pull/4), branche de `2-MORGAN/expense-io` au SHA `dfcd4a11f3925c5a64361bbb07b272c4d4e59cbc`. Ses 89 tests, leurs supports et leurs images ont été importés sans modification. Cette provenance ne prouve pas que la suite correspond à tous les tests de correction du professeur ; aucun jeu caché n’est connu.

## Mesure réelle avant intégration des specs

Application : main `9b1ed37fe989133b8b01f099abbc723026dc3f80`, avec le seul ajout du harnais externe dans `668e71294a35fb367d76b704f6eca12b59f9d399`.

[Job externe](https://github.com/maiabuc/expense-io/actions/runs/40940374426/job/123682486752) : **89 exécutés, 76 réussis, 13 échoués, aucun ignoré**. Le build de production, installation, lint, types et documentation réussissent sur cette révision. Les différences ci-dessous existaient avant toute fusion SPEC-13–18.

| Cas externes | Nombre | Attente externe | Comportement observé et cause |
| --- | ---: | --- | --- |
| NDF-07 JPEG/WebP/PDF et RECU-03 JPEG/WebP/PDF | 6 | Dépôt 201, puis restitution avec le type annoncé | 400 : le test utilise `pngReceipt` et change seulement le MIME et le nom ; les octets restent PNG. Notre route vérifie l’accord type annoncé / type détecté. |
| NDF-08 montant nul, négatif, non numérique | 3 | 400 avec `Champs invalides` | Même refus 400, message `Montant invalide` depuis AUD-014. |
| NDF-12 | 1 | `sort=amount ASC` et `amount DESC` acceptés | 400 : AUD-004 utilise `amount_asc`, `amount_desc`, `newest` via une table fixe. |
| ORG-07 | 1 | Affectation interdite 409 avec `Invalid manager` | Même refus 409, message français `Cette affectation de manager n'est pas autorisée.` depuis AUD-020. |
| OCR-03 et OCR-07 | 2 | PDF envoyé à la suggestion OCR : 200 vide puis invitation de saisie | 400 de format OCR : AUD-008 conserve le PDF au dépôt mais limite l’analyse à PNG/JPEG/WebP. |

Total : 6 + 3 + 1 + 1 + 2 = 13.

## MIME : ce qui est réellement validé

MIME est l’étiquette de format transmise avec le fichier : `image/png`, `image/jpeg`, `image/webp`, `application/pdf`. Le navigateur/client peut choisir cette étiquette ; elle ne transforme pas les octets. Renommer une image PNG en reçu.pdf et annoncer application/pdf ne crée pas un PDF.

La route actuelle vérifie les types autorisés, détecte la signature dans les octets, puis exige la cohérence avec le type annoncé avant écriture. Elle accepte les vrais formats supportés : les tests internes NOTE-003 et suivants vérifient de vrais fichiers, distincts des données externes renommées.

## Conflits d’assertions à décider avant modification

Il ne suffit pas de corriger SPEC-13–18 pour obtenir 89/89 : cette série ne change ni la politique MIME, ni les messages, ni la liste des tris, ni la politique OCR PDF.

Deux tests imposent notamment des résultats opposés au même type d’entrée : la référence externe NDF-07 demande 201 pour un PNG annoncé application/pdf ; notre référence `tests/api/expenses.spec.ts` demande 400 pour `receipt.png` annoncé application/pdf. Aucun code universel ne peut satisfaire les deux sans réconcilier le contrat. Une détection spéciale de la suite ou de son client serait invalide.

Options concrètes pour la revue, sans décision attribuée à Maia :

- **Formats de fichiers :** vérifier avec le professeur si les faux contenus MIME font partie du contrat à conserver. Si l’intention est « les vrais JPEG/WebP/PDF restent déposables », proposer des fixtures réellement dans ces formats, tout en conservant la référence externe originale et le test de refus des incohérences.
- **Messages :** si les chaînes externes exactes sont contractuelles pour la correction, rétablir la compatibilité publique des messages et mettre explicitement à jour nos décisions/tests de la nouvelle convention. Ne pas transformer les assertions en acceptation de n’importe quel message.
- **Tri :** les deux anciennes formes précises peuvent être ajoutées comme alias fixes vers les fragments SQL existants ; cela n’exige jamais de réintroduire le SQL libre.
- **PDF dans la suggestion :** rendre 200 vide pour un PDF sans démarrer Tesseract peut conserver l’ancien parcours sans ajouter d’OCR PDF. Il faut alors réconcilier la référence interne qui attend le refus 400, et conserver les vrais cas d’erreur moteur comme erreurs.
- **Preuve finale :** rejouer les 89 tests externes et nos suites complètes après toute décision, sur le même SHA ; ne déclarer aucun succès à partir de la seule compilation.

Aucune de ces adaptations de contrat n’a été appliquée pendant la pause des fusions. Les assertions externes et internes sont conservées.

## Validation des corrections préparées, sans fusion

[PR draft #20](https://github.com/maiabuc/expense-io/pull/20) est une branche de validation uniquement, à ne pas fusionner. Elle permet d’exécuter les corrections préparées sur le même code que la référence externe. Résultat local déjà acquis : **81/81 unitaires**. Les résultats HTTP/E2E distants restent attachés au run correspondant et ne sont pas anticipés ici.

Les corrections C7 de SPEC-13 et C5 de SPEC-14, ainsi que leurs mesures et traces de revue, sont publiées dans leurs PR séparées. Les specs restent non fusionnées.
