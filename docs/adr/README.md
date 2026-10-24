# Décisions d'architecture

Les deux décisions restent celles retenues dans l'audit ; cet index indique leur réalisation sur main `2e9e30c`, relue le 24 octobre 2026. Les mentions initiales « non implémenté » dans les ADR décrivent l'époque de la décision ; les preuves de réalisation sont dans les fiches AUD liées.

| Décision | Raison | Réalisation |
| --- | --- | --- |
| [ADR-0001 — Inscription atomique](0001-inscription-atomique.md) | Entreprise et premier RH créés ensemble plutôt qu'une suppression compensatoire après échec | [SPEC-05](../specs/SPEC-05-inscription-atomique.md), [AUD-013](../audit/solutions-to-audit/AUD-013-signup-consistency.md#implementation) |
| [ADR-0002 — Module hexagonal de soumission](0002-hexagonal-soumission.md) | Isoler les règles de reprise DB/S3 sans réécrire tout le monolithe | [SPEC-09](../specs/SPEC-09-soumission-isolee.md), [AUD-003](../audit/solutions-to-audit/AUD-003-receipt-consistency.md#implementation), [architecture avant/après](../audit/architecture.md) |
