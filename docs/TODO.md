# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

- Add a direct unit test for `ApplyImport.js`'s embedded-create parent-fallback path: falling back to
  `pack.getDocument(parentId)` when the parent isn't in the in-run `resolved` map, and throwing a
  descriptive Error if genuinely absent. Currently exercised only indirectly.

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

- Importing only a child sheet (e.g. just `weapon.csv`, omitting the owning `npc.csv`) for an embedded
  row whose parent already exists in the target pack still fails: `PlanImport.js`'s `depthOf` treats an
  id absent from the uploaded file's own envelopes as depth 0, so the row is looked up via
  `targetPack.getDocument(id)` (which returns null for an embedded id) rather than resolved as a child of
  its real, out-of-file parent — it then falls to the create path and `ApplyImport.js` throws "the
  parent document was not found". Pre-existing, not introduced by the C2-C4 embedded-routing fix; that
  fix makes embedded re-import look more general than it is now that whole-graph re-imports genuinely
  work. Needs `depthOf`/`resolveExistingDocument` to consult the target pack itself (not just the
  uploaded file's own envelopes) when an id's parent is missing from the file.
