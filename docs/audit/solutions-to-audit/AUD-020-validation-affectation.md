# AUD-020 — Distinguer erreur de requête et retrait de manager

Statut : direction retenue le 14 octobre 2026, non implémentée. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Localisation initiale et problème

`src/app/api/hr/users/[id]/manager/route.ts:12–13` transforme l'échec de request.json en null, puis managerId absent en null. Les lignes 31–46 sautent la vérification de manager si cette valeur est null ; les lignes 48–51 sauvegardent l'affectation. Le client RH transmet explicitement managerId, y compris null pour un retrait (`src/components/AdminConsole.tsx:74–78`).

Pourquoi c'est un problème : erreur de lecture et demande métier de retrait sont confondues. Une requête mal formée/incomplète peut devenir une modification valide. MEASUREMENT : huit exécutions des deux déclarations extraites ; six corps invalides/incomplets produisent null comme le retrait explicite. [Résultats](../evidence/manager-body-check.json), [protocole](../evidence/manager-body-check.cjs). Aucune mutation HTTP/DB exécutée.

## Solution retenue

Distinguer les erreurs et refuser avant toute mutation :

| Cas | Résultat attendu |
| --- | --- |
| JSON impossible à lire | Erreur spécifique de JSON invalide ; aucune affectation changée |
| JSON lisible mais corps non objet (null, tableau, nombre, chaîne) | Erreur spécifique de structure ; aucune mutation |
| Objet sans champ managerId | Erreur spécifique de champ manquant ; aucune mutation |
| Champ managerId d'un type/format invalide | Erreur spécifique de champ invalide ; aucune mutation |
| Objet avec managerId explicitement null | Demande de retrait valide, avec autorisation existante |
| Objet avec identifiant de manager valide | Vérifier rôle, entreprise et périmètre selon AUD-006 avant affectation |

Utiliser HTTP 400 pour les erreurs de requête, message public compréhensible dans le champ error compatible et code technique distinct en logs internes selon AUD-005. Aucun champ technique nouveau requis dans la réponse. Libellés/codes exacts et validation d'identifiant à préparer. Ne pas utiliser un fallback null pour les erreurs et ne pas supprimer une affectation parce que le champ manque.

Préserver le retrait explicite et l'affectation autorisée, URL/méthode/format standard/UI/commandes. Aucun élargissement des droits ni retrait de fonctionnalité valide. Alternative erreur unique générique ne permet pas le diagnostic demandé ; interprétation implicite en retrait écartée.

## Validation prévue

Sur environnement isolé et acteur RH autorisé : chaque entrée invalide produit une erreur différenciée sans changement de manager ; retrait null et affectation valide comme contrôles positifs. Ajouter mauvais rôle/entreprise, identifiant inexistant et contraintes AUD-006. Vérifier réponses et état DB, pas uniquement le parsing. Aucun test de correction ni changement applicatif.

## Actualisation des preuves — campagne du 14–15 octobre

JSON cassé envoyé par RH autorisé : HTTP 200 et manager_id devient null en DB. Les erreurs différenciées de la cible restent à tester. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
