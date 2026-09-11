# Spreadsheet → Markdown Reference Export

**Date:** 2026-09-10
**Status:** Approved design (dispatcher-authored under the "decide the best long-term shape" ruling)
**Goal:** A Node script that takes an exported TITAN compendium spreadsheet (the `.xlsx`, `.csv`, or `.zip`
of `.csv` files produced by the in-Foundry "Export to spreadsheet…" tool) and writes a Markdown file in the
same format as `TITAN Rules Compendium.md`, suitable for publishing as player reference material.

## Decisions

| Question | Decision |
|---|---|
| Where it runs | A Node CLI under `scripts/` (like `build-packs.mjs`), no Foundry required. The rendering library is pure and lives under `src/spreadsheet/markdown/` so an in-Foundry "Export to Markdown…" format can reuse it later without a rewrite. |
| Inputs | One or more of: `.xlsx`, `.csv`, `.zip` (of `.csv`), or a directory of `.csv`/`.xlsx` files. Wide and relational layouts both decode through the existing codec. |
| Document types | Item packs only (`ability`, `armor`, `commodity`, `equipment`, `shield`, `spell`, `weapon`). Embedded rows (`_parentId` set, i.e. effects on items) are ignored. An Actor or ActiveEffect pack is refused with a clear error. |
| Sectioning | Headings come from the pack's folder structure. Documents in the same leaf are additionally grouped by type when the leaf holds more than one type. Root-level (unfoldered) documents are grouped by type. Unfoldered spells are further grouped by tradition. |
| Ordering | Folders and documents alphabetical by name (the compendium is alphabetical). `sort` is ignored. |
| Labels | Human labels come from `lang/en.json` (`LOCAL.<key>.text`), loaded by the script and injected as a pure lookup, so trait/attribute/skill/aspect names stay in sync with the system. `--lang` overrides the file. |
| HTML descriptions | Converted to Markdown by an in-repo converter covering the ProseMirror/Foundry subset. No new dependency. Foundry `<section class="secret">` blocks are dropped (GM secrets never reach players). |
| Rules elements | Not rendered — they are automation, not player-facing text (the compendium omits them). |
| Module alias | `src/` modules import through the `~/` Vite alias, so the CLI registers a Node module-resolution hook (`scripts/lib/registerSrcAlias.mjs`, `module.register`) before loading the library. The `scripts/` bootstrap uses the Node loader-registration idiom (register, then import); `scripts/` is not a shipping build, so the "no dynamic imports in shipping builds" rule does not apply there. |
| Spell DC | The casting DC is recomputed from the aspects when `autoCalculateDC` is true, because the exported `castingCheck.difficulty`/`complexity` are the persisted (possibly stale) values. The cost math is extracted from `SpellDataModel.prepareDerivedData` into a pure module shared by the data model and the renderer. |

## CLI

```
node scripts/spreadsheet-to-markdown.mjs <input> [<input>...] [--out <file.md>] [--title <text>] [--lang <file>]
npm run export:markdown -- <input> [...]
```

- `--out` / `-o`: output path. Default: the first input's path with its extension replaced by `.md` (a
  directory input writes `<dir>/<dirname>.md`).
- `--title`: the document title, written as the first line of the file as `# <title> {#<slug>}` above
  the `# Contents {#contents}` block. Default: the first input's basename without extension.
- `--lang`: path to a Foundry language JSON with a `LOCAL` map. Default: `lang/en.json` relative to the
  repo root.
- `--help` / `-h`: usage.
- Exit code 1 with a one-line message on: unreadable/unknown input, a non-Item pack, zero renderable
  documents, or a missing language file. Never partial output on error.

`package.json` gains `"export:markdown": "node scripts/spreadsheet-to-markdown.mjs"`.

## Architecture

```
scripts/
  spreadsheet-to-markdown.mjs        bootstrap: registers the ~/ alias hook, then imports the CLI module
  lib/registerSrcAlias.mjs           module.register() resolve hook: '~/x' -> <repo>/src/x
  lib/spreadsheetToMarkdownCli.mjs   argument parsing, file reading, lang loading, output writing
src/spreadsheet/format/
  DecodeSpreadsheetFiles.js          pure: [{name, bytes}] -> Workbook (xlsx | csv | zip of csv); extracted from
                                     PlanImport.js's decodeFiles, which becomes a thin File -> bytes adapter over it
src/spreadsheet/markdown/
  Labels.js                          createLabels(langJson) -> (key) => text; falls back to the key itself
  Slug.js                            createSlugger() -> (headingText) => unique anchor slug
  HtmlToMarkdown.js                  htmlToMarkdown(html) -> markdown text (ProseMirror/Foundry subset)
  MarkdownText.js                    escapeText(text) (Google-Docs style `\+` / `\-N` escaping + markdown specials),
                                     statLine(label, value), heading(level, text, slug)
  WorkbookToDocuments.js             workbookToDocuments(workbook) -> RenderableDocument[] (top-level Item rows)
  CompendiumTree.js                  buildCompendiumTree(documents) -> section tree (folders, type, tradition)
  RenderCompendiumMarkdown.js        renderCompendiumMarkdown(documents, {title, labels}) -> markdown string
  renderers/
    RenderItemBlock.js               shared block assembly: heading, stat lines, separators, description
    RenderWeapon.js, RenderArmor.js, RenderShield.js, RenderEquipment.js, RenderCommodity.js,
    RenderAbility.js, RenderSpell.js
    RenderTraits.js                  standard + custom trait list text, shared by weapon/armor/shield/equipment
    RenderItemChecks.js              item `check` array -> stat lines, shared by ability/weapon/armor/shield/equipment
src/document/types/item/types/spell/
  CalculateSpellAspectCosts.js       pure: calculateSpellAspectCosts(aspects, customAspects) ->
                                     { aspectCosts: number[], totalAspectCost, difficulty, complexity, enabled: boolean[] }
                                     used by SpellDataModel.prepareDerivedData AND RenderSpell.js
```

All `src/spreadsheet/markdown/` modules are pure: no `foundry`, `game`, `CONFIG`, or DOM globals. They may
import other pure `src/` modules (`SpellAspects.js`, `AttackTraits.js`, `Skills.js`, …).

### RenderableDocument

`workbookToDocuments` runs the existing `readTables(workbook, {})` (empty type schemas: XLSX cells are
already typed; CSV cells follow the literal rules, which is sufficient for rendering) and yields, for every
envelope with no `parentId` whose `documentType` is an Item type:

```
{ type, name, folderPath: string[] /* unescaped segments */, system: object }
```

Folder segments are split on unescaped `/` and unescaped per `FolderPath.js`'s scheme (`\/` → `/`). The
pack type is taken from the manifest's `packType`; when the manifest is absent, every sheet named after
an Item type is accepted and any other sheet name is an error.

### Tree and headings

Heading levels and styles mirror the compendium exactly:

| Level | Form | Used for |
|---|---|---|
| H1 | `# Name {#slug}` | root-level folder, or type group of unfoldered documents, and the title |
| H2 | `## Name {#slug}` | second-level folder, or type group inside an H1 folder |
| H3 | `### **Name** {#slug}` | third-level folder or deeper (clamped), type group inside an H2 folder, spell tradition |
| H4 | `#### ***Name*** {#slug}` | every item |
| H5 | `##### ***Name*** {#slug}` | a weapon attack when the weapon has more than one attack |

Rules:

1. Root: documents with an empty folder path are partitioned by type, each type rendered as an H1 whose
   text is the plural type label (`Weapons`, `Armor`, `Shields`, `Equipment`, `Commodities`, `Abilities`,
   `Spells`; keys `weapons`, `armor`, `shields`, `equipment`, `commodities`, `abilities`, `spells` from the
   lang file, falling back to those English words). Type groups render in that fixed order. Then every
   root folder, alphabetical.
2. A folder node renders its heading at `min(depth, 3)`, then its own documents, then its child folders.
   A folder's own documents are partitioned by type only when more than one type is present; the type
   heading sits one level below the folder heading (clamped at H3).
3. Unfoldered spells (the root `Spells` group) are partitioned by `system.tradition`: documents with a
   blank tradition render first with no tradition heading; each non-blank tradition renders under an H3
   `**<Tradition>**` heading (the tradition text as written, first letter capitalised), alphabetical.
   Foldered spells never get tradition headings (the GM's folders win).
4. Slugs: lowercase; whitespace → `-`; every character outside `[a-z0-9-]` removed; runs of `-`
   collapsed; a repeated slug gets `-1`, `-2`, … in document order (the compendium's convention).
5. Table of contents: the file opens with the title heading `# <title> {#<slug>}`, a blank line, then
   `# Contents {#contents}` followed by one `[Text](#slug)` line per heading in document order (the title
   and `Contents` entries included, item and attack headings included), each separated by a blank line.
   The TOC is followed by a blank line and the first section heading; the compendium's stray `# `
   page-break heading is not reproduced.

### Item block format

```
#### ***Battle Axe*** {#battle-axe}

**Value:** 135  
**Damage:** 2 \+ ES  
**Traits:** Slashing  
---

These axes are designed explicitly as weapons, rather than tools.  
---
```

- Every stat line is `**Label:** value` followed by two spaces (Markdown hard break). The line after the
  last stat line is `---`. With zero stat lines the block is heading, blank line, `---`.
- Then a blank line, the description, and `---`. The description's final line ends with two spaces before
  the `---` line. An empty description renders as heading, stats, `---`, blank line, `---`.
- Blocks are separated by one blank line.
- `+` is escaped as `\+` everywhere in rendered text; `-` immediately followed by a digit is escaped as
  `\-N` (Google Docs export style, matching `**\+1**` and `**\-2**` in the compendium).

### Per-type stat lines (in this order; a line is omitted when its condition fails)

Common: `**Rarity:** <Label>` when `system.rarity !== 'common'`. `**Value:** N` when `system.value > 0`.

- **weapon** — Rarity, Value, weapon-level `**Traits:**` when `system.trait` is non-empty; then attacks:
  - one attack: `**Damage:** D` or `D \+ ES` (when `plusExtraSuccessDamage`); `**Range:** R spaces` when
    `range > 1`; `**Check:** <Attribute> (<Skill>)` when the pair differs from the type default
    (`melee` → body/meleeWeapons, `ranged` → body/rangedWeapons); `**Traits:**` from the attack's standard
    traits (boolean traits by label, numeric traits as `Blast 1`) followed by custom trait names, in stored
    order, comma-separated.
  - more than one attack: the weapon's own lines are NOT followed by `---`; a blank line, then for each
    attack an H5 `***<label> (<Type>)***` heading, blank line, the attack's stat lines; only the final
    attack's stat lines are followed by `---`. (Matches Dagger/Hand Axe/Javelin/Spear.)
  - after the description, `system.attackNotes` (HTML) renders as an additional paragraph group before the
    closing `---` when non-blank.
  - item checks (`system.check`) render after the attack lines (see checks below).
- **armor** — Rarity, Value, `**Armor:** system.armor.max`, Traits (standard by label + custom), checks.
- **shield** — Rarity, Value, `**Defense Bonus:** \+N` (`system.defense`, rendered with sign, omitted when
  0), Traits, checks.
- **equipment** — Rarity, Value, Traits (custom only), checks.
- **commodity** — Rarity, Value. (`quantity` is per-instance and not rendered.)
- **ability** — Rarity, `**XP Cost:** N`, `**Type:** Action, Reaction, Passive` (those flags that are
  true, in that order; omitted when none), Traits (custom only), checks.
- **spell** — first line `**<Attribute> (<Skill>) D:C**` (bold, no label; D/C from
  `calculateSpellAspectCosts` when `autoCalculateDC` else the stored values), Rarity, `**XP Cost:** N`,
  then aspects (enabled only, standard aspects in `SpellAspects` sortOrder, then custom aspects in stored
  order):
  - `range` → `**Range:** Self` / `Touch` / `N spaces`;
  - `radius` → `**Area:** N-space-radius`;
  - scaling aspects (standard `scaling: true` or custom `scaling: true`) collect into one
    `**Enhancements:** A (v \+ ES), B (v \+ ES / cost)` line where the name is the localized `unit` when
    present else the localized `label` (custom aspects use their label text as written), `v` is the
    initial value (omitted with its space when 0/blank), and `/ cost` is appended when the aspect's
    computed cost is greater than 1 (mirrors `SpellAspectTag.svelte`);
  - every other enabled aspect → `**<Label>:** <options>` where options are the localized option names
    (`All` for `allOptions`), followed by `, resisted by <Resistance>` when `resistanceCheck` is set and
    not `none`; a non-scaling custom aspect → `**<label>:** <initialValue>`;
  - `**Traits:** <Tradition>, <custom traits…>` (tradition first when non-blank).
- **checks** (all types except spell/commodity): each `system.check` entry renders as
  `**<label>:** <Attribute> (<Skill>) D:C` with `, <N> Resolve` when `resolveCost > 0`, `, Damage v`
  or `, Healing v` (with ` \+ ES` when `scaling`) when `isDamage`/`isHealing`, and `, resisted by <R>` when
  `resistanceCheck` is not `none`.

Labels: attribute/skill/rarity/trait/option/unit/resistance keys resolve through `Labels.js`
(`body` → `Body`, `meleeWeapons` → `Melee Weapons`, `twoHanded` → `Two-Handed`, `rounds` → `Rounds`).
Fixed English fallbacks exist only for the stat-line labels (`Value`, `Rarity`, `Damage`, `Range`,
`Check`, `Traits`, `Armor`, `Defense Bonus`, `XP Cost`, `Type`, `Area`, `Enhancements`, `Resolve`,
`resisted by`, `spaces`, `space-radius`, `ES`) which are looked up by lang key first (`value`, `rarity`,
`damage`, `range`, `check`, `traits`, `armor`, `defenseBonus`, `xpCost`, `type`, `area`, `enhancements`,
`resolve`, `resistedBy`, `spaces`, `spaceRadius`, `extraSuccesses.short`) and fall back to the English word.

### HtmlToMarkdown

A small tokenizer (tags, comments, text; entity decoding for named `&amp; &lt; &gt; &quot; &apos; &nbsp;`
and numeric references) builds a node tree, then renders:

| HTML | Markdown |
|---|---|
| `<p>` | paragraph (blank line between paragraphs) |
| `<br>` | line break (two trailing spaces + newline) |
| `<strong>`, `<b>` | `**text**` |
| `<em>`, `<i>` | `*text*` |
| `<s>`, `<del>`, `<strike>` | `~~text~~` |
| `<u>` | text unchanged |
| `<code>` | `` `text` `` |
| `<pre>` | fenced block |
| `<a href>` | `[text](href)` |
| `<ul>`/`<ol>` + `<li>` | `* item` / `1. item`; nested lists indented two spaces; consecutive top-level items separated by a blank line (compendium style) |
| `<h1>`–`<h6>` | a paragraph of `**text**` (never a Markdown heading — the document structure is owned by the section tree) |
| `<blockquote>` | `> ` prefixed lines |
| `<hr>` | `***` |
| `<table>` | GFM pipe table; the first row is the header when it uses `<th>`, otherwise a blank header row is synthesised |
| `<img>` | the `alt` text, or nothing |
| `<section class="secret">` | dropped entirely |
| any other tag | its children rendered inline |

Foundry enrichers inside text: `@UUID[...]{Label}` / `@Compendium[...]{Label}` / `@Actor[...]{Label}` →
`*Label*`; an enricher with no `{Label}` → the last `.`-separated segment of its reference in italics;
`[[/r FORMULA]]`, `[[/roll FORMULA]]`, `[[FORMULA]]` → `FORMULA` verbatim. Text nodes are whitespace-
collapsed and escaped (`\`, `*`, `_`, `` ` ``, `[`, `]`, `#` at line start, `|` inside tables, plus the
`\+` / `\-N` rule).

## Testing

All under `tests/unit/spreadsheet/markdown/` unless noted; plain Vitest, no snapshots (expected strings
are written out).

- `Labels.test.js`, `Slug.test.js` (dedup `-1`, `-2`; stripping; collapse), `MarkdownText.test.js`
  (escaping rules, stat lines, heading forms per level).
- `HtmlToMarkdown.test.js`: every row of the table above, entity decoding, nested lists, secrets dropped,
  enrichers, a compendium-style table.
- `CalculateSpellAspectCosts.test.js` (in `tests/unit/`): initial-value costs, unit costs, option costs
  (including the two-option case that must add each option's cost exactly once), all-options cost,
  resistance halving, scaling cost, difficulty/complexity suggestion at the 5/6 boundary; and
  `SpellDataModel` still produces identical derived values through the shared module.
- One test file per renderer with hand-built `system` fixtures asserting the exact block text, including
  the compendium's own examples: Battle Axe (single attack), Dagger (two attacks), Heavy Armor, Shield,
  Alert (no stat lines), A Cunning Plan (nested list description), Blast (spell with Range/Area/
  Enhancements/Traits), Air Walk (`/ 2` enhancement).
- `CompendiumTree.test.js` + `RenderCompendiumMarkdown.test.js`: root type grouping and order, folder
  headings at each depth with clamping, mixed-type leaf partitioning, unfoldered-spell tradition grouping,
  foldered spells without tradition headings, alphabetical ordering, the table of contents.
- `WorkbookToDocuments.test.js`: a workbook built with `buildTables` + `encodeXlsx` and decoded with
  `decodeXlsx` (wide and relational), a zip of CSVs, embedded rows ignored, Actor pack refused, manifest-
  less workbook accepted by sheet name, folder path unescaping.
- `DecodeSpreadsheetFiles.test.js` (in `tests/unit/spreadsheet/format/`): xlsx, single csv, zip of csv,
  multiple loose csv, unknown extension error; `PlanImport.test.js` keeps passing through the adapter.
- `SpreadsheetToMarkdownCli.test.js`: runs `node scripts/spreadsheet-to-markdown.mjs` with
  `child_process.execFileSync` against a generated `.xlsx` in a temp directory and asserts the written
  file equals `renderCompendiumMarkdown(...)` for the same data; asserts `--title`, default `--out`,
  exit code 1 and message for an Actor pack and for a missing file.

## Documentation updates (required final step)

- `README.md`: a "Publishing a spreadsheet as Markdown" section (command, inputs, folder-driven headings,
  what is and is not rendered).
- `titan-codebase` skill `references/architecture.md`: the `src/spreadsheet/markdown/` layer, the shared
  `CalculateSpellAspectCosts.js`, the `DecodeSpreadsheetFiles.js` extraction, and the two `scripts/`
  entries; `references/conventions.md`: the `~/` alias hook for Node scripts.
- `docs/CLOSED_BUGS.md`: the `SpellDataModel` per-option cost double-counting fix (found while writing
  this design; see the plan).
- `docs/TODO.md` / `docs/OPEN_BUGS.md`: nothing deferred by this design.
