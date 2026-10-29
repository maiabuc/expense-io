# ARLA — Registre des issues

Updated: 2026-10-14. Source SHA: `265924bc7274047989e708ab635c2854d376230f`.

This is the complete index of **currently registered** AUD IDs, not a claim that the repository audit is exhaustive. Source patterns were rechecked; application startup, HTTP scenarios, races and performance measurements remain unexecuted. A selected design is not an implemented or verified fix.

## Numbering and record types

AUD IDs originally covered both application risks and audit-process records. During cleanup, AUD-002 and AUD-012 disappeared from the central decision table; AUD-010 stayed only in findings.md. All are restored here and in the decision index. Keep IDs stable, retain consolidated/resolved records and never reuse their numbers.

AUD-001, AUD-002, AUD-011 and AUD-012 concern audit provenance, method or validation. They are not four application defects. AUD-003 through AUD-010 and AUD-013 through AUD-015 identify source-observed application risks with runtime consequences still to validate. G10 role freshness and G14 receipt content are also documented scopes, without reusing an AUD ID.

## All registered IDs

| ID | Type / issue | What is the issue? | Why it matters | Original evidence | Current status |
| --- | --- | --- | --- | --- | --- |
| AUD-001 | Audit record — exact source baseline | Risk of attributing findings to the wrong revision or losing local work if the audit starts without verifying branch, fork and source SHA. This provenance gap is resolved. | Without a pinned commit, findings and before/after results cannot be reproduced reliably. | [baseline](baseline.md); [Git verification](evidence/source-baseline.md) | Verified fork base; audit branch created |
| AUD-002 | Audit record — understanding/evidence gate | Risk of implementing an incorrect or unjustified design when rules, boundary cases and evidence are not understood before changes. This is an audit-process risk, not an application defect. | Unjustified changes are harder to defend and may preserve the wrong behavior. | Playbook §5; context R2; [méthode et décisions](DECISION_LOG.md) | Consolidated into examination method; not an application bug |
| AUD-003 | Application risk — note/receipt consistency | Risk of a pending expense without a usable receipt, an unreferenced uploaded file, or duplicate expense requests: insertion commits before upload/reference finalisation, with no recovery or compensation path. Failure scenarios are not yet reproduced. | Partial failure can leave an incomplete request visible for review; submitting again can create a duplicate. | [submission:88](../../src/app/api/expense-notes/route.ts#L88), [DB commit:38](../../src/lib/db.ts#L38), upload:101, update:103 | Incomplete-state recovery workflow selected; tests pending |
| AUD-004 | Application risk — caller-controlled sort SQL | Potential SQL injection and query manipulation: the caller-controlled sort URL parameter is copied directly into ORDER BY without an allowed-option mapping. Unexpected SQL expressions can enter the query; exploitability has not been tested. | Caller input can alter sorting expressions, cause query errors or extra work; any further security impact requires reproduction. | [expense list:42–47](../../src/app/api/expense-notes/route.ts#L42) | Case-insensitive fixed mapping and unknown → 400 selected |
| AUD-005 | Application risk — public exception details | Risk of internal information disclosure: respondError sends raw exception messages and stack traces to clients, potentially exposing database details, internal calls and source locations. The response construction is observed; HTTP failure cases remain untested. | Clients can receive internal database details and source locations rather than useful, safe feedback. | [error helper:2–5](../../src/lib/errors.ts#L2) | Message utilisateur seul, code technique en logs ; contrat exact à préparer |
| AUD-006 | Application risk — manager scope at API boundaries | Risk of unauthorised receipt access and cross-company manager assignment: receipt lookup checks manager role but not the requested note’s manager/company scope; assignment checks the chosen manager’s role but not company. Actual access depends on unverified DB protection. | Direct API calls may cross management or company boundaries; actual access depends on effective database protection. | [receipt query:17](../../src/app/api/manager/expense-notes/[id]/receipt-url/route.ts#L17); [assignment lookup:39–41](../../src/app/api/hr/users/[id]/manager/route.ts#L39) | Receipt scoped query and assignment API/DB integrity checks selected; implementation/migration validation pending |
| AUD-007 | Application risk — conflicting decisions | Risk of a race condition that overwrites an approved expense with rejected, or vice versa: separate requests can both read pending before updates that do not require the current state to remain pending. Concurrent behavior is untested. | Overlapping requests may overwrite a completed decision and return conflicting outcomes. | [manager approve:24–30](../../src/app/api/manager/expense-notes/[id]/approve/route.ts#L24); [reject:24–30](../../src/app/api/manager/expense-notes/[id]/reject/route.ts#L24); analogous HR routes | Conditional UPDATE selected; concurrency reproduction pending |
| AUD-008 | Application risk — OCR resource/lifecycle bounds | Risk of resource exhaustion and denial of service: unbounded OCR input and per-request worker creation can consume excessive memory/CPU under large or overlapping requests. Capacity and failure thresholds are unmeasured. | Large or overlapping requests may consume excessive memory/CPU and reduce availability; actual capacity is unmeasured. | [suggestion buffer:18](../../src/app/api/expense-notes/receipt-suggestion/route.ts#L18); [OCR worker:118–128](../../src/lib/ocr.ts#L118) | Pool sans file, traitement maximum 40 s et message de saturation acceptés ; formats formellement acceptés uniquement ; capacité/arrêt à tester |
| AUD-009 | Application risk — effective company isolation | Risk of cross-company data access or modification: HR RLS policies omit company equality, and effective privileges/user context are unverified. Whether this permits an actual isolation breach remains untested. | Database-level company isolation may be incomplete or bypassed; route filters alone do not establish every access path is protected. | [migration:70–100](../../migrations/1700000000001_init-schema.sql#L70); [scope helper:28](../../src/lib/db.ts#L28) | Company-aware policies, retained route scopes and policy-enforcing account selected; runtime validation pending |
| AUD-010 | Application risk — signing secret in source | Risk of forged sessions or impersonation if exposed signing material can be used to create accepted tokens: the authentication secret is stored as a source constant. Token forgery and its practical prerequisites have not been tested. | Anyone with the signing material may undermine session issuer trust; concrete exploitability remains untested. | [auth:8,11](../../src/lib/auth.ts#L8), value omitted from audit notes | Deferred for professor scope/startup clarification; no solution selected |
| AUD-011 | Audit/quality gap — runtime and reference checks | Risk of undetected functional/security regressions or a nonworking demonstration: no isolated startup/check results or tracked automated reference suite establish the initial behavior. This is a validation gap, not proof that startup fails. | The audit lacks executed evidence of working flows, reproducible failures and non-regression. | [baseline checks](baseline.md); [package scripts](../../package.json#L5); [runtime protocol](evidence/runtime-protocol.md) | Isolated baseline planned, not run |
| AUD-012 | Audit record — skill workflow availability | Risk of claiming a skill workflow was followed without its required instructions being available. The initial dependency blocker is resolved; this is a historical process risk, not a current application defect. | A claimed workflow must be grounded in its actual instructions; this is a resolved process record, not a current application defect. | [baseline instruction record](baseline.md); installed grilling/domain-modeling instructions | Availability resolved; retained ID, not an application bug |
| AUD-013 | Application risk — signup partial persistence | Risk of a company without its first RH user: company creation commits before separate user insertion; failed signup followed by retry may take the existing-company employee branch. Failure behavior is untested. | Can prevent the intended administrator from being created and leave onboarding incomplete. | [signup:44–69](../../src/app/actions/auth.ts#L44) | Transaction unique entreprise + premier RH retenue ; ancien choix de reprise remplacé ; tests de panne requis |

## AUD-015 — Validation de la date

Contrôle serveur limité au type chaîne (`src/app/api/expense-notes/route.ts:74` au SHA de référence). Validation du format année-mois-jour, existence calendaire et refus des dates futures retenus ; Europe/Paris avec horloge serveur, pays/région hors scope. Compatibilité fonctionnelle et contrat de refus à vérifier. Scénario HTTP non exécuté. [Solution](solutions-to-audit/AUD-015-validation-date.md).

## AUD-014 — Validation du montant

Risque applicatif observé au SHA de référence : parsing permissif à `src/app/api/expense-notes/route.ts:69`, contrôles fini/positif aux lignes 71–79. `12abc` produit un préfixe numérique ; scénario HTTP non exécuté. Validation complète côté serveur et point/virgule comme séparateur unique retenus ; arrondi du stockage existant conservé. Compatibilité et détails techniques à vérifier. [Solution](solutions-to-audit/AUD-014-validation-montant.md).

## AUD-006 has two distinct boundaries

The receipt decision does not resolve manager assignment. The latter uses a client-supplied managerId, checks role but omits company in that lookup. Assignment now has a selected scoped API check plus same-company integrity constraint; exact migration and actual DB behavior remain unverified. Keep both concerns under the historical ID, with separate evidence and outcomes; do not count them as one verified fix.

## Nouvelle passe — commentaires

- **AUD-016 — UI après erreur réseau :** états de chargement/actions non libérés lorsque fetch rejette ; 9 handlers vérifiés par fonctions extraites avec rejet simulé. [Solution retenue](solutions-to-audit/AUD-016-erreurs-reseau-ui.md) : gestion d'erreur, finally, saisie conservée, aucun retry automatique d'écriture. Non implémenté ; effet navigateur à confirmer.
- **AUD-017 — Affichage des dates :** la chaîne date est transformée en instant puis formatée localement ; 14 octobre affiché 13 octobre en America/Los_Angeles. Trois fuseaux vérifiés sans navigateur ; distinct de la validation AUD-015. [Correction retenue](solutions-to-audit/AUD-017-affichage-date.md), non implémentée.
- **AUD-018 — Reprise du seed :** une note déjà créée fait quitter le réessai avant vérification du reçu. [Solution retenue](solutions-to-audit/AUD-018-reprise-seed.md) : contrôler complétude et récupérer le reçu sur la même note. Panne de stockage et réparation non reproduites ; complément AUD-003/AUD-011, non implémenté.

Sources, sévérité à investiguer, commentaires relus, résultats et limites : [revue détaillée](comment-review.md). Compléments aux risques RLS (AUD-009) et réponses OCR (AUD-008) inclus. Tous les commentaires src inventoriés ont été relus, pas tous les comportements de l'application exécutés.

## Nouvelle revue des axes — AUD-019 à AUD-022

- AUD-019 : domaine email saisi utilisé pour appartenance/attribution initiale RH ; [convention pédagogique conservée](solutions-to-audit/AUD-019-inscription-domaine.md), pas de correction, limite de confiance assumée.
- AUD-020 : corps JSON invalide/incomplet interprété comme managerId=null ; huit parsing isolés. [Erreurs différenciées retenues](solutions-to-audit/AUD-020-validation-affectation.md), refus sans mutation et retrait explicitement null préservé ; non implémenté.
- AUD-021 : auto-affectation bloquée, boucles entre managers non contrôlées ; [interdiction des boucles retenue](solutions-to-audit/AUD-021-boucles-managers.md), affectations valides conservées ; non implémenté, concurrence à vérifier.
- AUD-022 : listes de notes sans borne de volume ; [optimisation acceptée si simple](solutions-to-audit/AUD-022-optimisation-simple-listes.md), piste des index à vérifier, aucune pagination sélectionnée ni gain mesuré.

Fichiers, lignes, explications, questions et validation : [nouveaux points](archive/next-issues-20261014.md). Identifiants enregistrés, non réutilisés ; neuf points AX de contrat/preuve distincts des risques applicatifs. Architecture hexagonale simple désormais validée, non implémentée.

## Autres périmètres examinés

- [G10 — Rôle actuel](solutions-to-audit/G10-droits-role-actuel.md) : relire le rôle en base à chaque requête protégée, direction acceptée. Source auth.ts:45–55 et route RH users:8–17 ; effets runtime non testés.
- [G14 — Contenu des reçus](solutions-to-audit/G14-controle-recus.md) : détecter le format par les octets avant création/stockage, direction acceptée. Source route de création:81–85,100–101 et storage.ts:29–31 ; 0 test.

## Navigation and next investigation

[DECISION_LOG.md](DECISION_LOG.md) records decisions and trade-offs. [findings.md](findings.md) records observations and hypotheses. Detailed examined issues are in solutions-to-audit/.

Premier passage des problèmes recensés terminé hors secret reporté pour le professeur. [Question préparée](questions-professeur.md), non envoyée. Format OCR à vérifier contre sa source formelle si elle manque. Priorités, contrats, migrations, tests et soutenance restent à préparer ; aucun code applicatif modifié ni résultat runtime acquis.

## Actualisation runtime et nouveau signal

[Campagne exécutée](mesures-et-preuves.md) : 47 vérifications, 26 conformes, 21 écarts, sans navigateur. Les mentions de non-exécution antérieures décrivent la revue initiale. [AUD-023](solutions-to-audit/AUD-023-dependances.md) : huit packages signalés par npm audit, applicabilité et mise à jour à qualifier ; pas exploit prouvé. [Classement consolidé](audit_issues_classified.md) : 25 références stables, dont quatre dossiers de processus. Aucun correctif applicatif implémenté.
