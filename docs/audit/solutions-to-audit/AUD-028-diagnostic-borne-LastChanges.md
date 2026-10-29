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
