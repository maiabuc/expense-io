# AUD-010 — Gestion du secret d'authentification

Statut : reporté pour clarification professeur ; aucune solution sélectionnée. Source originale : `265924bc7274047989e708ab635c2854d376230f`.

## Problème, localisation et fonctionnement original

[auth.ts:8](../../../src/lib/auth.ts#L8) définit le secret d'authentification directement dans le source ; [ligne 11](../../../src/lib/auth.ts#L11) le transmet à la configuration d'authentification. Sa valeur n'est volontairement pas reproduite dans le dossier.

Pourquoi c'est un problème : le matériel cryptographique sert à établir la confiance dans les sessions. Une personne qui le possède pourrait compromettre cette confiance ; faisabilité d'une falsification et prérequis restent à tester. Le constat est une constante dans le source, pas une usurpation démontrée.

## Proposition à discuter, non retenue

Une configuration d'environnement privée et stable, accompagnée d'une préparation locale documentée, est une alternative possible. Déplacer un secret hors du code ne signifie pas en générer un différent à chaque lancement : il peut être créé une fois par environnement puis conservé au redémarrage. Les instances qui partagent les sessions doivent disposer d'une configuration compatible.

Changer le secret peut invalider les tokens protégés par l'ancien, sauf mécanisme explicite de rotation/migration acceptant ceux-ci. Stockage de configuration et rotation sont donc deux décisions différentes. Aucun déplacement, génération, rotation ou changement de démarrage n'est sélectionné par cette fiche.

## Clarification et validation

Clarifier avec le professeur le périmètre de la gestion du secret et la manière de préserver un démarrage local reproductible : [question et contexte préparés](../questions-professeur.md). Aucune réponse reçue ni message envoyé par l'agent.

Avant tout changement retenu, caractériser connexion/session, redémarrage et effet intentionnel d'une rotation. Garder les parcours et tests attendus, ne pas exposer le secret dans les fixtures ou rapports. Aucun test de falsification, rotation, démarrage ou correction acquis dans cette fiche.
