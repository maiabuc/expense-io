# AUD-005 — Erreurs publiques et diagnostics internes

Décision acceptée, contrat précis à préparer ; non implémenté. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème et preuves

OBSERVATION : [errors.ts:2–5](../../../src/lib/errors.ts#L2) journalise déjà l'exception, puis transmet son message brut et sa stack au client avec HTTP 500. Une stack décrit les appels et emplacements internes ; le message DB peut exposer des détails inutiles au public. Aucun exemple de fuite HTTP ni exploit démontré.

Le [consommateur UI:93–99](../../../src/app/expenses/page.tsx#L93) attend une chaîne `error`, sinon affiche un message de secours.

## Solution retenue

- Afficher uniquement un message compréhensible en français dans l'UI standard.
- Conserver code technique, description et diagnostics utiles dans des logs internes structurés, sans secrets ; ne pas envoyer stack ou message DB brut au client.
- Utiliser des codes HTTP adaptés et préserver le format compatible avec les appels API et le champ `error` existant.
- Les erreurs API standard déjà en anglais peuvent rester ; pas de traduction globale ni renommage des identifiants.
- Conserver polices, couleurs et positions. La présence d'un code technique dans la réponse n'est pas requise et ne doit pas être ajoutée par défaut.

Pourquoi : séparer feedback utilisateur et diagnostic tout en limitant les changements de consommateurs. Le logging existe déjà ; il doit rester utile et sûr. Pour les erreurs d'infrastructure inattendues, HTTP 500 avec message contrôlé est proposé, pas un traitement universel de toutes les erreurs. Catalogue, mapping HTTP, format de logs et éventuelle corrélation à définir ; aucun standard nommé ni refonte API sélectionné.

## Alternatives et validation

Retirer seulement la stack reste insuffisant si le message brut révèle des détails. Une convention publique plus large exige inventaire et adaptation des consommateurs ; elle n'est pas retenue pour son seul nom. Un identifiant de corrélation reste une option distincte du code technique, pas une décision acquise.

Provoquer une exception contrôlée via HTTP sur données isolées ; vérifier réponse publique sans détails internes, statut adapté, diagnostic utile et gestion UI inchangée. Vérifier séparément les entrées invalides et erreurs attendues. Tests exécutés : 0 ; application inchangée. [Journal](../DECISION_LOG.md).

## Actualisation des preuves — campagne du 14–15 octobre

Stack publique observée sur date impossible et panne de stockage. Aucun secret réel sauvegardé ; code corrigé et format futur non testés. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
