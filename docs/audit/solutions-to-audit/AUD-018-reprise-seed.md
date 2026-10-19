# AUD-018 — Récupérer le reçu d'une note de démonstration

Statut : solution retenue le 14 octobre 2026, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuve

OBSERVATION : `scripts/seed.mjs:76–81` quitte si une note utilisateur/description existe. Les lignes 83–94 insèrent la note, uploadent le reçu puis sauvegardent sa référence. HYPOTHÈSE : après panne d'upload ou de finalisation, un réessai peut ignorer une note incomplète au lieu de récupérer son reçu. [Revue](../comment-review.md#aud-018--réessai-du-seed-après-panne-du-reçu). Aucun seed exécuté ; ne pas présenter ce scénario comme incident confirmé.

## Solution retenue

Vérifier la complétude de la note de démonstration et de son reçu avant de sauter une entrée existante. Si le reçu manque, reprendre son stockage et sa référence sur la même note ; si l'objet existe déjà, le vérifier et réutiliser sans upload inutile. Si note/référence/objet sont complets, ne rien refaire. Vérifier la persistance lorsque le résultat d'une opération est incertain, plutôt que supposer un échec et recréer la note.

Conserver les commandes de lancement et le jeu de démonstration attendu. Préparer la correction et les essais sur base/bucket réservés aux tests ; ne pas relancer le seed ni réparer les données locales existantes dans cet entretien. Ce choix ne sélectionne pas une reclassification des notes applicatives ni une modification des rôles.

Pourquoi : un script relançable sans doublon doit aussi pouvoir finir une préparation interrompue. Alternatives : recréer la note crée un doublon ; ignorer toute note existante conserve le reçu manquant ; suppression aveugle peut effacer une donnée légitime.

## Validation prévue

Environnement isolé : première exécution, deuxième exécution sans doublon, panne upload, reprise même note, objet présent/référence absente, référence présente/objet absent et résultat incertain. Mesurer les lignes/objets avant et après. Concurrence et clé stable de la note existante à préparer. Tests de seed exécutés : 0 ; aucune implémentation ni service modifié.

## Actualisation des preuves — campagne du 14–15 octobre

Seed initial : échec sur bucket absent. Relance sur bucket valide : exit 0, mais note employé existante garde receipt_key vide. Réparation cible non implémentée. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.

## IMPLEMENTATION

### 2026-10-19 — SPEC-10, personne D

Statut : implémentée et vérifiée sur le périmètre décrit (script réel sur base et bucket de test isolés ; aucun seed lancé sur les services de l'utilisateur).
Spec : [SPEC-10](../../specs/SPEC-10-seed-recuperable.md). Révision de départ : `1746cdb` (branche `feat/spec-09`, schéma et états de SPEC-09). Réalisation : `scripts/seed.mjs` dans le commit de correction de `feat/spec-10`, tests dans le commit suivant.

#### Ce qui a été implémenté

Pour chaque note de démonstration, le script relit la note, sa référence de reçu et l'objet stocké, puis répare la même note : s'il manque une note, il la crée en `incomplete` avec sa clé de reçu prévue dans une seule transaction ; il dépose le reçu seulement si l'objet manque ou diffère, et le relit ; il rétablit la référence si elle est vide ; il passe `incomplete` en `pending`. Les notes `approved` et `rejected` gardent leur état. À la fin, une vérification relit chaque note et chaque objet : la commande ne réussit (exit 0) que si les données de démonstration sont complètes ; sinon elle écrit « Seed incomplet : ... » et sort en erreur. `npm run seed`, les variables d'environnement et le jeu de démonstration (une entreprise, un RH, un manager racine, un employé, deux notes) sont inchangés. Le script garde le compte de préparation, aucun droit de modification n'est ouvert au propriétaire.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| scripts/seed.mjs, `readReceipt` (l. 80) | Lecture de l'objet : `null` seulement pour `NoSuchKey`, toute autre panne propagée | Distinguer absent et panne |
| scripts/seed.mjs, `ensureReceipt` (l. 91) | Dépôt si absent ou différent, puis relecture | Reçu conforme sans upload inutile |
| scripts/seed.mjs, `seedExpenseNote` (l. 116) | Création incomplete + clé prévue en transaction, reprise selon l'état réel, finalisation de `incomplete` seulement | Même note, même clé, décisions conservées |
| scripts/seed.mjs, `verifySeed` (l. 157) | Contrôle final note, statut, référence et contenu de l'objet | Pas de faux succès |
| scripts/seed.mjs, bloc `catch` final | Message d'erreur et code de sortie 1 | Échec explicite |

#### Nouveau fonctionnement

`npm run seed` → comptes et rattachements → pour chaque note : relecture (la plus ancienne si des doublons historiques existent, avec un avertissement) → absente : création incomplete ; reçu : conforme réutilisé, sinon déposé et relu ; référence rétablie ; incomplete → pending → vérification finale de toutes les données attendues → exit 0. Une panne S3 pendant la réparation laisse la note et la clé en l'état et sort en erreur ; la relance reprend la même note. Deux lancements successifs sur des données complètes n'écrivent rien.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| Suites complètes, issue AUD-018 (vrai script, DB et S3 isolés) | SEED-002 vert, cas ajoutés verts | AUD-018 : 10/10 réussis (SEED-002 était rouge ; SEED-004 à 010 ajoutés : objet présent/référence absente, référence présente/objet absent, décision conservée, échec explicite, objet différent, incomplete, deuxième lancement sans écriture) | `reports/issues.json`, 2026-10-19 |
| Cas ajoutés sur le seed précédent (`1746cdb`, clone jetable) | Les cas `correction` échouent | SEED-004 à 009 : 6 échecs sur 6 ; SEED-010 (référence) réussit | Sortie locale 2026-10-19 |
| `npm run ci:docs` ; `lint` ; `typecheck` ; `build` | exit 0 | exit 0 chacun (241 tests identifiés) | Sortie locale 2026-10-19 |
| `npm run test:unit` | Pas de régression | 22/22 réussis | `reports/unit.json` |
| `npm run test:api` (complète) | Aucune régression | exit 1 ; 139 réussis, 18 échoués sur 157 (référence `feat/spec-09` : 131/150) | `reports/issues.json` |
| `npm run test:e2e` (complète) | Aucune régression | exit 1 ; 61 réussis, 1 échoué sur 62 (INS-006, SPEC-05) | `reports/issues.json` |
| `npm run test:report` | Bilan agrégé | exit 1 ; 222 réussis, 19 échoués sur 241 (référence : 214/234) | `reports/issues.json` |

#### Écarts et limites

Le script ne verrouille pas contre deux lancements simultanés (non demandé) : deux seeds parallèles sur une base vide pourraient créer deux notes. La détection des doublons historiques se limite à conserver la plus ancienne. Le seed n'écrit pas de clé de demande (`request_key`) : ses notes ne sont pas reprenables par l'API de soumission, ce qui n'est pas leur usage. Le jeu de démonstration reste celui de l'audit (un seul domaine d'entreprise) ; la vérification à deux entreprises est assurée par les fixtures des autres tests, pas par le seed. Le seed exige le schéma de SPEC-09 (statut `incomplete`) : lancé avant la migration, il échoue explicitement.
