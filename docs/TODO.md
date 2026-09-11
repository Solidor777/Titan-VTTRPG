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
