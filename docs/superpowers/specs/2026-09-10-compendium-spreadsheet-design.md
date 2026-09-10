# Compendium Spreadsheet Export / Import

**Date:** 2026-09-10
**Status:** Approved design; awaiting implementation plan
**Goal:** Let a GM export any TITAN compendium (Actor, Item, or ActiveEffect pack; system or world) to a
spreadsheet, edit it in Excel or Google Sheets to balance values and fix typos, and import the file back into
the same compendium or a new one. Every document type and every persisted field is covered, without
per-type code.

## Decisions taken during brainstorming

| Question | Decision |
|---|---|
| Where the tool runs | Inside Foundry as a GM-only tool (no pack locks, world packs supported, live data-model validation). |
| File formats | Both XLSX and CSV, sharing one table convention. |
| Array layout | Wide (indexed dotted columns) is the base for both formats; relational child sheets are an export option for both formats. Import auto-detects the layout. |
| Embedded documents | Owned items and effects are rows on their own type sheets with a `_parentId` column, in both layouts and both formats. |
| Import into an existing pack | Upsert by `_id`; rows without an id create; pack documents absent from the file are left alone and listed, with an opt-in checkbox to delete them. |
| XLSX library | `fflate` (MIT, 33 KB minified) plus a minimal in-repo XLSX reader/writer. Rejected: exceljs (948 KB) and SheetJS mini (251 KB, npm release frozen at 0.18.5). |

Measured for scale: `dist/index.js` is 724 KB minified at the time of writing.

## Architecture

Three layers with one-way dependencies: `codec` (pure, no Foundry globals), `format` (bytes and text),
`io` (Foundry documents and downloads), and `ui` on top. The codec is unit-testable with plain objects.

```
src/spreadsheet/
  codec/
    Workbook.js               typedefs: Workbook { sheets: Sheet[] }, Sheet { name, columns, rows }
    FlattenDocument.js        document source → { path: value } map; arrays indexed; embedded documents split out
    UnflattenRow.js           { path: value } map → document source; arrays rebuilt with index compaction
    BuildTables.js            documents → Workbook (wide or relational), including the _manifest sheet
    ReadTables.js             Workbook → document sources + parent links; layout detected from the manifest
    DecodeCell.js             CSV text cell → typed value (schema-driven where typed, literal rules otherwise)
  format/
    Csv.js                    RFC 4180 writer and parser: one Sheet ↔ one text
    Xlsx.js                   minimal .xlsx writer and reader over fflate
    Zip.js                    fflate wrappers: zip named files, unzip to named files
  io/
    ExportCompendium.js       pack → Workbook → bytes → foundry.utils.saveDataToFile
    PlanImport.js             files → Workbook → validated ImportPlan { creates, updates, deletes, folders, errors }
    ApplyImport.js            ImportPlan → create/update/delete documents in the target pack
  ui/
    ExportDialog.js, ExportDialogShell.svelte
    ImportDialog.js, ImportDialogShell.svelte
src/hooks/
    OnGetCompendiumContextOptions.js   adds "Export to spreadsheet…" and "Import spreadsheet…" to a pack entry
    OnRenderCompendiumDirectory.js     adds an "Import spreadsheet…" header button to the Compendium sidebar tab
```

- Dialogs extend the existing `TitanDialog` (`src/helpers/dialogs/Dialog.js`) and mount Svelte 5 shells.
- Hooks are registered in `src/index.js` like every other hook. The context-menu hook name in v14 is
  `getCompendiumContextOptions` (fired by `CompendiumDirectory#_createContextMenu`, target
  `.directory-item[data-pack]`); the header button is injected on `renderCompendiumDirectory`.
- Supported pack types: `Actor`, `Item`, `ActiveEffect`. Entries are hidden on other pack types and for
  non-GM users.
- New runtime dependency: `fflate` (pinned exact version in `package.json`). No dynamic imports.

## Table model

### Sheets

- One sheet per document type present in the pack, named by the type (`weapon`, `npc`, `effect`).
- Embedded documents (an actor's items and effects, and effects on those items) are rows on their own type
  sheets with `_parentId` set to the owning document's `_id`. Nesting depth is two: actor → item → effect.
- A `_manifest` sheet is always written, with columns `key`, `value`, `documentType`, `arrayPath`. Three
  header rows use only `key` and `value`: `layout` = `wide` | `relational`, `packType` = `Actor` | `Item` |
  `ActiveEffect`, `version` = `1`. Then one row per data sheet: `key` = `sheet`, `value` = the sheet name,
  `documentType` = the type, `arrayPath` = the array path (blank for a document sheet). Sheet names in XLSX are
  limited to 31 characters and must avoid `[ ] : * ? / \`; when a generated name exceeds the limit it is
  truncated and suffixed with a running number, and the manifest carries the real mapping.
- Import reads the manifest when present. Without one, every sheet is treated as a wide-layout document
  sheet whose name is the document type, so a hand-made file still imports.

### Columns

- Fixed leading columns, in order: `_id`, `_parentId`, `_folder`, `name`, `type`, `img`, `sort`.
- Then every other persisted top-level field, `system.*`, and `flags.*` as dotted paths. Columns are the
  union of every exported document's source paths (`Document#toObject()`), ordered by the type's schema
  field order so related fields sit together; paths not present in the schema (untyped bags, flags) follow
  in first-seen order.
- Excluded: `_stats` (server-owned) and `ownership` (compendium-owned; `toCompendium` clears it).
- Actor rows include `prototypeToken.*`.
- `_folder` is the slash-separated path of folder names from the pack root; a `/` inside a folder name is
  escaped as `\/`.
- Rich-text descriptions are exported as their raw HTML text.

### Wide layout

- Arrays expand into indexed columns: `system.attack.0.damage`, `system.attack.0.trait.1.name`,
  `statuses.0`.
- INVARIANT: an array is rewritten wholesale from the sheet whenever any column under its path exists in the
  sheet. Arrays are never merged element-wise, because indices are positional.
- An element exists only if at least one of its cells is non-blank. Gaps compact: blanking every cell of
  `system.attack.0` deletes that attack and later attacks shift down.

### Relational layout

- The document sheet drops every array column.
- Each array path gets a child sheet named `<type>.<arrayPath>` (`weapon.system.attack`,
  `weapon.system.attack.trait`) with fixed columns `_id` (owning document) and `_index` (dotted index path,
  one entry per array level: `0`, `0.2`), followed by the element's flattened non-array fields.
- The wholesale-rewrite invariant applies per array path: if a child sheet for an array path exists, that
  array is rebuilt from the child sheet for every document that has a row on the document sheet.

### Ids

- Exported rows keep the document `_id`.
- On import, a blank `_id` marks a new document and receives a fresh 16-character id.
- A non-blank `_id` that is not a valid Foundry id (16 alphanumeric characters) is a file-local key: it is
  replaced by a fresh id and remapped everywhere it appears in `_parentId` and in relational child-sheet
  `_id` columns. A duplicated NPC row can therefore be keyed `new-goblin` with its item rows pointing at it.
- A valid `_id` that does not exist in the target pack creates a document with that id (`keepId: true`).

## Cell encoding and type coercion

- XLSX cells carry native types (string, number, boolean), so values round-trip without interpretation.
  The reader handles shared strings (`t="s"`), inline strings (`t="inlineStr"`), formula strings
  (`t="str"`), booleans (`t="b"`), numbers (no `t`), and takes the cached `<v>` of a formula cell.
- CSV cells are text and are decoded by one rule set (`DecodeCell.js`):
  1. If the column's path resolves to a typed field in the document type's schema (StringField, NumberField,
     BooleanField, nullable or not), the schema decides the type.
  2. If the path lands inside an untyped object bag (rules elements, traits, aspects, custom traits,
     `flags.*`), literal rules apply: `true` / `false` → boolean; text that parses as a finite number →
     number; `null` → null; anything else → string. To force a string that looks like a number or boolean,
     wrap it in double quotes in the cell: `"5"` decodes to the string `5`.
  3. An empty cell decodes to null for a nullable field, the empty string for a non-nullable string field,
     and otherwise to ABSENT: absent leaves an existing value untouched on update and lets the schema
     default fill on create. Inside an array element an empty cell counts as blank for the element-existence
     rule.
- Text is UTF-8. CSV export writes a byte-order mark so Excel decodes accented text; the parser strips one
  if present. Newlines and quotes inside cells are quoted per RFC 4180.

## Export flow

1. The GM right-clicks a pack entry and picks "Export to spreadsheet…". The dialog offers format (XLSX or
   CSV) and layout (wide or relational).
2. `ExportCompendium` loads every document with `pack.getDocuments()`, walks embedded items and effects
   (including effects on embedded items), and builds the Workbook from each document's `toObject()` source.
3. XLSX downloads as `<pack label>.xlsx`. CSV downloads as a single `.csv` when the Workbook has one sheet,
   otherwise as `<pack label>.zip` containing one `.csv` per sheet plus `_manifest.csv`.

## Import flow

1. Entry: the "Import spreadsheet…" header button in the Compendium sidebar tab, or the pack context-menu
   entry, which preselects that pack as the target.
2. The dialog accepts `.xlsx`, `.csv`, and `.zip`, with multiple selection so loose relational CSVs work.
   Target: an existing pack whose document type matches the file, or "New compendium" with a label
   (`CompendiumCollection.createCompendium({ label, type })`). A checkbox, off by default, enables deleting
   pack documents absent from the file.
3. **Plan** (`PlanImport`, no writes): decode the files into a Workbook; read the manifest; resolve ids and
   file-local keys; order rows so parents precede children (actors, then items, then effects); resolve
   `_folder` paths against the target pack's folders and queue missing folders for creation; validate every
   row. New documents are constructed in memory through the document class
   (`new Actor.implementation(source)`), which throws a `DataModelValidationError` naming the field.
   Updates run `document.updateSource(changes, { dryRun: true })` against the existing document. Every
   failure is recorded as `{ sheet, row, column, message }`.
4. **Preview**: the dialog shows counts of creates, updates, deletes, and errors, plus the error list. If
   any error exists the apply button is disabled: planning is all or nothing.
5. **Apply** (`ApplyImport`): refuse with a notification if the target pack is locked; create the compendium
   if requested; create missing folders (parents first); create and update documents per type in parent
   order, embedded documents through their parent (`items` / `effects` in create data, or
   `updateEmbeddedDocuments` on update); then delete if enabled. Server-side write failures are reported
   as they occur, with what already succeeded listed, and the run stops at the first failure.

## Error handling

- All row-level problems surface in the plan with sheet, row, column, and message; nothing is written while
  any exist.
- Unreadable files (not a zip, not an XLSX, malformed CSV, missing manifest with an unrecognised sheet name)
  fail the plan with a single file-level error.
- A file whose `packType` does not match the selected existing pack is refused before planning.
- A locked target pack is refused at apply with the standard Foundry notification; the tool does not toggle
  the lock.

## Testing

- **Unit (Vitest, `tests/unit/spreadsheet/`)**
  - Flatten and unflatten round-trip for every item type, both actor types, and effects, driven from the
    shape templates plus hand-built fixtures with nested arrays and embedded documents.
  - Wide and relational table building and reading, index compaction, wholesale array rewrite, the manifest,
    and the 31-character sheet-name fallback.
  - The id remapping pass (blank ids, file-local keys, `_parentId` and child-sheet remaps).
  - `DecodeCell` against every rule above, including quoted-string forcing and absent semantics.
  - The CSV writer and parser against RFC 4180 edge cases (quotes, embedded newlines, BOM, CRLF).
  - The XLSX writer read back by the XLSX reader, and the reader against two checked-in fixtures under
    `tests/fixtures/spreadsheet/`: one saved by Excel and one exported by Google Sheets from a sample export.
    The user produces these two files during implementation from the first working export.
- **E2E (Playwright, `tests/e2e/`)**
  - Export the seeded effects pack and assert the manifest and rows through the codec.
  - Import a mutated workbook into a new pack and into the existing pack; assert updated fields.
  - An actor pack round trip with embedded items and effects.
  - The delete-missing option.
  - A locked target refusing at apply.

## Documentation updates (required final step)

- `titan-codebase` skill: add the `src/spreadsheet/` layer to `references/architecture.md`, the two hooks
  to the hook wiring list, and the table conventions to `references/conventions.md`.
- `README.md`: a short user-facing section on the cell-encoding conventions and the layouts.
- `docs/TODO.md` / `docs/OPEN_BUGS.md`: log anything deferred or found.
