# Inscription atomique de l'entreprise et du premier RH

Statut : accepté le 14 octobre 2026, non implémenté. Problème : AUD-013. Source : `265924bc7274047989e708ab635c2854d376230f`, `src/app/actions/auth.ts:44–69`.

Les créations de l'entreprise et du premier RH utilisent actuellement deux écritures PostgreSQL indépendantes. Nous retenons une transaction unique sur une connexion : les créations sont validées ensemble ou les écritures de cette tentative sont annulées ensemble. La connexion automatique intervient après commit. Cette frontière protège la cohérence de l'inscription sans créer de workflow durable de reprise pour ces deux écritures dans une même base.

Alternatives : conserver les écritures indépendantes avec reprise (précédemment retenu, maintenant remplacé) impose état durable et preuve de propriété ; supprimer l'entreprise après échec est une compensation qui peut elle-même échouer. La transaction est plus simple pour le périmètre actuel. Elle ne couvre pas une réponse perdue après commit ni des effets externes.

Préserver la branche d'inscription dans une entreprise existante, les rôles attendus, les contrats API/UI et les commandes build/README. Pas de changement de schéma requis par le seul regroupement transactionnel ; les anciennes entreprises incomplètes demandent une investigation séparée. Retour arrière : revenir au code précédent n'annule pas les inscriptions déjà validées ; ne pas supprimer les données.

Validation prévue sur données isolées : succès, échec de création RH avec rollback, réessai, entreprise existante, concurrence et échec de connexion après commit. Tests exécutés : 0. Lien avec le cours : cohérence transactionnelle et choix du mécanisme le plus simple adapté aux dépendances réelles. Reconsidérer si la création implique un système externe ou nécessite une reprise durable métier.
