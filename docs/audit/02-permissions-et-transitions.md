# 2 — Permissions et transitions de référence

15 octobre 2026. Source originale : `265924bc7274047989e708ab635c2854d376230f`. Règles cibles des décisions AUD-003/006/007/009/020/021 et G10. [Contrats](01-contrats-implementation.md), [preuves existantes](mesures-et-preuves.md).

## Identité et périmètres

Authentifier avec la session ; relire en DB le rôle et l'entreprise actuels pour chaque nouvelle requête protégée. Compte supprimé ou identité inexistante → refus. Le rôle fourni par le client ou l'ancienne copie de session ne donne pas de droit. Les actions déjà engagées et les liens S3 déjà émis ne sont pas déclarés instantanément révocables.

Une relation de manager est directe : si A gère B et B gère C, cela ne donne pas automatiquement à A les notes de C. L'entreprise du demandeur doit correspondre à celle du propriétaire. Le rôle hr_admin n'ouvre pas toutes les notes de l'entreprise : le périmètre de review actuel reste celui des managers racines.

## Matrice action × acteur × ressource

| Action | employee | manager | hr_admin | Conditions communes |
| --- | --- | --- | --- | --- |
| Créer sa note / demander OCR | Oui | Oui | Oui | Identité actuelle valide, contrôles d'entrée ; aucune création pour autrui |
| Lire ses notes et ses reçus | Oui | Oui | Oui | Propriétaire authentifié ; reçu stocké exploitable ; pas de restriction nouvelle aux seuls pending |
| Reprendre sa soumission incomplete | Oui | Oui | Oui | Propriétaire, demande liée et contenu cohérent ; pas de changement d'identité via clé |
| Lire la liste manager | Non | Oui | Non | Collaborateurs directs, même entreprise, notes pending uniquement |
| Voir reçu d'un collaborateur | Non | Oui | Non | Collaborateur direct et même entreprise ; note existante et objet exploitable ; états décidés pas retirés automatiquement |
| Approuver/rejeter un collaborateur | Non | Oui | Non | Collaborateur direct, même entreprise, état pending à l'écriture |
| Lire liste RH / reçu d'un manager racine | Non | Non | Oui | Propriétaire manager actuel sans manager, même entreprise ; liste pending, reçu sans nouveau filtre d'état |
| Approuver/rejeter un manager racine | Non | Non | Oui | Même entreprise et statut pending à l'écriture |
| Consulter l'annuaire / affecter un manager | Non | Non | Oui | Cible employee ou manager de la même entreprise ; manager choisi de rôle manager actuel, même entreprise ; aucune boucle |
| Retirer explicitement un manager | Non | Non | Oui | Même cible autorisée ; managerId présent et null ; corps invalide ne retire rien |

La note personnelle d'un manager subordonné suit le circuit de son propre manager. Celle d'un manager racine suit RH. Aucun circuit d'approbation nouveau pour une note de RH ou un employé sans manager n'est inventé : conserver cette limite du produit et ne pas accorder un droit global pour la masquer.

## Garde-fous communs API et DB

- Interdire l'accès interentreprises et les relations manager interentreprises ; contrôle API et intégrité DB se complètent.
- Interdire auto-affectation et cycles ; sérialiser vérification/écriture de hiérarchie selon le contrat du fichier 1.
- Interdire l'auto-approbation. Le droit du propriétaire à finaliser son reçu ne donne pas le droit de décider sa note.
- Compte applicatif appliquant réellement RLS ; compte de préparation séparé si nécessaire. Ne pas déduire l'efficacité de FORCE RLS quand le compte est superuser/BYPASSRLS.
- Toute transaction manipulant les notes sous RLS pose l'identité serveur dans sa portée ; aucune identité héritée d'une requête précédente dans le pool.
- Politiques manager/RH : vérifier rôle actuel, entreprise et relation ; une politique permissive parallèle ne doit pas rouvrir un accès interdit.
- Limiter les écritures du propriétaire à la finalisation autorisée via une opération DB bornée ; un UPDATE propriétaire général est interdit. Les moyens SQL précis doivent être examinés en intégration, y compris la modification directe de colonnes protégées.

Sources : `src/lib/db.ts:29–47`, `migrations/1700000000001_init-schema.sql:42–100`, routes manager et RH. Il n'est pas nécessaire de fusionner leurs règles dans une abstraction générale pour partager cette matrice.

## Transitions de note

| État initial | Opération et acteur | État final | Effet autorisé |
| --- | --- | --- | --- |
| Aucune note | Réservation par demandeur authentifié | incomplete | Une note et sa clé de reçu prévue, avec demande unique |
| incomplete | Upload échoué, absent ou résultat incertain | incomplete | Conserver la même note ; vérifier persistance avant reprise |
| incomplete | Reprise propriétaire, reçu vérifié et finalisation DB réussie | pending | Enregistrer référence valide et état ensemble |
| incomplete | Approve/reject | Refus | Aucune décision et aucune réécriture de statut |
| pending | Approve autorisé atomiquement | approved | Une seule décision ; autorisation et état dans le prédicat d'écriture |
| pending | Reject autorisé atomiquement | rejected | Même protection |
| pending / approved / rejected | Répétition du POST de la même demande | Identique | Retourner la note existante, jamais recréer ou réinitialiser |
| approved / rejected | Nouvelle décision, même ou opposée | Refus 409 | Première décision conservée |

Tous les changements d'état non listés sont refusés. Aucune suppression automatique ou reclassification des notes historiques choisie. La réparation du reçu du seed conserve la note et les décisions existantes.

## Scénarios minimaux de permissions

Pour chaque droit positif, tester un acteur valide puis même rôle hors relation, même rôle dans B, mauvais rôle et absence de session. Employer un ID de ressource réellement existant pour les refus. Répéter les vérifications après changement de rôle et de rattachement avec session conservée. Combiner API et SQL sous compte applicatif non privilégié ; une fixture absente ou une politique refusant tout ne prouve pas une protection correcte.

État : cette matrice est une spécification de la cible. Les cas déjà exécutés sont ceux du rapport de campagne ; aucune réussite supplémentaire n'est acquise par sa rédaction.
