# AUD-028 — Coût borné du diagnostic interne

Statut : correction sélectionnée et spec préparée le 26 octobre 2026 ; non implémentée. Nouvelle issue distincte d'[AUD-005](AUD-005-public-errors.md), qui traitait la confidentialité des erreurs. Maia impose un nouvel ID pour ce nouveau constat de coût. Source actuelle : `2e9e30cf9f21a240c1213da6baec7f4c61618175`.

## Problème, localisation et fonctionnement actuel

OBSERVATION : `src/lib/errors.ts:19` masque les valeurs authorization avant journalisation. Des portions du motif peuvent consommer les mêmes espaces, entraînant des retours arrière lors d'un échec. `redactDiagnostic` ne borne pas la longueur du texte ; logInternalError l'applique au code, au message et à la stack avant de répondre au client.

SonarQube : alerte 12/16, `typescript:S8786`, MAJOR, clé `8604a8a4-3b80-4ec2-94c8-4db488b2c362`. [Export](../evidence/sonarqube-20261026/issues.json).

## Mesure et portée

MEASUREMENT : expression extraite du fichier courant, quatre appels isolés après échauffement, Node v24.6.0. Entrée : authorization: suivi uniquement d'espaces, sans secret.

| Espaces | Temps local (ms) |
| --- | ---: |
| 500 | 0.232 |
| 1000 | 0.841 |
| 2000 | 3.398 |
| 4000 | 13.078 |

[Script](../evidence/sonarqube-20261026/authorization-pattern-benchmark.mjs), [résultats et empreinte source](../evidence/sonarqube-20261026/authorization-pattern-benchmark.json). Nouvelle capture reproductible, distincte de la première mesure de présentation. Les quatre remplacements laissent l'entrée inchangée ; cela n'est pas une fuite, car ces entrées synthétiques ne contiennent aucune valeur secrète.

HYPOTHÈSE : une exception volumineuse contenant ce motif peut retarder sa journalisation et la réponse. L'influence effective d'un appelant sur ce texte, l'exploitation HTTP et la saturation serveur ne sont pas démontrées. Aucune fuite de secret déduite de cette mesure.

## Décision et piste de solution

Après proposition d'un complément AUD-005 et d'une spec ciblée, Maia demande « Pareil un last-change et next ». Préparation P2, robustesse ; [SPEC-14](../../specs/SPEC-14-diagnostic-borne-LastChanges.md), désormais associée à AUD-028 selon la correction de Maia.

Choix technique proposé : borne de 16 384 unités UTF-16 avant les filtres ; pour un champ trop long, remplacer le champ entier par un marqueur sûr, sans journaliser de fragment brut. Remplacer la reconnaissance authorization par un parcours sans retours arrière, conservant les formats et tests existants. Le plafond est un budget technique de diagnostic, pas une valeur normative ou un seuil de capacité mesuré.

Alternatives : conserver les filtres sans borne (coût observé) ; borner en tronquant le texte brut (risque de laisser passer un secret coupé, rejeté) ; supprimer tous les diagnostics (perte inutile de contexte). Ne pas simplifier le filtre en réduisant les protections établies par PANNE-005 à PANNE-009.

## Validation et limites

Acquis : code et appelants relus, quatre mesures du motif isolé ; tests de correction : 0. À exécuter : compatibilité des formats secrets, diagnostics longs avec secret aux frontières, diagnostic structuré et réponse publique, mesures comparables et suites de référence isolées. Aucun code ou service modifié. Les autres alertes regex ne sont pas incluses automatiquement. Cette fiche documente une préparation, aucune correction implémentée.

## IMPLEMENTATION

### 29 octobre 2026 — SPEC-14, borne de longueur du diagnostic

Statut : implémentée et vérifiée sur le périmètre unitaire décrit ; suite API diagnostics à vérifier par la CI, Docker absent localement.
Spec : [SPEC-14](../../specs/SPEC-14-diagnostic-borne-LastChanges.md). Révision de départ : `2e9e30cf9f21a240c1213da6baec7f4c61618175`. Réalisation : branche `feat/spec-14`, diff local du 29 octobre 2026. Compatibilité de confidentialité : [AUD-005](AUD-005-public-errors.md).

#### Ce qui a été implémenté

`redactDiagnostic` ne bornait pas la longueur avant d'appliquer ses expressions. Ajout d'un garde `MAX_DIAGNOSTIC_LENGTH = 16384` (unités UTF-16) vérifié **avant** tout filtre : au-delà, la fonction retourne le marqueur constant `[diagnostic trop volumineux, omis]` pour le champ entier, sans jamais conserver de préfixe/suffixe brut (donc aucun fragment de secret coupé ne fuit) et sans exécuter les expressions sur une entrée adverse volumineuse. Sous le plafond, le filtrage existant (URL, authorization/bearer, cookies, identifiants d'URL de connexion, clés JSON et valeurs citées, paramètres AWS) est inchangé. `code`, `message` et `stack` passent chacun par ce garde via `logInternalError`. Les champs `operation`/`status`/`timestamp` restent produits comme avant. Aucune reconnaissance remplacée par un parcours déterministe : les cas DIAG-002/003/005 (frontières et formats sensibles) passent déjà avec l'expression existante, donc seul le plafond manquait pour cette correction.

#### Où

| Fichier et repère du nouveau code | Modification | Rôle dans le parcours |
| --- | --- | --- |
| src/lib/errors.ts : `MAX_DIAGNOSTIC_LENGTH`, `OVERSIZED_DIAGNOSTIC`, `redactDiagnostic` | Garde de longueur avant les expressions | Coût borné, omission entière au-delà du plafond |

#### Nouveau fonctionnement

Exception dans une route → `respondError(error, operation)` → `logInternalError` calcule code/message/stack → chacun passe dans `redactDiagnostic` : si `length > 16384` → `[diagnostic trop volumineux, omis]` immédiat, sinon filtrage existant → une seule ligne JSON `{timestamp, code, operation, status:500, message, stack}` émise sur `console.error`. La réponse publique reste `{ error: "Une erreur inattendue est survenue. Réessaie plus tard." }` 500, inchangée. Un diagnostic court et bénin reste conservé ; un secret reconnaissable sous le plafond reste `[expurgé]`.

#### Validation et preuves

| Commande ou scénario | Attendu | Résultat réel et compte | Preuve |
| --- | --- | --- | --- |
| `npx vitest run tests/unit/diagnostic-borne.test.ts` | DIAG-001…006 verts | exit 0, 6/6 réussis (3 correction + 3 référence, dont frontières 16383/16384 conservées) | Sortie locale 2026-10-29, Node 24.6.0 |
| `npm run typecheck` / `npm run lint` / `npm run build` | exit 0 | exit 0 (1 avertissement lint préexistant hors périmètre) | Sortie locale 2026-10-29 |
| `npm run test:unit` (suite complète) | Défauts LastChanges restants + spec-report préexistant rouges | 68/81 réussis ; 13 échecs restants (branche partie de feat/ci) | `reports/unit.json` |
| `tests/api/diagnostics.spec.ts` PANNE-005…009 | Formats historiques toujours masqués, aucune régression | Non exécuté localement : Docker/Compose absents | À vérifier sur GitHub Actions |

#### Écarts et limites

Écart assumé avec la proposition de SPEC-14 : le remplacement de la reconnaissance `authorization` par un parcours déterministe n'a pas été réalisé, car les cas de confidentialité et de frontière (DIAG-002/003/005, PANNE-005…009) passent déjà avec l'expression existante et le seul plafond manquait. Conformément aux instructions (séparer correction et refactor, n'ajouter que le nécessaire au lot démontré), seule la borne — qui corrige les cas rouges DIAG-001/004/006 — est appliquée. Le microbenchmark comparatif du motif et la suite API restent à exécuter en CI ; aucun gain de débit HTTP revendiqué.


### 29 octobre 2026 — Revue du critère C5

Statut : implémentée, validation distante incomplète. Base : `ebd8b96`, réalisation : diff de revue daté. Spec : [SPEC-14](../../specs/SPEC-14-diagnostic-borne-LastChanges.md).

#### Ce qui a été implémenté et où

L’écart déclaré dans l’entrée précédente n’est pas retenu : sous le plafond, les espaces après authorization provoquaient encore des recherches répétées. `src/lib/errors.ts`, `redactAuthorization`, parcourt désormais la valeur avec indices croissants, reconnaît les valeurs citées et échappées ainsi que Bearer/Basic, et conserve le marqueur expurgé. Les autres filtres et la borne préalable restent actifs. Une conversion ASCII seulement préserve les indices Unicode du texte original.

#### Nouveau fonctionnement

Erreur → respondError → code/message/stack → borne du champ entier → filtre URL → parcours authorization déterministe → autres filtres → journal structuré. Réponse publique inchangée.

#### Validation et preuves

6/6 tests DIAG et 20/20 contrôles synthétiques de confidentialité/frontières ; lint et types exit 0. [Compatibilité](../evidence/spec14-review-20261029/compatibility.json), [mesure avant](../evidence/spec14-review-20261029/before.json), [après](../evidence/spec14-review-20261029/after.json), [protocole](../evidence/spec14-review-20261029/benchmark.mjs). Chaque version est exécutée dans un processus limité à 15 secondes, cinq répétitions sur quatre tailles. Aucune capacité HTTP déduite.

#### Limites

La suite PANNE et le build réel sont vérifiés par Actions sur la révision publiée ; aucun succès distant anticipé. Ancienne entrée conservée intégralement.
