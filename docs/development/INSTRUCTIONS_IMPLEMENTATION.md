# Instructions de spécification et d'implémentation

Règles de travail des agents de développement, établies avec Maia le 15 octobre 2026. Avant une spec, une réalisation ou sa revue, lire ce fichier. La priorité revient aux instructions explicites de Maia ; les anciens documents de contexte restent des sources historiques.

## Références et périmètre

Lire la fiche d'issue, puis les parties concernées des [contrats](../audit/01-contrats-implementation.md), [permissions/transitions](../audit/02-permissions-et-transitions.md), [responsabilités/dépendances](../audit/03-perimetre-et-dependances.md), [validation](../audit/04-reference-de-validation.md) et [lots/acceptation](../audit/05-lots-et-acceptation.md). Les sources originales sont fixées au SHA d'audit ; relire le code actuel avant de modifier.

Une décision acceptée indique quoi réaliser ; une proposition conditionnelle ou un report ne vaut pas autorisation générale. Travailler dans le lot demandé ou le périmètre déjà délégué, sans redemander un accord sur une décision acquise. AUD-010 reste reporté ; AUD-022/023 gardent leurs conditions. Aucun plan de migration/retour arrière à produire, conformément à Maia. Préserver les données reste obligatoire.

En cas de divergence, appliquer l'instruction utilisateur la plus récente. Une simple préférence technique peut être résolue et justifiée dans la spec. Une modification de règle métier, droit, contrat public ou périmètre non autorisée exige une clarification sur ce point ; poursuivre les travaux indépendants. Consigner l'écart dans le journal et en ajout dans la fiche, sans transformer une proposition technique en réponse attribuée à Maia.

## 1. Délimiter et spécifier

Avant le premier changement applicatif, utiliser le [modèle de spec](MODELE_SPEC.md), dans `docs/specs/<ID-ou-lot>-<sujet>.md`. Une spec par résultat cohérent suffit ; ne pas recopier les cinq documents ou rédiger une spec par fichier. La spec précise :

- IDs traités, objectif et comportement observable attendu ; révision de départ et état local pertinent.
- Parcours actuel et cible, contrats applicables, invariants et différences intentionnelles.
- Fichiers prévus, dépendances avec d'autres lots et interfaces partagées.
- Critères d'acceptation vérifiables et contrôles à exécuter ; limites connues.

Critère de fin : un développeur peut dire quoi changer et comment vérifier le résultat sans inventer une règle métier. Une spec rédigée n'est pas une implémentation. La rédaction du modèle n'impose pas une nouvelle validation utilisateur lorsque la réalisation est déjà autorisée.

## 2. Capturer et préparer

Préserver les modifications locales. Relire les consommateurs et dépendances des fichiers concernés. Pour une modification structurante, expliquer un flux concret avant de coder, suivant AGENTS.md ; ne pas inférer une compréhension indépendante d'un assentiment ni recommencer un quiz déjà suspendu.

Capturer les fiches avant toute modification dans cette tâche :

```bash
node docs/audit/tools/check-append-only.mjs capture --snapshot /tmp/arla-audit-<tache>.json
```

Remplacer `<tache>` par un identifiant unique. Conserver ce snapshot jusqu'à la revue. Le manifeste permanent protège le contenu original des fiches ; le snapshot de tâche protège aussi tous les ajouts des interventions précédentes. Capturer après une réécriture ne constitue pas une vérification valable.

Critère de fin : source actuelle relue, périmètre clair, préfixes capturés, référence fonctionnelle pertinente connue. Préparer les tests manquants nécessaires au changement avant de prétendre préserver le parcours.

## 3. Réaliser un changement ciblé

Appliquer les invariants et la répartition des responsabilités du fichier 3. Garder les transactions et protections concurrentes réellement efficaces, pas seulement des vérifications en mémoire. Les contrôles de droits serveur restent liés au rôle actuel, à l'entreprise et à la ressource. Distinguer les permissions manager et RH.

Préserver les contrats et comportements légitimes ; les écarts intentionnels sont ceux explicités dans la spec. Conserver commandes README/build et apparence UI ; réaliser seulement les adaptations de reprise/erreur retenues. Rédiger commentaires, explications et nouveaux messages en français ; préserver les identifiants et erreurs standard existants nécessaires à la compatibilité.

Séparer correction, extraction structurelle et formatage. Ajouter une interface ou dépendance seulement pour un besoin du lot démontré. Coordonner les contrats/fichiers partagés entre agents ; ne pas écraser un travail local ou rétablir silencieusement une ancienne version du contrat.

Critère de fin : chaque modification sert un critère de la spec, sans changement fonctionnel ou infrastructure supplémentaire non autorisé.

## 4. Vérifier réellement

Exécuter les contrôles pertinents du fichier 4 et les commandes requises par le lot. Pour une correction de règle, permission, concurrence ou reprise, vérifier aussi refus, pannes et contrôle positif. Compléter les doubles par PostgreSQL/S3/OCR réels lorsque la propriété dépend de leur comportement.

Garder les assertions de référence et les tests du professeur. Un échec est expliqué et corrigé, pas supprimé, ignoré ou masqué par une nouvelle attente. Les essais utilisent des services et données isolés ; aucun seed, nettoyage ou arrêt des services utilisateur. Garder secrets, cookies et URLs signées hors des preuves.

Enregistrer commandes exactes, environnement, sorties utiles, codes de sortie, comptes réellement exécutés et limites. Ne pas présenter l'ancien SHA de départ comme le commit contenant le nouveau code : indiquer commit de réalisation s'il existe, sinon diff local daté. Un build réussi ne prouve pas les droits, le workflow ou l'UI.

Critère de fin : résultats réels disponibles. Si un contrôle requis est bloqué ou échoue, marquer la réalisation partielle/non vérifiée et expliquer ce qui manque ; ne pas annoncer le lot terminé.

## 5. Ajouter IMPLEMENTATION dans chaque fiche concernée

**Contenu existant immuable.** Dans chaque fiche AUD réellement concernée, ajouter en fin de fichier `## IMPLEMENTATION`, puis une entrée datée selon le modèle ci-dessous. La même règle s'applique à G10 et G14. Si la section existe déjà, ajouter une nouvelle sous-section datée à sa fin, sans modifier les entrées précédentes. Une réalisation multi-issues ajoute une entrée spécifique à chaque fiche, avec liens vers spec et preuves communes plutôt que duplication intégrale.

Les anciens statuts « non implémenté », observations ou chiffres restent écrits : l'entrée datée établit l'état actuel. Une erreur historique ou une solution finalement ajustée est expliquée dans le nouvel ajout, avec sa raison ; ne pas corriger rétroactivement le récit d'audit. Un changement documentaire de préparation ne reçoit pas une fausse mention de correction applicative réalisée.

Quand plusieurs agents travaillent en parallèle, attribuer l'écriture de chaque fiche à un responsable et sérialiser ses ajouts. Relire sa dernière version avant d'ajouter ; le snapshot de début de tâche ne remplace pas la coordination des contributions apparues ensuite.

```markdown
## IMPLEMENTATION

### <date> — <lot ou changement>

Statut : partielle / implémentée, validation incomplète / implémentée et vérifiée sur le périmètre décrit.
Spec : <lien>. Révision de départ : <SHA>. Réalisation : <commit existant ou diff local daté>.

#### Ce qui a été implémenté

<Changements réellement réalisés pour cette issue ; périmètre encore absent s'il y en a.>

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| <chemin + fonction ou lignes sur révision identifiée> | <changement> | <responsabilité> |

#### Nouveau fonctionnement

<Décrire dans l'ordre : action utilisateur → route/module → droits/règles → DB/stockage → réponse/UI.>
<Expliquer répétition, concurrence ou échec pertinents ; graphe seulement si utile.>

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| <contrôle> | <critère> | <exit code, réussites/échecs/non exécutés> | <lien> |

#### Écarts et limites

<Différence avec la proposition d'origine, justification, travail restant ou absence d'écart.>
```

Pour les réalisations suivantes, réutiliser uniquement la sous-section `### <date> — ...` dans le bloc IMPLEMENTATION déjà créé. Garder les explications compréhensibles : un diff ou une liste de fichiers ne décrit pas le nouveau fonctionnement.

## 6. Contrôler la documentation et restituer

```bash
node docs/audit/tools/check-append-only.mjs check --snapshot /tmp/arla-audit-<tache>.json
```

Le contrôle vérifie préfixes immuables, présence de la section lors d'un ajout et conservation des fiches. Il ne certifie pas la justesse du texte ou du code. Un échec de préfixe exige de rétablir exactement l'ancien texte et de porter la correction en ajout ; ne pas régénérer le manifeste pour obtenir un succès.

Mettre à jour la spec et le journal des décisions avec des liens vers les nouvelles entrées, sans réécrire les fiches AUD. Vérifier les liens et le diff final. Les nouveaux défauts découverts restent distincts du lot courant ; leur existence n'autorise pas une correction hors périmètre.

Critère de fin : code, validation réelle, fiche(s) ajoutée(s), spec et journal cohérents ; préfixes conservés ; aucun lot partiel présenté comme terminé. Répondre à Maia avec résultat, fichiers, preuves et limites, sans redemander l'autorisation d'un travail déjà délégué.
