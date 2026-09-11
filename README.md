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

## Linting

`npm run eslint` / `npm run eslint-fix` lint `src/`, `tests/`, `scripts/`, and the config files
themselves. `test/build/` (the built IIFE test/e2e bundles) is build output, not source, and is
excluded via `eslint.config.js`'s `ignores`.

## Publishing a spreadsheet as Markdown

`npm run export:markdown -- <input> [<input>...] [--out <file.md>] [--title <text>] [--lang <file>]`
renders an exported Item spreadsheet into a single Markdown reference document (headings, a table of
contents, and one formatted block per item/attack), without opening Foundry.

**Inputs.** One or more paths, each an `.xlsx` workbook, a `.zip` of `.csv` files, a loose `.csv` file,
or a directory (every `.csv`/`.xlsx`/`.zip` file directly inside it, sorted by name). Multiple loose
`.csv` files are read together as one workbook; each `.xlsx`/`.zip` is read on its own. Only **Item**
compendium exports can be rendered — an Actor or ActiveEffect export exits with an error.

**Defaults.** `--out` defaults to the first input's path with its extension replaced by `.md` (a
directory input writes `<dir>/<dirname>.md`). `--title` defaults to the first input's file name without
its extension (a directory's own name for a directory input). `--lang` defaults to the system's own
`lang/en.json`.

**Headings.** Documents with no folder render first, grouped by type (Weapons, Armor, Shields,
Equipment, Commodities, Abilities, Spells, in that order); unfoldered Spells are further split into a
tradition heading per non-blank `system.tradition` value, with blank-tradition spells listed directly
under the Spells heading. Every root folder then renders alphabetically as its own heading (folder
depth beyond 3 clamps to an H3); a folder holding more than one Item type splits into type-group
headings one level below its own, but a folder's own spells are never split by tradition (the GM's
folder wins). Every heading, item, and attack gets a table-of-contents entry, in the order it renders.

**Rendering.** Rules elements are never rendered. A Spell's casting difficulty/complexity is
recomputed from its aspects when `system.castingCheck.autoCalculateDC` is on, otherwise the stored
values are used; its `**XP Cost:**` line always renders regardless of value. Item descriptions convert
from the stored ProseMirror HTML to Markdown.
