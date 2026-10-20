# AUD-019 — Convention d'inscription par domaine conservée

Statut : pas de correction retenue, convention acceptée le 14 octobre 2026. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Localisation initiale et question

`src/app/actions/auth.ts:23–29` valide la syntaxe de l'adresse, puis `:41–62` utilise le domaine saisi pour créer/rejoindre l'entreprise et attribuer RH au premier inscrit. `src/lib/auth.ts:25–40` authentifie le compte par son mot de passe, sans vérification de possession de l'adresse dans le parcours inspecté.

Pourquoi le point a été examiné : une adresse déclarée n'est pas une preuve d'appartenance au domaine. C'était un risque de confiance à comparer au périmètre pédagogique, pas un accès interdit démontré.

## Décision

Conserver le fonctionnement actuel comme convention pédagogique : pas de vérification email, invitation, nouveau service ou modification du parcours d'inscription. Le point ne reste pas un défaut à corriger dans ce périmètre ; le risque de confiance est une limite assumée, pas une garantie de sécurité pour un usage réel. Cette décision ne remplace pas la transaction entreprise/premier RH retenue dans AUD-013 ni les contrôles d'isolation existants à corriger.

Validation : source relu, pas de test d'inscription exécuté. Vérifier plus tard que le parcours simplifié et les rôles attendus sont préservés. Réexaminer uniquement si le périmètre métier ou une exigence du professeur change.

## IMPLEMENTATION

### 2026-10-18 — SPEC-05, personne B

Statut : convention conservée, aucune correction réalisée (conforme à la décision ci-dessus).
Spec : [SPEC-05](../../specs/SPEC-05-inscription-atomique.md). Révision de départ : `7377486`. Réalisation : `ba39f53`.

La réalisation de SPEC-05 (transaction atomique entreprise/premier RH, AUD-013) n'ajoute aucune vérification de possession du domaine, invitation ou nouveau parcours d'inscription. `src/app/actions/auth.ts` continue d'attribuer l'entreprise et le rôle à partir du seul domaine déclaré dans l'email, comme avant. Validation : relecture du code modifié (`signup`) et des tests e2e [AUD-013,AUD-019][INS-001] et [INS-002] (`npm run test:issue -- AUD-013`, 7/7, voir [AUD-013#implementation](AUD-013-signup-consistency.md#implementation)) ; ces deux cas couvrent le parcours nouvelle entreprise/domaine existant sans modification de la convention. Aucune mesure nouvelle, aucun test d'invitation ou de preuve de possession ajouté.
