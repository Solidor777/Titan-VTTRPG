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

### 2. `ImportDialogShell.svelte` fails `npm run eslint` with two `svelte/valid-compile` errors

- **What:** `src/spreadsheet/ui/ImportDialogShell.svelte` initializes `targetMode` (line 19) and
  `targetCollection` (line 22) with `$state(...)` expressions that read the `initialPack` prop
  directly, which the Svelte 5 compiler flags as `state_referenced_locally` (promoted to a lint
  ERROR, not a warning, by `eslint-plugin-svelte`'s compiler-diagnostic passthrough) — this is the
  ONLY non-warning finding in the full `npm run eslint` run. The CI gate (`eslint` is one of its
  steps) is currently red on this branch because of it.
- **Severity:** Low-to-medium. Functionally, each `ImportDialogShell` instance is mounted fresh per
  dialog open (`TitanDialog`'s standard mount/unmount lifecycle), so `initialPack` never changes
  after mount in current usage — the one-shot capture is very likely correct behavior, not a live
  bug. Not yet verified whether any call site re-renders the SAME shell instance with a new
  `initialPack` value, which would make the capture stale.
- **Found:** 2026-09-10, during Task 18's final `npm run eslint` gate run. Confirmed pre-existing
  (reproduces identically with Task 18's documentation-only changes stashed out), introduced by an
  earlier task in this plan (commit `0d9c114e`, "feat: add the compendium spreadsheet import
  dialog") and not caught by that task's review.
- **Fix direction:** Either move the reads inside a `$derived`/`$effect` (if `initialPack` is ever
  expected to change post-mount) or silence the compiler diagnostic with a scoped
  `<!-- svelte-ignore state_referenced_locally -->` comment (if the one-shot capture is confirmed
  intentional) — needs the call-site verification above before choosing.

