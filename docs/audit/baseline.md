# Source baseline — 2026-10-11

## Verified base

- Fork: `origin = git@github.com:maiabuc/expense-io.git` (fetch and push).
- Initial branch: `feat/audit`. Initial tracked changes: none. Initial untracked directory: `AGENT_Files/` (preserved).
- Intended base: fork `main`, identified by local `origin/HEAD -> origin/main` and live remote HEAD/main.
- Exact base and audit branch HEAD: `265924bc7274047989e708ab635c2854d376230f`.
- Created `audit/arla-2026-10` explicitly from that SHA. No commits or push made.
- `git ls-remote origin HEAD refs/heads/main` initially failed DNS in sandbox; retry outside sandbox returned the same exact SHA for both. See [source evidence](evidence/source-baseline.md).
- Git metadata is read-only in the normal sandbox; the authorised branch creation succeeded with escalation.

## Instructions and local preservation

No pre-existing AGENTS.md was found in the checkout or applicable parent directories. Read both supplied documents under `AGENT_Files/Documentation/` (actual spelling). Their full contents were inspected in segments after a combined output was truncated. Checkout `.agents/` and `.codex/` contain no skill files. Correction after Maia's question: global `/home/maiabuc/.agents/skills/grill-with-docs/SKILL.md` exists but was missed during the initial inspection. It requires `grilling` and `domain-modeling` via a Skill tool; neither dependency was found under the searched global `.agents`, `.codex` and `.claude` locations, and no Skill tool is exposed in this session. The initial tracing exercise was an ordinary playbook checkpoint, not execution of this skill. No additional skills installed. See AUD-012. Subsequent update: Maia installed the dependencies; both `grilling` and `domain-modeling` instructions are now accessible and have been read. The installation blocker is resolved; interview in progress. Skills can be followed directly from their instructions without a dedicated Skill tool.

Existing `.env`, `node_modules/`, `.next/`, generated type file and ignored files were present. They are user environment state, not reproducible baseline evidence; preserve them. Do not read/copy `.env` into audit evidence. Historical source SHA matches this base, but observations were reread rather than accepted solely on that match.

## Environment and existing checks

MEASUREMENT: `node --version` = `v24.6.0`; `npm --version` = `11.5.1`; `command -v docker` = `/usr/bin/docker`. Docker daemon access, Compose and services are not yet checked.

OBSERVATION: package manifest pins Next.js 16.3.5 and React 19.2.8; actual installed versions and locked installation remain unverified. Scripts include `lint`, `typecheck`, `build`, `dev`, `start`, migration/bucket/seed commands. No `test` script or tracked test/CI files found using `git ls-files '*test*' '*spec*' '.github/*'` and the tracked inventory.

| Check | Result | Reason / next evidence |
| --- | --- | --- |
| Locked install | Not run | Separate scratch checkout and cache required |
| ESLint | Not run | Learning checkpoint pending; run in isolated checkout |
| TypeScript | Not run | Same; do not overwrite local generated output |
| Production build | Not run | Same; capture exit code and build log |
| Startup | Not run | Isolated DB/S3 fixtures not prepared; checkpoint pending |
| Migrations / bucket / seed | Not run | Never target existing environment |
| Existing automated tests | None identified in tracked base | This is absence of an identified suite, not a passing test result |

Stage 3 is pending, not completed. See [runtime protocol](evidence/runtime-protocol.md). No demonstrated runtime defect, performance measurement or full audit conclusion yet.
