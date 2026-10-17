# Modèle de spec pour un lot ou une issue

Copier ce modèle dans `docs/specs/<ID-ou-lot>-<sujet>.md` pour une réalisation. Remplacer les champs avec des faits ; supprimer les indications du modèle. Suivre les [instructions](INSTRUCTIONS_IMPLEMENTATION.md). Ce fichier n'est pas une autorisation d'implémenter tous les lots.

## Identification

- Objet : <un résultat cohérent>.
- Lot et IDs concernés : <lot, AUD et éventuellement G10/G14>.
- Statut : préparée / en cours / partielle / réalisée et vérifiée sur le périmètre décrit.
- Autorisation/périmètre déjà délégué : <instruction et décisions applicables>.
- Fiches : <liens vers les fiches à conserver et compléter>.
- Source d'audit : 265924bc7274047989e708ab635c2854d376230f.
- Révision actuelle de départ : <SHA et modifications locales pertinentes préservées>.
- Responsable : <si attribué ; sinon non attribué>.

## Problème et parcours actuel

<Résumer le problème, fichier/fonction/ligne actuels et preuve. Lier la fiche originale ; ne pas recopier tout l'audit.>

## Résultat attendu et parcours cible

<Ce que l'utilisateur ou l'appelant observera, puis le flux route/module/droits/persistance/réponse.>

## Contrats et invariants

<Références précises aux fichiers de passation 1/2/3. Entrées/sorties/erreurs/états touchés, droits et effets.>

| Situation importante | Résultat attendu | Effet persistant autorisé |
| --- | --- | --- |
| Succès | <réponse/UI> | <écriture ou aucune> |
| Refus / entrée invalide | <réponse/UI> | <absence de mutation> |
| Panne / répétition / concurrence pertinente | <résultat> | <invariant> |

## Périmètre de changement

| Fichier ou module prévu | Responsabilité du changement | Dépendance / coordination |
| --- | --- | --- |
| <chemin> | <pourquoi> | <contrat ou autre lot> |

<Indiquer les exclusions pertinentes et les différences intentionnelles déjà autorisées. Ne pas inventer un nouveau droit ou nouveau contrat.>

## Critères d'acceptation

| ID local | Condition vérifiable | Moyen de vérification |
| --- | --- | --- |
| C1 | <résultat observable précis> | <test/check pertinent> |
| C2 | <refus ou panne important> | <contrôle positif et négatif> |
| C3 | <compatibilité attendue> | <parcours ou contrat de référence> |

## Réalisation prévue

<Étapes courtes, interfaces réellement nécessaires et dépendances à respecter. Séparer formatage, extraction et correction. Les choix techniques ordinaires se justifient ici ; les décisions métier non autorisées restent à clarifier.>

## Validation à exécuter puis résultats réels

| Commande / scénario | Prévu | Réel : code de sortie et compte | Preuve / limite |
| --- | --- | --- | --- |
| <contrôle pertinent> | <attendu> | Non exécuté | <emplacement prévu> |

<Identifier environnement isolé et limites de la preuve. Ne pas confondre référence originale et commit de réalisation.>

## Traçabilité et fin

- Snapshot de fiches capturé avant travail : <chemin>.
- Entrées IMPLEMENTATION ajoutées : <liens vers chaque fiche concernée>.
- Contrôle d'ajout uniquement : <commande, résultat réel>.
- Journal des décisions : <lien vers actualisation>.
- Réalisation : <commit existant ou diff local daté>.
- Restant / blocage : <fait concret ou aucun sur ce périmètre>.

<Conclure réalisé/partiel selon les critères vérifiés ; aucune case réussie sans exécution. Aucun plan de migration ni retour arrière requis par ce modèle.>
