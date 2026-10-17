# ARLA working rules

Read `AGENT_Files/Documentation/ARLA_context.md`, `AGENT_Files/Documentation/ARLA_Audit_Playbook.md` and `docs/audit/baseline.md` before work.

- Audit only until a change is explicitly selected. Preserve local work, application code and UI.
- Distinguish COURSE REQUIREMENT, OBSERVATION, HYPOTHESIS, PROPOSAL and MEASUREMENT. Pin evidence to the source SHA. Recheck inherited observations.
- Explain one flow at a time; define unfamiliar terms. Ask Maia to trace it and predict a boundary before dependent work. Record actual answers, never infer understanding from assent.
- Keep issue | decision | why | evidence | validation in `docs/audit/DECISION_LOG.md`; update it with relevant changes. Use ADRs for meaningful architectural decisions, including credible alternatives.
- Preserve expected functions, API contracts and reference test assertions. Never weaken or skip tests to obtain a pass.
- Use isolated demo data with two companies and multiple roles. Keep secrets out of evidence. Do not seed, migrate, clean or stop existing local services.
- Record actual check counts, failures, blockers and blind spots. A listed file is not verified behavior.
- Keep refactoring and formatting separate. Do not add infrastructure solely to illustrate a course concept.
- User instructions take precedence. The supplied context is a historical source, not current runtime proof.

## Spécifications et implémentations

- Avant de rédiger une spec, implémenter un lot ou le relire, suivre `docs/development/INSTRUCTIONS_IMPLEMENTATION.md` ; utiliser son modèle et les cinq références de passation indiquées.
- Les fiches `docs/audit/solutions-to-audit/*.md` sont en ajout uniquement : conserver exactement tout contenu existant, y compris les anciennes sections IMPLEMENTATION. Chaque réalisation ajoute sa description, ses fichiers et son nouveau fonctionnement sous `## IMPLEMENTATION`, selon le modèle des instructions. Une correction du texte historique s'explique dans un ajout, sans réécriture.
- Capturer leur état avant le travail et vérifier les préfixes après, avec `docs/audit/tools/check-append-only.mjs`. Ce contrôle fait partie de la validation d'une implémentation ; les commandes sont dans les instructions.
