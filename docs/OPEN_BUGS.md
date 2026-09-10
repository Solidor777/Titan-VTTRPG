# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

- [Test infra] `tests/unit/spreadsheet/ui/ExportDialog.test.js` and `ImportDialog.test.js` each pass
  standalone and pass when run together as a pair, but `ExportDialog.test.js` alone (with
  `ImportDialog.test.js` absent) times out (5000ms, dynamic `import()` never resolves) when the full
  `tests/unit` suite runs under Vitest's default parallel worker pool — reproduced twice consistently.
  Confirmed pre-existing and unrelated to the compendium-spreadsheet Task 15 dialog: same timeout
  occurs with the new `ImportDialog.test.js` removed from the tree entirely. Root cause not yet
  diagnosed; suspect worker-pool contention delaying the dynamic import beyond the default test
  timeout under full-suite parallel load.

