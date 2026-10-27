# SonarQube local audit — 26 October 2026

OBSERVATION: audited source HEAD `2e9e30cf9f21a240c1213da6baec7f4c61618175`. The working tree already had a modified `package-lock.json`; it was copied into the snapshot but excluded from analysis. Application code and existing services were preserved. No fixes were selected or applied.

Dashboard: http://localhost:9000/dashboard?id=expense-io-audit (private project).
Login: `admin`. The generated password is stored outside the repository in `/tmp/expense-io-sonar-audit-20261026/login.txt` (owner access only). No credentials are stored in these evidence files.

## MEASUREMENT

- SonarQube Community Build `26.10.0.133078`; SonarScanner CLI `8.1.0.6389`. Image digests: [images.json](images.json).
- Scanner exit code **0**; server computation **SUCCESS**. See [scanner.log](scanner.log) and [compute-task.json](compute-task.json).
- **107 indexed files**, including tests; production metrics: **64 files**, **3,497 non-comment lines**, **6.3% duplicated lines** (266 lines, 10 blocks).
- **16 findings**: 9 classified as vulnerabilities, 1 bug, 6 code smells. Severity labels: 4 blocker, 1 critical, 5 major, 6 minor. These are tool classifications, not verified exploitability.
- **0 security hotspots** returned by this version/profile.
- Quality gate **OK**, with **zero evaluated conditions**. This does not establish an acceptable overall security or reliability result. Reported overall ratings: security E, reliability D, maintainability A.
- Coverage **0.0%** is the scanner's no-report result; **no coverage report was imported and no tests were executed in this audit**. It is not evidence that existing tests exercise none of the code.

Raw results: [measures](measures.json), [issues](issues.json), [hotspots](hotspots.json), [quality gate](quality-gate.json).

## Scope and limits

[Configuration](sonar-project.properties) scans `src`, `scripts`, `migrations`, `.github`, selected root configuration files, and `tests` as test code. The snapshot contains 119 tracked files; [source-manifest.json](source-manifest.json) records their SHA-256 hashes and initial working-tree state. Five detected languages: TypeScript, JavaScript, CSS, JSON and YAML. Listing SQL migrations in the source scope does not prove SQL behavior or analysis support.

Excluded: fixtures, lockfile, dependencies, generated output, language data, environment files, documentation and untracked files. No dependencies were installed in the snapshot. SCM blame is disabled; source revision is supplied explicitly. The scanner warned that text/secrets analysis was limited to language-associated files because the snapshot has no Git metadata. Dependency analysis was skipped. No runtime, API, E2E, database isolation, OCR or performance checks were run.

OBSERVATION: alerts concern PATH resolution in CI scripts (6), a sorting comparator (1), potential credentials in CI/seed code (3), regular-expression performance (4), and tests where the analyzer did not identify assertions (2). Applicability and false positives remain unreviewed; no secret values are reproduced here. No application vulnerability is confirmed by this run alone.

## Local operation

Container: `expense-io-sonarqube-audit-20261026`, bound only to `127.0.0.1:9000`. Its own named volumes preserve data, extensions and logs. The embedded database is used for this local evaluation, following the [official Docker example](https://docs.sonarsource.com/sonarqube-community-build/try-out-sonarqube). Existing PostgreSQL, LocalStack and monitoring containers were neither stopped nor modified.

The isolated snapshot and local runner are in `/tmp/expense-io-sonar-audit-20261026/`. Temporary files may be removed by the operating system; audit evidence is retained here and SonarQube data is in Docker volumes. To restart this specific server later: `docker start expense-io-sonarqube-audit-20261026`.

PROPOSAL: review each finding against its actual call path and input bounds before selecting any code change. Maia's understanding has not been assessed during this operational scan.
