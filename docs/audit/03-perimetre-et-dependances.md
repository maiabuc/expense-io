# 3 — Périmètre, architecture et dépendances

15 octobre 2026. Source originale : `265924bc7274047989e708ab635c2854d376230f`. Ce fichier remplace le livrable de migration/retour arrière expressément écarté par Maia. Il fixe les responsabilités et les dépendances de réalisation ; il ne contient pas de procédure de migration ou de rollback.

## Périmètre retenu

Conserver Next.js, PostgreSQL, S3-compatible, OCR local et monolithe. Préserver les commandes README/build, les styles et la disposition des écrans. Corrections retenues dans les [solutions](README.md), selon [contrats](01-contrats-implementation.md) et [permissions](02-permissions-et-transitions.md). La reprise accepted d'AUD-003 est explicitée dans le formulaire existant, pas dans une nouvelle application.

Pas de nouvelle file OCR, service réseau, notification activée, conversion REST générale, bibliothèque cliente obligatoire ou framework d'injection. Pas de changement de région stockée, de devises ou de multi-région. La géographie de référence de la validation de date est Europe/Paris ; le format d'échange reste yyyy-mm-dd.

AUD-019 est conservé comme convention pédagogique. AUD-010 est reporté au professeur. AUD-022 reste conditionné à une optimisation simple et utile ; aucun gain HTTP démontré. AUD-023 demande une qualification d'avis avant sélection d'une mise à jour. Ces points ne sont pas des correctifs acceptés sans condition.

## Premier module hexagonal : soumission

Un module possède une interface et une implémentation. Son interface doit permettre de demander une soumission/reprise sans exposer aux appelants les séquences SQL/S3, les conflits et la vérification du reçu. C'est ce comportement utile qui justifie l'extraction, pas le nombre de dossiers. [ADR accepté](../adr/0002-hexagonal-soumission.md), source originale `src/app/api/expense-notes/route.ts:56–110`.

| Élément | Responsabilité et données admises | Ce qui reste hors de sa responsabilité |
| --- | --- | --- |
| Route Next | Authentifier, adapter multipart/en-tête, appeler le module, traduire résultats/erreurs vers HTTP | Orchestrer directement toute la reprise ou passer un client SQL dans le métier |
| Interface de soumission | Acteur authentifié, demande stable, données de note, reçu facultatif dans le seul cas de reprise vérifiée ; résultat nouvelle finalisation ou demande existante | Request/Response Next, PoolClient, types AWS, rôles transmis comme autorité par le navigateur |
| Implémentation applicative | Valider règles, réserver/relire la demande, vérifier le reçu, orchestrer finalisation et résultats incertains | Dépendre de Next.js, pg ou du SDK S3 ; ouvrir elle-même une connexion concrète |
| Interface de persistance | Opérations métier atomiques : réserver/retrouver une demande, contrôler son exécution et finaliser sous propriétaire/état autorisés | CRUD universel, SQL fourni par l'appelant ou transaction laissée ouverte pendant S3 |
| Adaptateur PostgreSQL | Unicité, transactions courtes, contexte RLS, périmètres et conditions atomiques, vérification du résultat de commit | Décider seul d'un nouveau parcours métier ou contourner RLS pour réussir |
| Interface de reçu | Vérifier existence/conformité à la demande et stocker à une clé prévue contrôlée par le serveur | Autoriser une ressource à partir d'une clé cliente ou confondre clé prévue et objet présent |
| Adaptateur S3 | Put/Head/Get nécessaires à la vérification ; cohérence des métadonnées/empreinte selon contrat | Transformer une panne en succès, supprimer un objet après commit incertain sans relecture |
| Adaptateurs de test | Provoquer les résultats de persistance/stockage à travers les mêmes interfaces | Remplacer la preuve d'intégration PostgreSQL/RLS/S3 réelle |

Le reçu doit être comparable à sa demande par empreinte et taille ; l'existence d'un objet seule ne suffit pas à réutiliser un fichier incompatible. Les erreurs du module sont des résultats/erreurs métier indépendants de HTTP, traduits par la route vers le catalogue du fichier 1.

Proposition de surface publique minimale : une opération de soumission/reprise ; les opérations internes des adaptateurs peuvent être plus nombreuses mais restent cachées aux routes. Ne pas conserver une ancienne orchestration parallèle en route. Ne pas brancher les classes existantes uniquement pour leur donner un consommateur : les adapter seulement si elles expriment les règles nécessaires. Les noms concrets de fichiers peuvent suivre les conventions du dépôt ; pas de générateur de classes obligatoire.

## Règles de dépendance vérifiables

1. Dans le premier module cible, domaine et orchestration n'importent ni Next.js, ni pg, ni SDK AWS. Les adaptateurs dépendent des interfaces utiles au module.
2. Le point d'assemblage concret instancie les adaptateurs puis les passe à l'implémentation. Une injection par paramètres suffit.
3. Les autres routes ne sont pas automatiquement réécrites dans ce lot. Ne pas présenter tout le dépôt comme hexagonal après une seule extraction.
4. Les permissions manager et RH gardent leurs différences. Un helper peut partager une opération technique, pas élargir les droits pour uniformiser le code.
5. Invariants de concurrence garantis dans les opérations DB atomiques ; règles pures testables sans DB ; deux vérifications complémentaires, aucune ne remplace l'autre.
6. Les modules n'utilisent pas de singleton global comme coordination entre plusieurs instances. Un pool OCR par processus peut être global dans ce processus, mais sa capacité globale dépend du nombre de processus.

## Dépendances entre corrections

| Groupe | À préparer ensemble | Pourquoi |
| --- | --- | --- |
| AUD-005/008/016/020 | Catalogue d'erreurs et consommation UI | Même distinction entre erreur HTTP, transport, panne OCR et succès vide |
| AUD-006/020/021/G10 | Une affectation cohérente | Validation, rôle actuel, entreprise et cycle touchent le même parcours |
| AUD-003/009 | Soumission, compte DB et permissions bornées | Rendre RLS effective ne doit pas empêcher la finalisation du reçu |
| AUD-003/007 | États et écriture atomique | Une reprise ne doit pas écraser une décision ; incomplete non décidable |
| AUD-003/018 | Soumission et données de démonstration | Le seed doit respecter le schéma et les états utilisés, sans doublon ou réinitialisation |
| AUD-014/015/017/G14 | Validation et représentation | La date reste calendaire, le montant garde son arrondi DB, le format de reçu reste distinct de l'OCR |
| AUD-013/019 | Inscription atomique et convention conservée | Corriger les écritures partielles sans ajouter vérification email/invitation |

Les changements de schéma nécessaires aux corrections acceptées ne sont pas annulés par l'exclusion du plan documentaire. Ils restent dans les fichiers de réalisation concernés et doivent respecter les invariants ; aucun service ou donnée local n'est modifié pendant cet audit.

## Organisation du travail

Une personne responsable par lot et par contrat partagé, à attribuer au démarrage ; aucun nom d'équipe n'est inventé. Les équipes peuvent préparer leurs tests en parallèle. Les modifications du même contrat, de la route d'affectation ou de l'état de soumission doivent être coordonnées avant intégration, même si les fichiers ne se chevauchent pas.

Garder distincts les commits de correction, d'extraction et de formatage. Leur validation et leur livraison restent coordonnées lorsque les règles l'exigent. L'ordre proposé et les critères sont dans le [fichier 5](05-lots-et-acceptation.md).
