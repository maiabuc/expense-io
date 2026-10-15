# Résultats des tests par issue

Révision : 49e0ff395fd94c57e54213fe95434eb1e1e61869 (diff local non commité du 15 octobre 2026). Généré : 2026-10-15T15:05:48.443Z. Node : v24.21.0. Suites : unit, api, e2e.

Les contrôles présents réussis ne certifient pas seuls une issue corrigée. Les cas futurs et les absences restent explicites.

| Issue | Réussis | Échoués | Non exécutés | Couverture future |
| --- | ---: | ---: | ---: | --- |
| AUD-003 | 2 | 1 | 0 | Reprise incomplete, clé stable, réponse perdue et concurrence : mécanisme à implémenter ; Module hexagonal : contrats des adaptateurs après extraction |
| AUD-004 | 1 | 5 | 0 | Voir critères et matrice de tests |
| AUD-005 | 0 | 3 | 0 | Voir critères et matrice de tests |
| AUD-006 | 23 | 3 | 0 | Voir critères et matrice de tests |
| AUD-007 | 10 | 3 | 0 | Voir critères et matrice de tests |
| AUD-008 | 6 | 2 | 0 | Pool réutilisable, saturation et arrêt effectif à 40 s : mécanisme à implémenter ; Charge CPU/RAM : campagne manuelle dédiée |
| AUD-009 | 2 | 3 | 0 | Voir critères et matrice de tests |
| AUD-010 | 0 | 0 | 0 | Secret : clarification professeur reportée ; les tests de connexion ne valident pas ce choix |
| AUD-011 | 21 | 0 | 0 | Voir critères et matrice de tests |
| AUD-013 | 6 | 1 | 0 | Voir critères et matrice de tests |
| AUD-014 | 6 | 6 | 0 | Voir critères et matrice de tests |
| AUD-015 | 1 | 6 | 0 | Voir critères et matrice de tests |
| AUD-016 | 12 | 20 | 0 | Voir critères et matrice de tests |
| AUD-017 | 3 | 1 | 0 | Voir critères et matrice de tests |
| AUD-018 | 2 | 1 | 0 | Voir critères et matrice de tests |
| AUD-019 | 2 | 0 | 0 | Voir critères et matrice de tests |
| AUD-020 | 2 | 9 | 0 | Voir critères et matrice de tests |
| AUD-021 | 1 | 3 | 0 | Voir critères et matrice de tests |
| AUD-022 | 0 | 0 | 0 | Optimisation conditionnelle ; mesures de volume hors gate rapide |
| AUD-023 | 0 | 0 | 0 | Rapport de dépendances informatif ; applicabilité à qualifier avant correction |
| G10 | 0 | 3 | 0 | Voir critères et matrice de tests |
| G14 | 8 | 3 | 0 | Voir critères et matrice de tests |

## Cas exécutables

| Cas | Issues | Suite | Résultat |
| --- | --- | --- | --- |
| DOM-001 | AUD-007 | unit | passed |
| DOM-002 | AUD-007 | unit | passed |
| DOM-003 | AUD-007 | unit | passed |
| DOM-004 | AUD-007 | unit | passed |
| DOM-005 | AUD-006 | unit | passed |
| DOM-006 | AUD-011 | unit | passed |
| AUTH-004 | AUD-011 | api | passed |
| AUTH-005 | AUD-011 | api | passed |
| AUTH-001 | AUD-011 | api | passed |
| AUTH-002 | AUD-011 | api | passed |
| AUTH-003 | AUD-011 | api | passed |
| PANNE-001 | AUD-003 | api | failed |
| PANNE-002 | AUD-005 | api | failed |
| RLS-001 | AUD-009 | api | failed |
| RLS-002 | AUD-009 | api | failed |
| DEC-001 | AUD-007 | api | passed |
| DEC-002 | AUD-007 | api | passed |
| DEC-003 | AUD-006 | api | passed |
| DEC-004 | AUD-006 | api | passed |
| DEC-005 | AUD-007 | api | failed |
| DEC-006 | AUD-007 | api | failed |
| DEC-007 | AUD-007 | api | failed |
| PANNE-003 | AUD-005 | api | failed |
| RLS-003 | AUD-009 | api | passed |
| RLS-004 | AUD-009 | api | passed |
| RLS-005 | AUD-009 | api | failed |
| DATE-001 | AUD-015 | api | failed |
| NOTE-001 | AUD-003 | api | passed |
| NOTE-002 | G14 | api | passed |
| NOTE-003 | G14 | api | passed |
| NOTE-004 | G14 | api | passed |
| NOTE-005 | G14 | api | passed |
| NOTE-006 | AUD-014 | api | passed |
| NOTE-007 | AUD-014 | api | failed |
| NOTE-008 | AUD-014 | api | failed |
| NOTE-009 | AUD-014 | api | failed |
| NOTE-010 | AUD-014 | api | failed |
| NOTE-011 | AUD-014 | api | passed |
| NOTE-012 | AUD-014 | api | passed |
| NOTE-013 | AUD-014 | api | passed |
| NOTE-014 | AUD-014 | api | failed |
| NOTE-015 | AUD-014 | api | passed |
| NOTE-016 | AUD-015 | api | failed |
| NOTE-017 | AUD-015 | api | failed |
| NOTE-018 | AUD-015 | api | failed |
| NOTE-019 | AUD-015 | api | failed |
| NOTE-020 | AUD-015 | api | failed |
| NOTE-021 | AUD-015 | api | passed |
| NOTE-022 | AUD-005 | api | failed |
| NOTE-023 | G14 | api | failed |
| NOTE-024 | G14 | api | passed |
| NOTE-025 | G14 | api | passed |
| NOTE-026 | G14 | api | passed |
| NOTE-027 | AUD-011 | api | passed |
| NOTE-028 | G14 | api | passed |
| LIST-001 | AUD-004 | api | passed |
| LIST-002 | AUD-004 | api | failed |
| LIST-003 | AUD-004 | api | failed |
| LIST-004 | AUD-004 | api | failed |
| LIST-005 | AUD-004 | api | failed |
| LIST-006 | AUD-004 | api | failed |
| RECU-001 | AUD-006 | api | passed |
| RECU-002 | AUD-006 | api | passed |
| RECU-003 | AUD-006 | api | passed |
| LIST-007 | AUD-011 | api | passed |
| NOTE-029 | AUD-014 | api | passed |
| NOTE-030 | AUD-014 | api | failed |
| NOTE-031 | G14 | api | failed |
| NOTE-032 | G14 | api | failed |
| OCR-001 | AUD-008 | api | passed |
| OCR-002 | AUD-008 | api | passed |
| OCR-003 | AUD-008 | api | failed |
| OCR-004 | AUD-008 | api | failed |
| OCR-005 | AUD-008 | api | passed |
| OCR-006 | AUD-008 | api | passed |
| DROIT-001 | AUD-006 | api | passed |
| DROIT-002 | AUD-006 | api | passed |
| DROIT-003 | AUD-006 | api | passed |
| DROIT-004 | AUD-011 | api | passed |
| DROIT-005 | AUD-011 | api | passed |
| DROIT-006 | AUD-011 | api | passed |
| DROIT-007 | AUD-011 | api | passed |
| DROIT-008 | AUD-011 | api | passed |
| DROIT-009 | AUD-011 | api | passed |
| DROIT-010 | AUD-011 | api | passed |
| DROIT-011 | AUD-006 | api | passed |
| DROIT-012 | AUD-006 | api | passed |
| DROIT-013 | AUD-006 | api | failed |
| DROIT-014 | AUD-006 | api | failed |
| DROIT-015 | AUD-006 | api | passed |
| DROIT-016 | AUD-006 | api | passed |
| DROIT-017 | AUD-006 | api | passed |
| DROIT-018 | AUD-006 | api | passed |
| DROIT-019 | G10 | api | failed |
| DROIT-020 | G10 | api | failed |
| DROIT-021 | G10 | api | failed |
| AFF-001 | AUD-020 | api | failed |
| AFF-002 | AUD-020 | api | failed |
| AFF-003 | AUD-020 | api | failed |
| AFF-004 | AUD-020 | api | failed |
| AFF-005 | AUD-020 | api | failed |
| AFF-006 | AUD-020 | api | failed |
| AFF-007 | AUD-020 | api | failed |
| AFF-008 | AUD-020 | api | failed |
| AFF-009 | AUD-020 | api | passed |
| AFF-010 | AUD-006 | api | passed |
| AFF-011 | AUD-006 | api | failed |
| AFF-012 | AUD-006 | api | passed |
| AFF-013 | AUD-006 | api | passed |
| AFF-014 | AUD-006 | api | passed |
| AFF-015 | AUD-021 | api | passed |
| AFF-016 | AUD-021 | api | failed |
| AFF-017 | AUD-021 | api | failed |
| AFF-018 | AUD-021 | api | failed |
| AFF-019 | AUD-020 | api | failed |
| SEED-001 | AUD-018 | api | passed |
| SEED-002 | AUD-018 | api | failed |
| SEED-003 | AUD-018 | api | passed |
| NET-001 | AUD-016 | e2e | failed |
| NET-002 | AUD-016 | e2e | passed |
| NET-003 | AUD-016 | e2e | failed |
| NET-004 | AUD-016 | e2e | failed |
| NET-005 | AUD-016 | e2e | passed |
| NET-006 | AUD-016 | e2e | failed |
| NET-007 | AUD-016 | e2e | passed |
| NET-008 | AUD-016 | e2e | failed |
| NET-009 | AUD-016 | e2e | failed |
| NET-010 | AUD-016 | e2e | passed |
| NET-011 | AUD-016 | e2e | failed |
| NET-012 | AUD-016 | e2e | failed |
| NET-013 | AUD-016 | e2e | passed |
| NET-014 | AUD-016 | e2e | failed |
| NET-015 | AUD-016 | e2e | failed |
| NET-016 | AUD-016 | e2e | passed |
| NET-017 | AUD-016 | e2e | failed |
| NET-018 | AUD-016 | e2e | passed |
| NET-019 | AUD-016 | e2e | failed |
| NET-020 | AUD-016 | e2e | failed |
| NET-021 | AUD-016 | e2e | passed |
| NET-022 | AUD-016 | e2e | failed |
| NET-023 | AUD-016 | e2e | failed |
| NET-024 | AUD-016 | e2e | passed |
| NET-025 | AUD-016 | e2e | failed |
| NET-026 | AUD-016 | e2e | failed |
| NET-027 | AUD-016 | e2e | passed |
| NET-028 | AUD-016 | e2e | failed |
| NET-029 | AUD-016 | e2e | passed |
| NET-030 | AUD-016 | e2e | failed |
| NET-031 | AUD-016 | e2e | passed |
| NET-032 | AUD-016 | e2e | failed |
| NAV-001 | AUD-011 | e2e | passed |
| NAV-002 | AUD-011 | e2e | passed |
| NAV-003 | AUD-011 | e2e | passed |
| NAV-004 | AUD-011 | e2e | passed |
| NAV-005 | AUD-011 | e2e | passed |
| NAV-006 | AUD-006 | e2e | passed |
| NAV-007 | AUD-006 | e2e | passed |
| NAV-008 | AUD-003 | e2e | passed |
| NAV-009 | AUD-011 | e2e | passed |
| NAV-010 | AUD-006 | e2e | passed |
| NAV-011 | AUD-007 | e2e | passed |
| NAV-012 | AUD-007 | e2e | passed |
| NAV-013 | AUD-007 | e2e | passed |
| NAV-014 | AUD-007 | e2e | passed |
| NAV-015 | AUD-006, AUD-020 | e2e | passed |
| NAV-016 | AUD-008 | e2e | passed |
| NAV-017 | AUD-008 | e2e | passed |
| NAV-018 | AUD-017 | e2e | passed |
| NAV-019 | AUD-017 | e2e | passed |
| NAV-020 | AUD-017 | e2e | failed |
| NAV-021 | AUD-017 | e2e | passed |
| INS-001 | AUD-013, AUD-019 | e2e | passed |
| INS-002 | AUD-013, AUD-019 | e2e | passed |
| INS-003 | AUD-013 | e2e | passed |
| INS-004 | AUD-013 | e2e | passed |
| INS-005 | AUD-013 | e2e | passed |
| INS-006 | AUD-013 | e2e | failed |
| INS-007 | AUD-013 | e2e | passed |

Suites en échec : api, e2e. Consulter les résultats bruts, y compris les erreurs de préparation/fin de suite.
