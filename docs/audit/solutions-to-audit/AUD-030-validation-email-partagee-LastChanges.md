# AUD-030 — Réutiliser une validation d'email corrigée à l'inscription

Statut : correction et réutilisation sélectionnées par Maia le 26 octobre 2026 ; non implémentées. Nouvelle issue distincte d'AUD-027 ; source : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `src/utils/validators.ts:1–4` expose isValidEmail, fondé sur la même expression à retours arrière que `src/app/actions/auth.ts:13`. La recherche dans src/tests/scripts n'identifie aucun appel d'isValidEmail ; signup utilise sa propre expression pour vérifier l'email et extraire le domaine. Le fichier validators.ts possède d'autres consommateurs, mais cela ne rend pas isValidEmail utilisé.

SonarQube : alerte 14/16, `typescript:S8786`, MAJOR, clé `db0c43c1-deb5-4273-9c6e-f6e1d57c5d76`. [Export](../evidence/sonarqube-20261026/issues.json). Le motif est identique à celui caractérisé dans [AUD-027](AUD-027-validation-email-bornee-LastChanges.md) ; aucune nouvelle mesure ni exploitation de cette fonction sans consommateur identifié n'est revendiquée.

Pourquoi examiner : réutiliser le validateur tel quel déplacerait le coût problématique sans le supprimer. Conserver deux validations indépendantes expose aussi à leur divergence lors d'une correction. Le défaut est latent dans cette fonction actuellement sans appel trouvé ; l'inscription présente déjà le parcours actif suivi par AUD-027.

## Décision et piste de solution

Maia choisit explicitement de réutiliser la fonction à l'inscription après correction, de partager une seule validation et de conserver l'extraction du domaine, puis demande un nouvel AUD. Cette issue n'est donc pas un risque assumé ; priorité P2 pour la correction commune avec AUD-027.

[SPEC-13 LastChanges](../../specs/SPEC-13-validation-email-bornee-LastChanges.md) couvre désormais AUD-027 et AUD-030 dans un résultat cohérent : corriger isValidEmail dans validators.ts, puis l'appeler depuis signup. Conserver son export et sa signature `(value: string): boolean`. L'action vérifie d'abord le type puis appelle isValidEmail ; après succès, elle extrait le domaine après l'unique @ et applique la même conversion en minuscules qu'actuellement. Aucune deuxième validation indépendante n'est conservée dans l'action.

La proposition initiale de SPEC-13 d'un fichier signup-email.ts séparé est remplacée par l'utilisation du validateur existant. Borne technique préalable de 4096 unités UTF-16 et parcours déterministe définis dans SPEC-13 ; préservation de la grammaire actuelle sous cette borne. Ce plafond est un choix de préparation, pas une norme d'email.

Alternatives : supprimer l'export inutilisé et garder une validation corrigée dans l'action (non retenu par Maia) ; conserver les deux expressions (risque de divergence) ; réutiliser la fonction sans correction (coût conservé, rejeté).

## Validation et limites

À vérifier : appel réel du validateur corrigé depuis signup, borne avant parcours, corpus positif/négatif identique pour helper/action, domaine extrait inchangé, transaction entreprise/compte, rôle et connexion après commit conservés. Ne pas supprimer ou affaiblir les assertions existantes.

Acquis : inspection et recherche de consommateurs au SHA indiqué. Aucun changement de code, aucun test de correction exécuté ; absence d'appel trouvé n'est pas une preuve formelle de non-utilisation externe. L'implémentation et la validation restent à réaliser selon SPEC-13. Pas de section IMPLEMENTATION pour cette nouvelle fiche de préparation.
