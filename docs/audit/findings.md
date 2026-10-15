# Constats et hypothèses

Actualisation après campagne : [mesures et preuves](mesures-et-preuves.md). 47 vérifications, 26 conformes et 21 écarts ; la table de lecture ci-dessous est historique et ne remplace pas ces exécutions. Les solutions retenues sont dans le journal actuel. Nouvelle observation AUD-023 : alertes de dépendances à qualifier.

Updated: 2026-10-14. Base: `265924bc7274047989e708ab635c2854d376230f`. The [complete issue index](issues.md) includes every registered ID and distinguishes audit-process records from application risks. La table initiale ci-dessous contient des observations source dont les conséquences runtime restent non vérifiées ; les nouvelles mesures isolées sont décrites dans la section complémentaire. Severity is provisional investigation priority, not proven exploit severity.

| ID | Observation / evidence | Hypothesis / impact to verify | Validation next |
| --- | --- | --- | --- |
| AUD-003 | Submission commits insert before storage; later direct update: route 88–108 | Partial failure can separate note and receipt state | Controlled S3 failure in isolated fixture after learning gate |
| AUD-004 | Own-list query interpolates sort: route 42–46 | Unbounded SQL expression/invalid sort; exploitability undecided | Supported/unexpected inputs and driver behavior |
| AUD-005 | `src/lib/errors.ts` returns error message and stack | Internal details visible when caught exceptions occur | Controlled HTTP error and response |
| AUD-006 | Manager receipt route checks role and queries ID only; manager assignment's chosen-manager lookup lacks company constraint; migration manager reference is only user ID | Unrelated/cross-company access or assignment depending on runtime privileges/RLS | Two-company fixtures; verify effective DB role first |
| AUD-007 | Approval and rejection select pending then update by ID without pending predicate | Concurrent conflicting decisions may overwrite | Two simultaneous requests with deterministic initial pending row |
| AUD-008 | OCR buffers input without size limit and creates worker each call | Resource cost on large inputs | Bounded fixed sample, cold/warm protocol; no benchmark claim yet |
| AUD-009 | HR RLS policies lack explicit company equality; FORCE RLS declared | Isolation depends on route filters and effective DB role | Inspect privileges, BYPASSRLS/superuser, direct and HTTP checks |
| AUD-010 | `src/lib/auth.ts` uses a source constant as signing secret rather than environment | Known signing material may undermine session trust | Separate auth investigation; do not reproduce secret in evidence |

Les relectures consignées établissent ces constructions au SHA de référence ; elles ne prouvent pas le comportement runtime. They do not prove exploitation or user-visible failure. Further entries must include expected rule, fixture, command, actual result, confidence, impact, options, acceptance test and limits before a confirmed defect claim.

## Observations supplémentaires et décisions

| Sujet | Observation au SHA de référence | Validation à préparer |
| --- | --- | --- |
| AUD-013 | auth.ts:44–69 crée entreprise et compte via des appels indépendants | Panne contrôlée, persistance et rollback de la transaction choisie, réessai et concurrence |
| AUD-014 | route de création:69–79 utilise parseFloat puis fini/positif | Entrées mal formées, point/virgule, arrondi DB existant et compatibilité |
| AUD-015 | même route:74 vérifie seulement le type chaîne de la date | Format, jour réel, limites et compatibilité du refus des dates futures |
| G10 | auth.ts:45–55 copie le rôle dans la session ; route RH users:8 l'utilise | Rôle changé avec session conservée, nouveaux droits et périmètres |
| G14 | création:81–85 vérifie type annoncé/taille, puis stocke les octets | Faux type, formats légitimes, contenu détecté et compatibilité |

Les directions actuelles sont dans [le journal](DECISION_LOG.md) et les solutions liées. Inscription : transaction unique, sans ancien workflow de reprise. OCR : pool sans file, 40 secondes maximum. Secret reporté ; formats formels à respecter sans expansion. Aucun incident, exploit, benchmark ou test de non-régression confirmé par cet entretien.

## Passe complémentaire des commentaires

Passe ultérieure des axes : AUD-019 (confiance domaine email), AUD-020 (JSON invalide converti en retrait de manager), AUD-021 (cycles à définir), AUD-022 (volume des listes à mesurer). [Source, attendu et limites](next-issues.md). Pour AUD-020, huit observations de parsing avec déclarations extraites : six entrées mal formées/incomplètes donnent la même valeur null que le retrait explicite valide. Pas d'écriture ni de route HTTP exécutée. Les autres nouveaux points sont source/hypothèse ou clarification métier ; aucune solution sélectionnée.

[Revue du 14 octobre](comment-review.md), SHA inchangé : 12 groupes src dans 10 fichiers, comparaison avec les constats existants. AUD-016 (gestion d'erreurs réseau) et AUD-017 (jour affiché selon fuseau) reproduits sur code isolé ; AUD-018 (seed incomplet non repris) est une hypothèse source non exécutée. Ajouter aux vérifications les interactions compte DB restrictif/contexte finalisation et les réponses OCR vides après erreur. Aucune nouvelle correction sélectionnée.

MEASUREMENT : 9 contrôles de succès et 9 pannes fetch simulées sur handlers extraits ; 3 observations de fuseau. Ne pas confondre ces mesures avec des tests navigateur/API/DB ou une suite applicative passée. Les anciennes phrases « runtime non vérifié » restent exactes pour les services applicatifs, pas pour ces nouvelles observations isolées.

Proposition de vérification après baseline : périmètres reçus/manager et isolation effective (AUD-006/AUD-009), puis cohérence note/reçu (AUD-003). Ce classement reste proposé, non accepté. Fixtures deux entreprises, accès légitimes/interdits et rôle DB effectif à vérifier avant conclusions.