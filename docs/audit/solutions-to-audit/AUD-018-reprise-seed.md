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
