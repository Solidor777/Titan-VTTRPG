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

