# Introduire un module hexagonal pour la soumission

Statut : accepté le 14 octobre 2026, non implémenté. Architecture hexagonale simple et progressive validée explicitement. Source : `265924bc7274047989e708ab635c2854d376230f`. Problèmes liés : AUD-003/AUD-009 et tests de panne.

Les routes utilisent directement SQL/S3 ; les classes domain et adaptateurs existants ne sont pas raccordés. La soumission doit gérer persistance partielle, reprise et identifiant stable. Nous retenons de conserver le monolithe et d'isoler ce flux dans un module application indépendant de Next.js/pg/S3, avec ports métier bornés et adaptateurs PostgreSQL/S3 ou de test.

Alternatives : conserver toute l'orchestration dans la route minimise les fichiers mais lie les scénarios de panne à HTTP/infrastructure ; réécrire tout le projet multiplie les changements avant une baseline ; l'extraction ciblée permet de vérifier un bénéfice réel avant extension. Cette proposition n'impose pas de centralisation des permissions manager/RH et n'active pas la notification inutilisée.

Contraintes : contrats et UI conservés, commandes inchangées, pas de dépendance/infrastructure ajoutée pour illustrer le cours. Transactions, RLS et unicité restent dans l'adaptateur DB avec contrats testés en intégration ; un double ne prouve pas leur fonctionnement réel.

Avant implémentation : référence fonctionnelle/contrats, environnement isolé, explication du flux et panne prédite. Aucun test de cette cible exécuté. Extraction structurelle séparée des corrections ; retour arrière sans effacer les données. Reconsidérer si l'interface ne fait que déléguer sans cacher l'orchestration ou si les tests n'y gagnent pas en lisibilité. [Analyse et périmètre](../audit/structure-review.md).
