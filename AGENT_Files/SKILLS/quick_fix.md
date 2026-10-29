---
name: quick_fix
description: Diagnose bugs and requested changes, explain functional impact, compare technical options, then implement and test.
---

# /quick_fix

Diagnose and fix a bug or implement a focused change. Keep the process lightweight, but never skip functional analysis or the comparison of meaningful alternatives.

## 1. Understand the problem

- Read the relevant code, specifications, and tests.
- Identify current behavior, expected behavior, root cause, and reproduction steps when practical.
- Distinguish the business requirement from the technical implementation.

## 2. Explain the functional change BEFORE coding

Explain in plain language:
- Have we already implemented this ? Is this a necessary change ? ( simple one liners )
- **Current behavior:** what happens if this change is implemented functionnaly?
- **Proposed functional change:** what will behave differently, and for whom?
- **Reason:** why is this change necessary? ( simple one liner )
- **Affected flows:** which user journeys, business rules, integrations, data, or downstream processes change?
- **Acceptance criteria:** what observable results prove the change is correct?

Do not merely say "modify function A." Explain the functional behavior that function implements and what will change because of the modification.

## 3. Challenge the technical solution

Do not automatically accept the first proposed technology, library, pattern, or architecture.

Consider up to three genuinely viable alternatives:

- **A — Minimal change:** reuse the existing implementation or technology.
- **B — Alternative:** use a different implementation or existing component.
- **C — Alternative:** consider another technology or architecture when justified.

These are examples, not mandatory options. Adapt them to the actual problem. If only one reasonable solution exists, explain why rather than inventing alternatives.

### Weighted comparison table

| Criterion | Weight | Option A | Option B | Option C |
|---|---:|---:|---:|---:|
| Functional fit | 30% | /5 | /5 | /5 |
| Simplicity and maintainability | 20% | /5 | /5 | /5 |
| Compatibility with existing system | 20% | /5 | /5 | /5 |
| Reliability and security | 15% | /5 | /5 | /5 |
| Cost and performance | 10% | /5 | /5 | /5 |
| Testability | 5% | /5 | /5 | /5 |
| **Weighted total** | **100%** | **/5** | **/5** | **/5** |

Adjust the criteria and weights when the problem requires it, explaining why. Score based on evidence; mark unknowns instead of inventing certainty.

For each option, briefly explain:
- Advantages
- Disadvantages and risks
- Functional consequences
- Technologies or components introduced or retained
- Why it is or is not appropriate

Recommend one option, but let the user challenge the recommendation.

**Ask the user to choose A, B, C, a hybrid, or a revised option before implementing a significant functional, architectural, or technology decision.** Incorporate the user's reasoning. Do not repeatedly insist on the original recommendation.

For trivial, low-risk fixes with no meaningful alternatives, keep this step short.

## 4. Analyze impacts across functions

When changing function A, investigate what happens to function B and the rest of the system.

- Trace direct and indirect callers, callees, events, callbacks, shared state, and dynamic references where practical.
- Identify functions that may stop being called, become redundant, overlap in responsibility, or become unreachable.
- Check whether affected functions are used elsewhere.
- Explain the functional consequences of retaining, adapting, merging, or removing them.
- Review relevant tests, specifications, interfaces, data contracts, and error paths.

Recommend what to do with affected functions and explain why.

**Never delete functions, remove public interfaces, or make significant destructive or contract-breaking changes without approval.**

## 5. Implement the agreed solution

- Make the smallest coherent change that satisfies the agreed functional requirement.
- Follow repository conventions and avoid unrelated refactoring.
- Explain important naming and design decisions when useful.
- If implementation reveals a new material trade-off, stop and explain it before proceeding.
- Update specifications and documentation when behavior or contracts change.

## 6. Test and validate

- Run relevant tests, linting, type checks, builds, or reproduction steps.
- Add or update regression tests when appropriate.
- Verify the changed behavior and surrounding flows.
- Specifically check that functions identified as potentially redundant are either still used correctly or safely addressed.
- Report exactly which checks ran and their actual results.

Never claim to have inspected GitHub, reproduced a bug, or run tests without evidence.

## Final response

Keep the report concise but include:

1. **Functional change:** current behavior → proposed behavior.
2. **Root cause:** evidence from code, specifications, or GitHub.
3. **Impact analysis:** affected functions, flows, and potentially redundant code.
4. **Comparison table:** weighted A/B/C options, advantages, disadvantages, and recommendation.
5. **Decision required:** ask the user to choose when a significant decision remains.
6. **Implementation and validation:** changes made and actual test results.

If information or tool access is missing, state the limitation clearly and identify the next step.

