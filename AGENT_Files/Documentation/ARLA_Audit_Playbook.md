# ARLA — Audit and understanding playbook

Prepared for Maia on 11 October 2026. Deadline retained from ARLA_context: Monday 26 October 2026.

## 1. Recommendation and scope

Use an evidence-led architectural audit with a learning checkpoint at each stage. Survey the entire application, investigate risky flows deeply, and implement two or three coherent improvements selected from verified findings. A deep audit means that conclusions are reproducible and their consequences understood. It does not require rewriting the whole repository.

This playbook is a plan, not a fresh audit of Expense.io. The course decks and ARLA_context were read locally. The application was not cloned, started, tested or benchmarked in this conversation. Observations in the context refer to the earlier pedagogical-repo commit `265924bc7274047989e708ab635c2854d376230f`; recheck them against the exact commit of Maia's fork before reporting them as current findings.

Source repository: https://github.com/NathanPrats/expense-io
Maia's repository: https://github.com/maiabuc/expense-io

Keep four source labels separate: COURSE REQUIREMENT, OBSERVATION, HYPOTHESIS, PROPOSAL. Add MEASUREMENT when an executed protocol yields a result. Course diagrams describe a scenario; they do not establish that billing, finance roles, OpenAI, queues or distributed services exist in the actual implementation.

## 2. Skill choices

External skills were researched, not installed or executed. Review the exact installed SKILL.md and dependencies, record its source revision, and apply ARLA_context before using it. Web guides and repository versions may differ.

| Skill | When to use it | ARLA adaptation / limit |
| --- | --- | --- |
| `grill-with-docs` | Initial repo vocabulary and each meaningful design choice | Prefer it to `grill-me` for repo work. Records glossary and selected ADRs. Current guide says it also needs `grilling` and `domain-modeling`. Keep an explicit decision log because it does not record every decision. |
| `teach` | Sustained learning of the repo and missing concepts | Use a separate learning workspace, as its guide recommends. Ground lessons in the pinned code, course and official docs. Ask for short lessons followed by independent recall; mirror only concise evidence of understanding into audit docs. |
| `improve-codebase-architecture` | Structural survey after understanding the flows | Finds opportunities to simplify module interfaces. Complement with security, contracts, runtime, data and operations audits. Preserve its temporary HTML report. A small pedagogical commit history may not identify useful hotspots. |
| `diagnosing-bugs` | A specific reproducible defect or performance regression | Establish one failing command and investigate one hypothesis at a time. During audit request diagnosis only; its full workflow can continue into a fix. |
| `to-spec` | After decisions, for a selected change spanning sessions | Freeze agreed scope, invariants, options and acceptance criteria. It is not the audit tool. Avoid invented user stories for technical refactors. Current guide describes tracker publication; use explicit local-file configuration if preferred. |
| `to-tickets` | If a spec needs several implementation slices | Each slice has one outcome, verification and decision-log link. Unnecessary for a small single-session fix. |
| `tdd` | Regression tests and risky business changes | Preserve legitimate existing behavior. Write tests for the expected corrected behavior when the baseline contains a defect. Complement doubles with real DB/storage/API integration. |
| `code-review` | Every implementation diff | Check against the accepted decision, contracts, invariants and evidence. A fresh review session can challenge the author's reasoning. It does not replace Maia's understanding. |
| `grill-me` | A broad idea or oral defence practice | Stateless discussion, so transfer conclusions to the log. Oral-exam questions grounded in the repo can also be ordinary prompts. |

Primary guides checked:

- https://www.aihero.dev/skills-grill-with-docs
- https://www.aihero.dev/skills-grill-me
- https://www.aihero.dev/skills-teach
- https://www.aihero.dev/skills-improve-codebase-architecture
- https://www.aihero.dev/skills-diagnosing-bugs
- https://www.aihero.dev/skills-to-spec
- https://www.aihero.dev/skills-to-tickets
- https://www.aihero.dev/skills-tdd
- https://www.aihero.dev/skills-code-review
- https://github.com/mattpocock/skills

It has already been installed at root .agents 

## 3. Established audit sequence

| Stage | Work | Skill / method | Deliverable | Understanding and evidence gate |
| --- | --- | --- | --- | --- |
| 0. Baseline | Check local changes, branch, remotes, fork commit, environment, instructions and source constraints | Normal repo inspection | `docs/audit/baseline.md` | Maia knows which commit is audited; no inherited observation is presented as freshly verified. |
| 1. Product | Identify actors, expected behavior, states, permissions and known future scenarios | `grill-with-docs`; short teaching | `GLOSSARY.md`; functional and permission matrices | Maia explains employee, manager and RH actions and distinguishes actual product from course scenario. |
| 2. Map | Inventory source, routes, consumers, database, storage, OCR and dependency directions | Code walkthrough; `teach` for gaps | `docs/audit/architecture.md`; `api-inventory.md`; `coverage.md` | Maia traces submission, approval and receipt access from browser to persistent result. |
| 3. Run | Start locally with isolated fixtures; run existing checks; inspect failures; define regression suite | Existing commands; tests; `diagnosing-bugs` for specific failures | `docs/audit/evidence/`; catalogue linked to tests | Successful behavior and existing defects have known evidence. No architectural refactoring before baseline. |
| 4. Investigate | Audit each axis below, inspect risky implementation paths, reproduce hypotheses and measure | `improve-codebase-architecture` for structure; targeted debugging | `findings.md`; updated coverage ledger | Each conclusion has code evidence or a reproducible observation; blind spots remain explicit. |
| 5. Decide | Rank findings, compare viable alternatives, select two or three chantiers | `grill-with-docs`; `to-spec` for multi-session work | `DECISION_LOG.md`; selected ADRs; work plan | Maia can state the problem, explain an alternative and describe the selected trade-off. |
| 6. Implement | One outcome per small change; preserve contracts; update tests, docs and log | `tdd`; `to-tickets` where needed; `code-review` | Focused commits and passing relevant validation | Maia explains the diff and predicts a failure case; required checks have evidence. |
| 7. Validate | Compare baseline and final behavior, security, reliability and measured impact | Integration, E2E and comparable measurements | Final report and before/after evidence | All reference E2E tests pass; limitations and unimplemented recommendations remain visible. |
| 8. Defend | Build the 15-minute audit narrative; practise questions and timed feature integration | Oral challenge / `grill-me`; targeted teaching | PPTX later, demo script and representative prompts | Rehearse 15 minutes of audit and 15 minutes of live coding from a known state. |

Baseline tests are allowed and necessary during audit; architectural changes follow decisions. If a critical defect needs immediate correction, first save its evidence and test, record the expedited decision, and keep that change separate from other refactors.

## 4. Required audit axes and opinions

Slide numbers below use the physical slide order of the supplied files. The combined courses 1 & 2 file is called C1–2.

| Axis / course source | Inspect and prove in Expense.io | Opinion to formulate |
| --- | --- | --- |
| Constraints and trade-offs — C1–2 19–20, 26, 48 | Deadline, solo maintenance, cost, product needs, stack and existing dependencies | Explain why the selected change earns its maintenance cost; include retaining the existing solution as an option. |
| Responsibilities and design records — C1–2 14–15 | Component responsibilities, stable interfaces, decision history | Use a system view for architecture and short ADRs for meaningful trade-offs; document decisions for future developers and Maia. |
| Functional boundaries — C1–2 27–32 | Permission checks, submission/approval rules, duplication, imports across modules | Assess a modular monolith first. Distribution requires a demonstrated need and operating capacity. A separate module does not need a network call. |
| Hexagonal / clean principles — C1–2 44–48 | Actual dependency arrows, domain imports, SQL/storage/OCR inside routes, usage of existing ports/adapters | Judge dependency inversion and testability, not folder names. Extract a boundary only when it hides complexity or makes important behavior testable. |
| Identity, permissions, tenant isolation — C1–2 29–30; C3 25–27 | Session, server-side role and manager scope, company scope, receipt access, PostgreSQL role and RLS | Treat cross-company access as a central B2B risk. UI restrictions and a RLS declaration alone are insufficient evidence. Distinguish authentication from authorisation; OAuth2 is delegated authorisation. |
| API boundaries and style — C3 3–9, 11–18 | Every route's consumer, method, path/query/body, input, output, permission, errors and effects | Choose style from use. Existing HTTP/JSON can remain; business actions need not be forced into CRUD or migrated to GraphQL/gRPC. |
| Contracts and compatibility — C3 23–24 | Frontend consumers, enums, optional fields, multipart upload, serialization and migration impact | Define changed contracts before implementation. OpenAPI is useful if kept verifiable; contract compatibility includes behavioral details, not only TypeScript compilation. |
| Error reporting — C3 30–36 | Status codes, public messages, stack leakage, trace correlation, frontend handling | Keep safe, consistent public errors and diagnostic internal logs. Evaluate RFC 9457 with consumer adaptation; adopting it is a choice, not a mandated rewrite. |
| Idempotence and concurrency — C1–2 40; C3 28–29 | Repeated submissions/decisions, concurrent approval and rejection, update predicates, constraints | Define the intended state result under repeats and races. Idempotence concerns effects, not necessarily identical responses. Choose an atomic transition or other control from evidence. |
| Data and storage consistency — application of course resilience and trade-offs | SQL insert, upload and receipt-reference sequence, compensations, orphan records/files, money precision, dates and migrations | Explain partial failures across DB and S3. A DB transaction cannot roll back an external upload; choose a practical state or compensation model with tests. |
| Performance and async — C1–2 33–40; C3 19–21 | OCR latency/resources, worker lifecycle, file limits, endpoint duration, timeouts and failure behavior | Measure first. Compare input bounds, lifecycle improvements and synchronous processing to a durable background job. If async is selected, define state, retries, idempotence, tracing and terminal failure; 202 means accepted. |
| CAP and internationalisation — C1–2 41–42 | Whether multi-region is actually required; money/currency/time assumptions; future approval across regions | Discuss CAP under network partition if a distributed target is considered. Do not add replicas solely to illustrate the course. Make future scenarios explicit hypotheses. |
| Quality, operation and AI guardrails — C1–2 14, 43, 49; C3 38; ARLA_context R4/R8 | Startup, dependencies, secrets, migrations, logs, test inventory, CI, recovery, docs and agent instructions | Build a reproducible validation harness. Preserve reference E2E assertions. 100% passing E2E is not 100% code coverage; report actual executed counts and blind spots. |

The course barème is partly graphical; criterion wording and weights here rely on ARLA_context's transcription of C3 slide 38: audit 5, presentation 3, questions 4, AI co-design 3, technical quality 5. The formal assignment appears at C1–2 slide 49. C3 slide 39 asks for a fork and its link by email to the professor; Maia handles that communication separately.

### Deep audit mechanics

1. Make a coverage ledger for every module/route: read, traced, executed, tested, measured, not assessed, with scope notes. “All files listed” is not “all behavior verified.”
2. Trace critical flows vertically: UI → route/action → identity and permission → business rule → DB/storage/OCR → response and errors. Inspect the implementation and actual call sites.
3. Review shared mechanisms horizontally: all routes' permissions, tenant filters, errors, input validation, transaction handling and observability. This finds inconsistent patterns missed by a single walkthrough.
4. Use deterministic fixtures: two companies, several roles, allowed and unrelated manager relationships, notes in each state and small known receipts. Confirm expected rules before calling a behavior a defect.
5. Test negative boundaries: unauthenticated access, wrong company, wrong role, invalid sort/file/amount/date, duplicate and concurrent decisions, storage/OCR failures and expired links.
6. Confirm performance hypotheses with cold/warm runs and fixed sample data, versions, machine, concurrency, request count, median/p95 and errors. Preserve raw measurements. Small samples support limited conclusions.
7. Prioritise by demonstrated severity and likelihood, product impact, future change risk, confidence and implementation effort. Keep confidence separate from severity. A critical untested hypothesis is urgent to investigate, not a confirmed exploit.
8. Audit broadly but implement narrowly. Propose plausible future scenarios such as richer approval rules or increasing receipt volume, label them assumptions, and use them to compare maintainability.

Suggested instruments: existing ESLint, TypeScript and build first; Playwright for browser/API checks; Vitest for business rules and appropriate integration; real PostgreSQL and S3-compatible test storage; dependency/secrets review; targeted request measurements. Tools produce signals; code and runtime evidence establish applicability. Confirm stack compatibility from current primary documentation when installing tools.

## 5. Understanding process

A simple “yes” or reading an explanation is insufficient. For a meaningful change, Maia should independently:

- Point to the files executing the affected flow and explain their responsibilities.
- State the invariant being protected and predict an error or boundary outcome.
- Explain why the proposed solution beats a credible alternative under ARLA constraints.
- Explain a short diff or make a tiny related modification herself.
- Revisit the decision the next session without rereading the AI explanation first.

The agent should work on one flow or concept at a time, give a concrete example, name unfamiliar terms before using them, and ask one comprehension question before advancing dependent work. If Maia cannot explain the result, clarify or simplify it. Necessary questions about understanding are part of the requested learning process, not repeated permission prompts for routine file reads or tests.

Record evidence rather than declaring “expert”: not assessed / needs support / explained independently / applied independently. A useful log note is “Maia traced the receipt authorization and predicted the cross-company refusal.” Never invent this note.

## 6. Traceability files

Use `docs/audit/DECISION_LOG.md` as the central index requested by Maia. Link detailed evidence and ADRs instead of repeating them. Start it before fixes and update it in the same commit as each relevant change.

Suggested repository files:

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Stable rules for agents, including understanding and evidence gates |
| `GLOSSARY.md` | Product vocabulary and technical terms Maia can explain |
| `docs/audit/baseline.md` | Exact source commit, environment and initial checks |
| `docs/audit/architecture.md` | Existing flows and dependency directions; target added after decisions |
| `docs/audit/coverage.md` | Assessed and unassessed surfaces |
| `docs/audit/findings.md` | Detailed findings, hypotheses and reproducible evidence |
| `docs/audit/DECISION_LOG.md` | Issue → decision → reasoning → validation → implementation |
| `docs/audit/evidence/` | Small reports, protocols and selected sanitized outputs |
| `docs/adr/` | Meaningful architectural decisions and rejected alternatives |

### Copyable DECISION_LOG.md template

```markdown
# ARLA — Decision log

Audit base: <branch + exact commit>. Updated: <date>.
Statuses: investigating / proposed / accepted / implemented / verified / deferred / superseded.
Evidence labels: observed / hypothesis / measured.

| ID | Issue and evidence | Decision / status | Why this solution | Alternative and trade-off | Course / product link | Validation and outcome | Commit / ADR | Maia understanding |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-001 | <behavior, path, commit, reproduction; confidence> | <decision or undecided; status> | <why under our constraints> | <credible alternative; cost/limitation> | <slide + business impact> | <test/command, expected, actual, evidence path> | <after implementation> | <evidence or not assessed> |
```

For readability use short table cells linked to entries in findings.md. A finding's detailed entry contains: ID, status/confidence, severity and reason, observed versus expected behavior, exact source reference, command/fixture/environment, result, business impact, proposed options, acceptance test and known limits. A genuine defect is confirmed only after sufficient evidence; structural problems can be supported by traced code without pretending a runtime reproduction exists.

Example hypothesis carried from the supplied context, NOT a confirmed new finding:

| ID | Issue | Decision | Why | Next evidence |
| --- | --- | --- | --- | --- |
| HYP-001 | Context reports user-selected sort interpolated in ORDER BY | Undecided. Candidate: map allowed sort names to fixed SQL expressions | Would bound the SQL identifiers while preserving supported sorting | Re-read current route, trace allowed inputs and driver behavior, then test supported and unexpected values. Assess exploitability separately. |

### Short ADR template

```markdown
# ADR-XXX — <decision>
Status: proposed | accepted | superseded
Finding: AUD-XXX
Context and invariant:
Options, including retaining the existing approach where credible:
Decision and why:
Course concept and product need:
Trade-offs and new risks:
Migration / rollback:
Validation evidence:
What would make us reconsider:
```

### Copyable AGENTS.md content

```markdown
# ARLA working rules
Read ARLA_context.md and docs/audit/baseline.md before starting.
Treat course requirements, code observations, hypotheses, measurements and proposals separately.
Record source revision and evidence; never invent test outcomes or benchmarks.
For audit tasks, inspect and explain before proposing code changes.
Before a meaningful change, trace its flow and ask Maia to explain the invariant and trade-off.
Do not mark Maia's understanding from assent alone; wait for her actual explanation.
Work on one accepted outcome at a time. Keep refactoring and formatting separate.
Preserve expected functions, API consumers, permissions and UI unless a documented need changes them.
Keep the reference E2E assertions; never weaken, skip or delete tests to obtain a passing result.
Use isolated test data. Test affected refusals and failures as well as success.
Update docs/audit/DECISION_LOG.md in the change commit; use ADRs for meaningful architectural choices.
Explain the diff, validation, limitations and next unresolved point in plain language.
Do not add architecture or infrastructure solely because a course slide mentions it.
```

This is proposed repository content, not an installed custom skill or a file already added to Maia's fork.

## 7. Immediate next session

Create all needed files for structure and start the first step of the audit.



