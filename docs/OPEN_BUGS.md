# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. Dynamic-import-pattern unit tests intermittently time out under the full unit suite's parallel worker pool

- **What:** Any test file using this codebase's `vi.mock(...svelte shell...)` + per-test dynamic
  `await import(...)` pattern can time out (5000ms, the import never resolves in time) when the full
  `tests/unit` suite runs under Vitest's default parallel worker pool, while passing reliably
  standalone or in small groups. Confirmed affecting `tests/unit/spreadsheet/ui/ExportDialog.test.js`,
  `ImportDialog.test.js`, and `tests/unit/hooks/OnGetCompendiumContextOptions.test.js` — i.e. not
  confined to the two dialog tests, but to the shared import pattern itself.
- **Severity:** Low. Reproduces intermittently under full-suite parallel load only; every affected
  test passes reliably in isolation and in every targeted run, so it doesn't indicate an actual
  defect in the code under test.
- **Found:** 2026-09-10, during the compendium-spreadsheet Task 15 review (`ExportDialog.test.js`,
  reproduced twice consistently, confirmed pre-existing and unrelated to Task 15's new dialog by
  reproducing the same timeout with `ImportDialog.test.js` removed from the tree entirely); the same
  symptom recurred on the identical pattern during Task 16's review (`OnGetCompendiumContextOptions.test.js`).
- **Fix direction:** Not yet diagnosed. Suspect worker-pool contention delaying the dynamic
  `import()`'s cold Vite transform beyond the default per-test timeout under full-suite parallel
  load; a per-file `testTimeout` override or moving these dynamic imports to a shared `beforeAll` are
  candidate mitigations, not yet tried.

### 2. Foundry server drops mid-run under the full throttled e2e suite, cascading into unrelated failures

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
