## About:
A success based roll system designed for virtual tabletop.

## Compendium packs

The shipped `TITAN Effects` compendium (`titan.effects`, the standard effects the Effect Tray browses) is
authored as one JSON document per effect under `packs/_source/effects/`, grouped into directories that
mirror its compendium folders (each holding a `_Folder.json`). The LevelDB pack Foundry reads is build
output and is not tracked.

- `npm run build:packs` compiles every `packs/_source/<name>` into `packs/<name>` (run by CI and the release
  workflow, and after a fresh clone or a source edit).
- `npm run extract:packs` writes a pack edited inside Foundry back to its JSON source.

Foundry holds an exclusive lock on every declared pack while a world is running, so return the world to
setup (or stop the server) before running either command.

## Compendium spreadsheet export/import

GMs can export any Actor, Item, or ActiveEffect compendium to a spreadsheet, edit it in Excel, Google
Sheets, or a text editor, and import it back. Right-click a pack in the Compendium sidebar for "Export
to spreadsheet…" and "Import spreadsheet…", or use the matching header button on the Compendium tab.

**Format and layout.** Export as an `.xlsx` workbook (one sheet per document type/tab) or a `.zip` of
`.csv` files (one file per sheet). Choose a layout when exporting:

- **Wide** — every document is one row; a repeating field (e.g. a weapon's attacks) becomes numbered
  columns like `system.attack.0.damage`, `system.attack.1.damage`, and so on.
- **Relational** — each repeating field gets its own sheet/file instead, with a column linking each row
  back to its parent document. This keeps very wide fields from producing unwieldy sheets.

**Editing cells.** Most columns hold plain text or numbers. A few free-form columns (rules elements,
traits, and custom flags) auto-detect the value you type: `true`/`false` become booleans, plain numbers
become numbers, and an empty cell becomes nothing. To force a value to stay text (for example, a code
that happens to look like a number), wrap it in double quotes, e.g. `"5"`. Exporting already does this
for you: a free-form string that looks like a number, `true`/`false`, or `null` is written back out
already wrapped in quotes, so it stays text the next time you import the file.

**Importing.** Import matches rows to existing documents by their id column and updates them in place
(new rows with no matching id are created); nothing is deleted unless you turn on the optional "delete
missing" setting, which only removes top-level documents that were in the pack but are absent from the
sheet.
