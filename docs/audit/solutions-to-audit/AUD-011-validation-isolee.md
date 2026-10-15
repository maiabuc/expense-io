# AUD-011 — Validation avec données séparées

Direction retenue le 14 octobre 2026. Source : `265924bc7274047989e708ab635c2854d376230f`.

## Problème

Pour vérifier les corrections, il faudra provoquer des erreurs et modifier des notes de démonstration. Ces essais ne doivent pas toucher aux données ou services locaux existants. OBSERVATION : [Makefile:45–46](../../../Makefile#L45) lance installation, services, migrations, bucket et seed via la cible dev ; [Makefile:36–43](../../../Makefile#L36) appelle migration et seed. Les [écritures du seed:58–94](../../../scripts/seed.mjs#L58) peuvent changer les rôles/rattachements et ajouter des notes/reçus dans la base configurée. Pourquoi c'est un problème : des essais sur cette cible partagée peuvent altérer les données actuelles et rendre les résultats difficiles à reproduire. C'est une lacune de validation/isolation, pas un échec de démarrage démontré.

## Solution retenue

Données de test séparées. Préparer une base et un stockage de reçus réservés aux vérifications, avec deux entreprises et plusieurs rôles. Conserver les commandes build/README et leurs usages. Ne pas migrer, peupler, nettoyer ni arrêter les services actuels. Mise en place après l'audit, suivant le [protocole isolé](../evidence/runtime-protocol.md).

Alternative écartée : provoquer les pannes sur les données actuelles, avec risque d'altération et résultats difficiles à reproduire. Les copies de données seules ne suffisent pas si les essais ciblent encore les services actuels.

## Validation

Vérifier les cibles DB/stockage et l'isolation avant les écritures ; documenter fixtures, SHA, commandes et résultats. Aucun environnement créé, aucun test exécuté dans cet entretien. Les choix techniques précis restent à vérifier avant exécution.

## Actualisation des preuves — campagne du 14–15 octobre

Isolation mise en place sur demande explicite de Maia : projet Docker dédié, DB/S3 sur ports 15433/14567, deux entreprises et dix comptes fictifs. Campagne puis nettoyage des conteneurs/réseau dédiés, services utilisateur préservés. [Rapport et résultats bruts](../mesures-et-preuves.md). Les mentions de non-exécution précédentes décrivent la preuve initiale ; aucune validation de correction n’est acquise.
