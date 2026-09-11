# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

- Verify whether any current TITAN item/actor/effect schema has a 2D primitive array field (a primitive
  array nested inside another primitive array). `detectArrayPaths`/`buildArrayPathMatcher` in
  `src/spreadsheet/codec/BuildTables.js` can represent a primitive array nested inside another array,
  but a primitive array nested inside ANOTHER primitive array has no representable array-path shape in
  the current relational-layout output. If such a field exists (or is ever added), relational-layout
  export/import would silently mishandle it; needs a design extension.

- Verify whether any current TITAN array-of-objects field (`attack`, `trait`, `rulesElement`,
  `customTrait`, `aspect`, `customAspect`) has a sub-field literally named `_id`. `buildChildSheet` in
  `src/spreadsheet/codec/BuildTables.js` spreads `...fields` after the sheet's own `_id`/`_index`
  columns when building relational child-sheet rows, so a colliding sub-field name would silently
  overwrite the owning document's id column in that row. Needs a reserved-name collision check if a
  colliding field exists.

- Mixed-type Actor-pack exports get unordered columns for embedded Item/ActiveEffect sheets.
  `resolveTypeSchemas(pack.metadata.type)` in `src/spreadsheet/io/ExportCompendium.js` only resolves
  schema/column-order info for the pack's own top-level type, so an Actor pack's embedded Item and
  ActiveEffect sheets degrade to unordered (first-seen) column order. Not a data-loss bug — a
  readability/consistency gap for GMs editing an Actor-pack export's embedded-item sheets.

- Add a direct unit test for `ApplyImport.js`'s embedded-create parent-fallback path: falling back to
  `pack.getDocument(parentId)` when the parent isn't in the in-run `resolved` map, and throwing a
  descriptive Error if genuinely absent. Currently exercised only indirectly.

- `FolderPath.js`'s folder-name escaping doesn't escape a literal backslash. It escapes a literal `/` in
  a folder name as `\/` for its path-joining scheme, but a folder name containing both `\` and `/` in
  certain arrangements can be mis-split by `ApplyImport.js`'s `splitFolderPath`. Narrow edge case;
  pre-existing gap in the escaping scheme design.

- The spec's 31-character-sheet-name fallback (truncate + running-number suffix, with the manifest
  recording the real mapping) is not implemented consistently: `BuildTables.js` writes the full,
  untruncated sheet name into the manifest, while `Xlsx.js`'s `encodeXlsx` independently
  truncates/de-duplicates names when writing the file (`uniqueSheetNames`, already exported for this
  purpose, is never called from `BuildTables.js`). On import, a manifest lookup against the real
  (truncated) sheet name misses and the document/child sheet is silently dropped with no error. No
  current TITAN type name exceeds 31 chars, so this is latent, not reachable today. Needs an
  architecture decision: either apply `uniqueSheetNames`-style truncation once, at the `Workbook`
  level in `BuildTables.js`, before either format's encoder runs (so CSV and XLSX sheet names and the
  manifest all agree), or teach `encodeXlsx` to write its truncated mapping back into the manifest sheet
  it's given. Needs a unit test locking in whichever fix is chosen (the spec's Testing section requires
  one; none exists yet).

- String cells in an untyped bag (rules elements, traits, `flags.*`) that look like a number or boolean
  are coerced on import (e.g. a literal string `"5"` decodes to the number `5`), contradicting the
  spec's stated invariant that XLSX cells "carry native types... so values round-trip without
  interpretation" for an already-typed XLSX value. `DecodeCell.js`'s `decodeLiteral` only skips
  coercion for non-string runtime values, but an XLSX string cell decodes to a JS string regardless of
  what a user typed — so this is currently reachable, not latent. The CSV path is also lossy here since
  the exporter never emits the spec's documented double-quote-forcing form (`""5""`) to protect such
  values on export. Needs either fixing `encodeXlsx`/`encodeCsv` to defensively quote/mark
  numeric-looking or boolean-looking strings on write, or accepting and re-documenting the current
  behavior if round-tripping such values isn't actually a real use case — a design call, not a
  mechanical fix.

- Two checked-in XLSX test fixtures are still needed from the user: one `.xlsx` file saved by real
  Microsoft Excel, one exported by real Google Sheets, both derived from a real export this feature
  produces, added under `tests/fixtures/spreadsheet/` with a follow-up unit test in `Xlsx.test.js`
  reading them. The current `t="s"` shared-strings decode test uses a hand-built synthetic archive, not
  a file any real spreadsheet application produced, so "Excel/Google Sheets can actually open and
  round-trip our export" remains unverified by anything in the test suite.

- The spec's Testing section also requires an e2e case for the 31-character-sheet-name-truncation
  fallback above (unit-level) and, separately, an actor-pack round trip with embedded items and
  effects — the latter surfaced 4 Critical defects when finally exercised by the final whole-branch
  review's fix round; see `docs/CLOSED_BUGS.md` for that fix. Keep both spec-mandated test cases in
  mind if this feature's test suite is revisited.

- `ImportDialogShell.svelte`'s computed `plan` is invalidated when the selected files change
  (`onFilesChosen`) but not when the target pack or the delete-missing checkbox changes, so clicking
  Apply after changing either of those without re-previewing can run a plan computed against a
  different pack/option than the one currently selected. Degrades to an import-time error notification
  (ids won't resolve against the wrong pack) rather than silent corruption, but a one-line invalidation
  guard would close it.

- `ExportCompendium.js`'s single-sheet CSV branch (skip the zip, write one bare `.csv` file) is
  effectively dead code in practice: the manifest sheet is always emitted alongside the document
  sheet(s), so `workbook.sheets.length === 1` only holds for a pack with zero documents. Matches the
  spec's literal wording, but worth knowing a CSV export of any non-empty pack is always a `.zip` file,
  not a bare `.csv`.

- `ReadTables.js` merges relational child-sheet rows into their parent by raw `_id`. Two or more brand
  new documents in the same import that all leave `_id` blank (rather than using a file-local key like
  `"new-goblin"`) collapse onto the same blank-string map key, cross-contaminating their relational
  array data. Using a file-local key avoids this; a purely blank-id relational-layout import of
  multiple new documents does not. Narrow edge case (most realistic imports either update existing ids
  or use file-local keys for new rows), but worth a guard or a documented convention against blank ids
  in relational-layout new-document imports.

- Importing only a child sheet (e.g. just `weapon.csv`, omitting the owning `npc.csv`) for an embedded
  row whose parent already exists in the target pack still fails: `PlanImport.js`'s `depthOf` treats an
  id absent from the uploaded file's own envelopes as depth 0, so the row is looked up via
  `targetPack.getDocument(id)` (which returns null for an embedded id) rather than resolved as a child of
  its real, out-of-file parent — it then falls to the create path and `ApplyImport.js` throws "the
  parent document was not found". Pre-existing, not introduced by the C2-C4 embedded-routing fix; that
  fix makes embedded re-import look more general than it is now that whole-graph re-imports genuinely
  work. Needs `depthOf`/`resolveExistingDocument` to consult the target pack itself (not just the
  uploaded file's own envelopes) when an id's parent is missing from the file.
