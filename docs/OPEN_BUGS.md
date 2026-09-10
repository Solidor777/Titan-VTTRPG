# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. `ExportDialog.test.js` intermittently times out under the full unit suite's parallel worker pool

- **What:** `tests/unit/spreadsheet/ui/ExportDialog.test.js` and `ImportDialog.test.js` each pass
  standalone and pass when run together as a pair, but `ExportDialog.test.js` alone (with
  `ImportDialog.test.js` absent) times out (5000ms, dynamic `import()` never resolves) when the full
  `tests/unit` suite runs under Vitest's default parallel worker pool.
- **Severity:** Low. Reproduces intermittently under full-suite parallel load only; the affected
  test passes reliably in isolation and in every targeted run, so it doesn't indicate an actual
  defect in the dialog code under test.
- **Found:** 2026-09-10, during the compendium-spreadsheet Task 15 review — reproduced twice
  consistently, then confirmed pre-existing and unrelated to Task 15's new dialog by reproducing the
  same timeout with `ImportDialog.test.js` removed from the tree entirely.
- **Fix direction:** Not yet diagnosed. Suspect worker-pool contention delaying the dynamic
  `import()` beyond the default per-test timeout under full-suite parallel load; a per-file
  `testTimeout` override or moving these two dialogs' dynamic imports to a shared `beforeAll` are
  candidate mitigations, not yet tried.

