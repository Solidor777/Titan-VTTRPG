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

- Add a direct unit test for `ApplyImport.js`'s embedded-create parent-fallback path: falling back to
  `pack.getDocument(parentId)` when the parent isn't in the in-run `resolved` map, and throwing a
  descriptive Error if genuinely absent. Currently exercised only indirectly.

- `FolderPath.js`'s folder-name escaping doesn't escape a literal backslash. It escapes a literal `/` in
  a folder name as `\/` for its path-joining scheme, but a folder name containing both `\` and `/` in
  certain arrangements can be mis-split by `ApplyImport.js`'s `splitFolderPath`. Narrow edge case;
  pre-existing gap in the escaping scheme design.

- One checked-in XLSX test fixture is still needed from the user: a `.xlsx` exported by real Google
  Sheets, derived from this feature's real `titan.effects` export, added as
  `tests/fixtures/spreadsheet/google-sheets-edited.xlsx` with a matching test in `Xlsx.test.js` (see the
  existing "decodes an .xlsx file ... re-saved by real Microsoft Excel" test for the pattern to follow).
  The Excel half is done: `tests/fixtures/spreadsheet/excel-edited.xlsx` was produced by exporting
  titan.effects, editing one cell's value in real Excel 16.0 via COM automation, and re-saving, with a
  passing round-trip test. Google Sheets requires a real Google account signed into a browser, which
  this agent has no access to and should not be given credentials for; the user needs to do this step
  themselves: open the exported .xlsx in Google Sheets, edit one cell's data (not the format), then
  File > Download > Microsoft Excel (.xlsx), and hand the resulting file over.

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
