# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. Foundry server drops mid-run under the full throttled e2e suite, cascading into unrelated failures

- **What:** During a full `npm run test:e2e` (throttled) run, the server stopped answering
  `http://localhost:30000/join` (`net::ERR_CONNECTION_REFUSED`) partway through, failing 10 tests and
  leaving 11 more not run (494/515 passed). Failures span unrelated specs with no shared code path —
  `interaction-rolls`, `item-check-damage-reduction`, `settings-list-reorder`, `socket-sync` (A5),
  `spells-filter`, `theme-editor-header` (×2), `theme`, `trait-add-custom`, `traits` — all failing at the
  identical `login()` navigation step in `fixtures.js:24`, consistent with the server process itself
  going down rather than 10 independent regressions.
- **Severity:** Low-medium. Not reproduced on demand; the same run's slow-operation report shows a
  30.6s navigation wait and several multi-second `beforeAll` retries just before the failures start,
  suggesting resource contention under the throttled (`BelowNormal` priority, 12/24 cores) profile
  rather than an application bug.
- **Found:** 2026-09-10, during the compendium-spreadsheet final-review fix round's full-suite
  regression check. The compendium-spreadsheet suite itself (fast subset, 6/6 including the new
  actor-embedded test) was confirmed passing against a live client separately and is not implicated.
- **Fix direction:** Not yet diagnosed. Capture server-process stdout/exit code across a full throttled
  run and correlate its death timestamp against the slow-operation log and system resource counters
  (matching the existing `pack-lock-and-server-restart` diagnostic approach) before assuming a specific
  cause.

### 2. Full unit-suite runs time out under heavy concurrent machine load, unrelated to the tests themselves

- **What:** Four consecutive `npx vitest run` (whole-suite) attempts during Task 1's verification
  (`docs/superpowers/plans/2026-09-10-spreadsheet-backlog-closeout.md`) showed run duration climbing
  run-over-run (48s → 89s → 99s → 100s, `transform` worker-time climbing from 375s to ~1300s
  cumulative) and a growing, inconsistent set of `beforeAll` hook timeouts (60000ms) in the schema
  golden-master suites (`ItemDataModelSchemaEquivalence.test.js`, `ReportChatMessageSchemaEquivalence.test.js`,
  others varying run to run) plus one unrelated timeout in `SuperviseServer.test.js`
  (`getAncestors starts with the real parent process`, a 5000ms process-inspection test with no
  dynamic import). `tasklist` showed 5-6 `node.exe` processes already running before any of these
  vitest invocations, with a new one appearing between runs, indicating concurrent external activity
  on the machine rather than a defect in these tests: the same 4 files targeted by CLOSED_BUGS #42's
  fix passed 3/3 (13/13 tests) even under this same load, in isolation, with only their own duration
  rising (5s → 19s → 24s).
- **Severity:** Low. Not reproduced against an idle machine; the affected suites already carry the
  deliberate 60s `hookTimeout` headroom documented in `vitest.config.mjs`, and no test content changed.
- **Found:** 2026-09-10, during Task 1 of the spreadsheet-backlog-closeout plan, while attempting the
  plan's required "three clean full-suite runs" verification for CLOSED_BUGS #42.
- **Fix direction:** Not yet diagnosed. Identify what else was running concurrently (`tasklist`
  correlation, matching the `pack-lock-and-server-restart` and e2e-server-drop (#1) diagnostic
  approach) before assuming a specific cause; re-run the full suite on an otherwise-idle machine to
  confirm it is clean baseline behavior.
