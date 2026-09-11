# Spreadsheet Backlog + Unit-Test Flake Close-out — Implementation Plan

**Scope:** every item in `docs/TODO.md` (all belong to the compendium-spreadsheet feature) and
`docs/OPEN_BUGS.md` #1 (the vitest dynamic-import timeout). OPEN_BUGS #2 (e2e server drop) is handled
separately in the main working tree because it needs the live Foundry install.
**Branch:** `campaign/spreadsheet-backlog` (worktree). Tasks run serially in this order; each ends with a
commit. Read `docs/superpowers/specs/2026-09-10-compendium-spreadsheet-design.md` for the feature's
table model before Task 2.
**Model/effort:** implementers `sdd-implementer` (Sonnet, medium); reviewers `sdd-reviewer` (Sonnet,
high). Opus is banned for this campaign.

Standing rules for every task:

- Project style rules in `.claude/CLAUDE.md` apply.
- TDD: failing test → implementation → green; run `npx vitest run tests/unit/spreadsheet` after each
  task and the whole unit suite before the commits of tasks 1 and 12; `npx eslint <changed files>`.
- Delete the corresponding `docs/TODO.md` entry in the same commit that resolves it (entries are deleted,
  never marked done).
- Do not defer anything. If a task cannot be done as written, report BLOCKED with the reason.

---

## Task 1 — OPEN_BUGS #1: eliminate per-test dynamic imports in unit tests

**Files:** every file under `tests/unit/` whose `it(...)`/`test(...)` bodies contain `await import(` (start
from `tests/unit/spreadsheet/ui/ExportDialog.test.js`, `ImportDialog.test.js`,
`tests/unit/hooks/OnGetCompendiumContextOptions.test.js`, then grep `await import\(` across `tests/unit`
and classify each hit as inside-a-test-body vs inside `beforeAll`), `docs/OPEN_BUGS.md`, `docs/CLOSED_BUGS.md`.

1. Mechanism: a dynamic `import()` inside a test body pays the cold Vite transform of the module graph
   under the 5 s per-test timeout, and under full-suite parallel load that transform can exceed 5 s. The
   fix removes the pattern: modules are imported statically, and the globals they read at module-
   evaluation time (`foundry.applications.api.ApplicationV2`, `game.i18n`, …) are established in a
   `vi.hoisted(() => { ... })` block, which Vitest hoists above the static imports. `vi.mock` calls stay
   (they are hoisted too). Per-test mutation of the globals (e.g. `game.user.isGM = false`) stays in
   `beforeEach`/the test.
2. Convert every in-test-body dynamic import found by the grep. Files that import inside `beforeAll`
   (covered by `hookTimeout: 60000`) are left as they are UNLESS the import is trivially convertible the
   same way; do not restructure the schema golden-master suites.
3. Verify: `npx vitest run` three times in a row, all green with no timeouts. Record the three run
   durations in the report.
4. Move OPEN_BUGS #1 to CLOSED_BUGS (next number) with the mechanism and fix; renumber OPEN_BUGS so #2
   becomes #1.
5. Commit: `test: replace per-test dynamic imports with hoisted globals and static imports`.

## Task 2 — Actor-pack exports resolve embedded Item/ActiveEffect schemas (TODO: mixed-type column order)

**Files:** `src/spreadsheet/io/ExportCompendium.js`, `src/spreadsheet/io/ResolveTypeSchemas.js`,
`tests/unit/spreadsheet/io/ResolveTypeSchemas.test.js`, `tests/unit/spreadsheet/io/ExportCompendium.test.js`.

1. Add `resolveTypeSchemasForPack(packType)` in `ResolveTypeSchemas.js`: `Actor` → merge of
   `resolveTypeSchemas('Actor')`, `('Item')`, `('ActiveEffect')`; `Item` → `('Item')` + `('ActiveEffect')`;
   `ActiveEffect` → `('ActiveEffect')`. Subtype names never collide across those document types in this
   system (assert that in the test with the real `system.json` `documentTypes` names).
2. `exportCompendium` and `PlanImport` use it (PlanImport also needs typed decoding for embedded rows —
   check `planImport`'s `resolveTypeSchemas` call and switch it too).
3. Tests: an Actor-pack export orders the embedded weapon sheet's columns by the weapon schema.
4. Commit: `fix(spreadsheet): resolve embedded item/effect schemas for actor and item pack exports`.

## Task 3 — 31-character sheet names applied once at the Workbook level (TODO: sheet-name fallback)

**Files:** `src/spreadsheet/codec/BuildTables.js`, `src/spreadsheet/format/Xlsx.js`,
`tests/unit/spreadsheet/codec/BuildTables.test.js`, `tests/unit/spreadsheet/codec/ReadTables.test.js`, `docs/TODO.md`.

1. Move `uniqueSheetNames` into `src/spreadsheet/codec/Workbook.js` (export it from there; `Xlsx.js`
   imports it from the codec). `buildTables` applies it to the data-sheet names BEFORE writing the
   manifest, so the manifest's `sheet` values and the `Sheet.name`s are the final truncated/de-duplicated
   names in both formats. `encodeXlsx` keeps calling it (idempotent on already-final names) so a
   hand-made workbook is still protected.
2. Test: a document type named `averyveryverylongdocumenttypename` with array path
   `system.somethingreallylong` in relational layout produces sheet names ≤ 31 chars, unique, identical
   in the manifest, and `readTables` rebuilds the documents from the resulting workbook (round trip through
   `encodeXlsx`/`decodeXlsx`).
3. Delete the two TODO entries (the 31-char fallback entry and the "spec's Testing section also requires"
   note — the actor-pack round trip already exists in `tests/e2e/compendium-spreadsheet.spec.js`; confirm
   by reading it and say so in the report).
4. Commit: `fix(spreadsheet): truncate sheet names once at the workbook level so manifest and sheets agree`.

## Task 4 — Protect number/boolean-looking strings in untyped bags on export (TODO: string coercion)

**Files:** `src/spreadsheet/codec/DecodeCell.js`, `src/spreadsheet/codec/BuildTables.js`, tests,
`README.md`, `docs/superpowers/specs/2026-09-10-compendium-spreadsheet-design.md` (Cell encoding section), `docs/TODO.md`.

1. Export `forceStringCell(text)` from `DecodeCell.js`: returns `"${text}"` when `decodeLiteral(text)`
   would not return the identical string (numbers, `true`/`false`/`null`, and already-quoted text),
   else `text`. Apply it in `buildTables` to every string value whose column is NOT a fixed column and
   NOT a schema-typed field (`lookupFieldSchema(typeSchema.fieldTypes, path) === undefined`), in both
   layouts (wide cells and relational child-sheet cells).
2. Tests: round trip `{ name: 'code', value: '5' }` trait through wide XLSX and relational CSV yields the
   string `'5'`; a typed `system.value: 5` number is untouched; a plain string `'Slashing'` is untouched;
   an already-quoted string `'"x"'` round-trips.
3. Update the spec's cell-encoding bullet and the README "Editing cells" paragraph: exported strings that
   look like numbers/booleans are written quoted so they round-trip; a value the user types unquoted is
   interpreted.
4. Commit: `fix(spreadsheet): quote number-like strings in untyped columns so they round-trip`.

## Task 5 — Folder path escaping covers backslashes (TODO: FolderPath escaping)

**Files:** `src/spreadsheet/io/FolderPath.js`, `src/spreadsheet/io/ApplyImport.js` (`splitFolderPath`),
`tests/unit/spreadsheet/io/FolderPath.test.js` (new), `docs/TODO.md`.

1. Escape `\` as `\\` and `/` as `\/` when joining; `splitFolderPath` (move it into `FolderPath.js` as an
   export if it lives in ApplyImport, keep ApplyImport importing it) parses with a single left-to-right
   scan honouring both escapes.
2. Tests: property-style round trip with `fast-check` over folder-name arrays drawn from an alphabet that
   includes `\` and `/` (`fast-check` is a dev dependency; see `tests/unit/` for an existing usage
   pattern), plus explicit cases `['a\\', 'b']`, `['a\\/b']`, `['a/b', 'c']`.
3. Commit: `fix(spreadsheet): escape backslashes in folder paths`.

## Task 6 — Loud guards for unrepresentable shapes (TODO: 2D primitive arrays; TODO: `_id` sub-field collision)

**Files:** `src/spreadsheet/codec/BuildTables.js`, `tests/unit/spreadsheet/codec/BuildTables.test.js`, `docs/TODO.md`.

1. Verify by reading every shape template under `src/document/types/**/*Template.js` and
   `src/document/types/effect/**` that (a) no primitive array is nested directly inside another primitive
   array and (b) no array-of-objects field has a sub-field named `_id` or `_index`. State the file list
   you checked in the report.
2. Add guards in the relational builder: `detectArrayPaths` throws `Error('Unsupported field shape:
   a primitive array nested directly inside a primitive array at "<path>"')` when a concrete path has two
   consecutive numeric segments; `buildChildSheet` throws `Error('Reserved column name "<name>" used by a
   field under "<arrayPath>"')` when a sub-field is `_id` or `_index`. Tests for both.
3. Delete both TODO entries.
4. Commit: `fix(spreadsheet): fail loudly on unrepresentable relational shapes`.

## Task 7 — Blank-id relational new-document guard (TODO: ReadTables blank-id collapse)

**Files:** `src/spreadsheet/codec/ReadTables.js`, `tests/unit/spreadsheet/codec/ReadTables.test.js`, `docs/TODO.md`.

1. In relational layout, when a document sheet has two or more rows with a blank `_id` AND any child sheet
   exists for that type, throw `Error('<sheet>: rows <n> and <m> both have a blank _id; give each new
   document a file-local key (e.g. "new-goblin") so its relational rows can be matched')`. Wide layout and
   a single blank-id row stay allowed.
2. Tests: the error case; two blank-id rows in wide layout still import; one blank-id row in relational
   layout still imports.
3. Commit: `fix(spreadsheet): reject ambiguous blank ids in relational imports`.

## Task 8 — Child-sheet-only import resolves an embedded parent from the target pack (TODO: depthOf)

**Files:** `src/spreadsheet/io/PlanImport.js`, `tests/unit/spreadsheet/io/PlanImport.test.js`, `docs/TODO.md`.

1. Read `depthOf` and `resolveExistingDocument`. When an envelope's `parentId` is blank/absent from the
   file but its `_id` is not a top-level document of the target pack, search the pack's documents'
   `items` and those items' `effects` (and actors' `effects`) for the id; on a hit, treat the row as an
   update of that embedded document with its real parent (and depth) so `ApplyImport` routes it through
   `updateEmbeddedDocuments`. Keep the existing "parent not found" error for a genuinely absent parent.
2. Tests: importing only a `weapon` sheet row whose id is an item embedded on an existing actor in the
   pack plans an embedded update (not a create); a row whose id exists nowhere still plans a create.
3. Commit: `fix(spreadsheet): resolve embedded rows against the target pack when the parent is not in the file`.

## Task 9 — Direct test for ApplyImport's embedded-create parent fallback (TODO)

**Files:** `tests/unit/spreadsheet/io/ApplyImport.test.js`, `docs/TODO.md`.

1. Add tests: (a) parent absent from the in-run `resolved` map but returned by `pack.getDocument(parentId)`
   → the embedded create goes through that parent; (b) parent absent from both → throws the descriptive
   error naming the parent id. No production change expected; if one is needed to make the behaviour
   testable, keep it minimal and say so.
2. Commit: `test(spreadsheet): cover ApplyImport's embedded-create parent fallback`.

## Task 10 — ImportDialogShell invalidates the plan when the target or delete-missing changes (TODO)

**Files:** `src/spreadsheet/ui/ImportDialogShell.svelte`, a new
`tests/unit/spreadsheet/ui/ImportDialogShell.test.js` (use `@testing-library/svelte`; see existing Svelte
component tests under `tests/unit/` for the mounting pattern; mock the io modules with `vi.mock`), `docs/TODO.md`.

1. Clear the computed `plan` whenever the selected target pack or the delete-missing checkbox changes,
   so Apply is disabled until the user previews again.
2. Test: after a preview, changing the target clears the plan (Apply disabled); changing the checkbox
   clears it.
3. Commit: `fix(spreadsheet): invalidate the import preview when the target or options change`.

## Task 11 — Remove the dead single-sheet CSV branch (TODO)

**Files:** `src/spreadsheet/io/ExportCompendium.js`, `tests/unit/spreadsheet/io/ExportCompendium.test.js`,
`README.md`, the spreadsheet spec (Export flow step 3), `docs/TODO.md`.

1. The manifest sheet is always present, so a CSV export always has ≥ 2 sheets; delete the single-sheet
   branch and always write the zip. Update the test that covered it, the README ("a folder of .csv
   files" → "a .zip of .csv files"), and the spec.
2. Commit: `refactor(spreadsheet): CSV export always writes a zip`.

## Task 12 — Documentation sync

**Files:** `docs/TODO.md`, `.claude/skills/titan-codebase/references/architecture.md` and
`conventions.md`.

1. `docs/TODO.md` must contain exactly one entry: the Google Sheets fixture, reworded to state plainly
   that it awaits the user producing the file (an agent cannot sign into Google Sheets). Everything else
   was deleted by the tasks above — verify.
2. Skill references reflect: `resolveTypeSchemasForPack`, `uniqueSheetNames` living in `Workbook.js`,
   `forceStringCell`, `FolderPath.js` owning `splitFolderPath`, the relational guards, and the CSV
   always-zip behaviour.
3. Run `npx eslint .` and `npx vitest run` (whole suite) green.
4. Commit: `docs(spreadsheet): sync backlog docs and codebase skill after the close-out`.
