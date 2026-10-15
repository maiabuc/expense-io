# Protocole isolé : préparation, exécution et limites

Statut : première campagne exécutée les 14–15 octobre 2026 sur `265924bc7274047989e708ab635c2854d376230f`, à la demande explicite de Maia de commencer les mesures. Le checkpoint pédagogique suspendu n’est pas déclaré acquis. [Résultats](../mesures-et-preuves.md), [harness](runtime-campaign.mjs), [configuration](runtime-20261014/audit-compose.yml).

## Préparer une copie et des services dédiés

1. Extraire ce SHA avec git archive dans `/tmp/expense-io-audit-20261014`. Le harnais vérifié utilise ce chemin fixe. Conserver les fichiers source identiques ; ne pas copier le .env utilisateur. Pour rejouer, recréer une base vide dédiée ; ne jamais lancer prepare sur une base métier.
2. Installer via npm ci en copie séparée, conteneur Node 24 ; enregistrer Node/npm et digest. Ne pas placer une sauvegarde node_modules sous un autre nom dans la racine : ESLint/TypeScript pourraient la scanner. Garder les caches et dépendances de l’utilisateur intacts.
3. Copier la configuration Compose liée ci-dessus. Générer un .env réservé : DATABASE_URL vers `postgres://expense:expense-audit-only@127.0.0.1:15433/expense_io_audit`, AUTH_TRUST_HOST=true, AUTH_SECRET fictif, endpoint S3 `http://127.0.0.1:14567`, région us-east-1, accès test/test, bucket audit-receipts-20261014, force path style true. Le source conserve son secret d’origine sans le reproduire dans les preuves.
4. Vérifier ports/images sans arrêter de service. Démarrer uniquement le projet `expense-audit-20261014`. Appliquer npm run migrate:up et npm run ensure-bucket depuis la copie avec ce .env. Lire les privilèges effectifs ; ne pas remplacer silencieusement le compte Docker superuser par un compte renforcé.

## Exécuter les commandes

Les commandes conservent les scripts d’origine. Les accès réseau/Docker nécessitent l’autorisation de l’environnement d’exécution. Les refus EPERM doivent être consignés et relancés explicitement avec l’autorisation adaptée, jamais contournés silencieusement.

```bash
docker compose -p expense-audit-20261014 -f /tmp/expense-io-audit-20261014/audit-compose.yml up -d
# Depuis la copie, avec son seul .env de test :
npm run migrate:up
npm run ensure-bucket
npm run lint
npm run typecheck
npm run build
# Depuis le dépôt, harnais réservé à ces cibles :
node docs/audit/evidence/runtime-campaign.mjs prepare
```

Le build hôte a échoué sur restrictions de polices/port interne. Le même script réussit en conteneur Node 24 avec la copie montée sous /app, sans changement des polices/code/commandes du README. Lancer ensuite npm run start avec `--port 13400 --hostname 127.0.0.1`, attendre readiness, puis :

```bash
node docs/audit/evidence/runtime-campaign.mjs campaign
```

Le harnais connecte les utilisateurs via HTTP/CSRF, vérifie résultats et effets SQL/S3, teste un rôle DB limité distinct pour RLS, reproduit des lectures SQL chevauchées et mesure vingt requêtes de liste. Son index est strictement expérimental, créé puis supprimé dans la DB d’audit. Il écrit des JSON de résultat dans la copie, sans cookies ni liens signés. Les constats en écart ne font pas échouer le processus du harnais : leur champ pass=false et le compte d’écarts doivent être lus ; ce harnais d’observation n’est pas un check CI de non-régression.

Pour la panne de stockage, lancer une seconde instance sur 13401 en imposant `S3_BUCKET=audit-bucket-absent-20261014` dans l’environnement de ce seul processus, puis :

```bash
node docs/audit/evidence/runtime-campaign.mjs storage-failure
```

Cette phase exécute aussi le seed original sur un troisième domaine fictif, d’abord avec bucket absent puis valide. Aucun log brut affichant les mots de passe de démonstration n’est conservé. Ne pas rejouer les phases dans le désordre ou sur fixtures déjà mutées en prétendant avoir le même état initial.

## Conserver les résultats et nettoyer

Copier JSON, versions, logs de contrôles et configuration sans .env/sessions/secret réel dans evidence/runtime-20261014. Préserver échecs et limites du montage. Distinguer fixtures, assertions, appels mesurés, tests HTTP et navigateur. Stopper uniquement les serveurs nommés expense-audit-20261014-app/failure et le Compose d’audit ; vérifier que les services utilisateur restent actifs. Relever les volumes avant suppression pour ne nettoyer que des ressources identifiées. Les copies /tmp et l’image téléchargée peuvent rester pour examen.

## Reste à exécuter

Navigateur/E2E de référence, inscription et concurrence, reprise/clé stable, décision HTTP concurrente, cycles longs/concurrents, migration/rollback cible, expiration et mesures OCR de charge/CPU/RAM/arrêt. Les tests après correction restent séparés. Le secret reste à clarifier avec le professeur, aucune réussite de ses tests externes n’est inférée.
