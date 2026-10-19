# Contrôles par spec

Un contrôle vert exige les cas du lot exécutés et réussis, ainsi que la couverture obligatoire déclarée. Il ne remplace pas la revue du code et des preuves.

| Spec | État | Réussis | Échoués | Non exécutés | Cas obligatoires manquants |
| --- | --- | ---: | ---: | ---: | --- |
| SPEC-01 | failed | 0 | 4 | 0 | — |
| SPEC-02 | failed | 12 | 21 | 0 | — |
| SPEC-03 | incomplete | 6 | 2 | 0 | OCR-POOL-001, OCR-POOL-002, OCR-POOL-003, OCR-POOL-004 |
| SPEC-04 | failed | 20 | 24 | 0 | — |
| SPEC-05 | failed | 7 | 1 | 0 | — |
| SPEC-06 | incomplete | 18 | 5 | 0 | DROIT-022 |
| SPEC-07 | failed | 7 | 13 | 0 | — |
| SPEC-08 | incomplete | 10 | 3 | 0 | DEC-008 |
| SPEC-09 | incomplete | 4 | 4 | 0 | REPRISE-001, REPRISE-002, REPRISE-003, REPRISE-004, REPRISE-005, REPRISE-006, REPRISE-007, REPRISE-008, HEXA-001, HEXA-002 |
| SPEC-10 | incomplete | 2 | 1 | 0 | SEED-004, SEED-005 |
| SPEC-11 | manual-review | 0 | 0 | 0 | — |
| SPEC-12 | manual-review | 0 | 0 | 0 | — |

**SPEC-11** : Mesures comparatives à relire ; aucun test fonctionnel dédié ne prouve le bénéfice.

**SPEC-12** : Avis, usages et incertitudes à relire ; npm audit ne valide pas la qualification.
