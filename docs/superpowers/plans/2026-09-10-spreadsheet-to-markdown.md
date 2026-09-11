# Spreadsheet → Markdown Export — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-09-10-spreadsheet-to-markdown-design.md` (read it first; it is the
authority for every format decision below).
**Branch:** `campaign/markdown-export` (worktree). Tasks run serially in this order; each ends with a commit.
**Model/effort:** every implementer is `sdd-implementer` (Sonnet, medium); reviewers are `sdd-reviewer`
(Sonnet, high). Opus is banned for this campaign.

Standing rules for every task:

- Project style rules in `.claude/CLAUDE.md` apply (120 cols, braces on every conditional, typed `@type`
  comments on variables, full JSDoc on functions, multi-line objects/arrays, no `console.log` in `src/`).
- TDD: write the failing test first, run it and watch it fail, implement, run it green, run
  `npx vitest run tests/unit/spreadsheet` (and the whole unit suite before the commit of tasks 3 and 9),
  then `npx eslint <changed files>`.
- Pure modules under `src/spreadsheet/markdown/` must not reference `foundry`, `game`, `CONFIG`, `ui`,
  `document`, or `window`.
- Do not defer anything. If something in this plan cannot be done as written, report BLOCKED with the
  reason; never narrow scope silently.

---

## Task 1 — Foundation: alias hook, bootstrap, labels, slugs, text helpers

**Files:** `scripts/lib/registerSrcAlias.mjs`, `scripts/spreadsheet-to-markdown.mjs`,
`scripts/lib/spreadsheetToMarkdownCli.mjs` (placeholder that exports `runCli(argv)` and prints usage only),
`src/spreadsheet/markdown/Labels.js`, `src/spreadsheet/markdown/Slug.js`,
`src/spreadsheet/markdown/MarkdownText.js`, tests `tests/unit/spreadsheet/markdown/Labels.test.js`,
`Slug.test.js`, `MarkdownText.test.js`, `tests/unit/spreadsheet/markdown/RegisterSrcAlias.test.js`.

1. `registerSrcAlias.mjs`: exports nothing; on import it calls `module.register(new URL('./srcAliasHooks.mjs',
   import.meta.url))` where `scripts/lib/srcAliasHooks.mjs` exports a `resolve(specifier, context, next)`
   hook mapping any specifier starting with `~/` to `file://<repoRoot>/src/<rest>` (repo root = two
   levels above `scripts/lib/`). Nothing else is rewritten.
2. `scripts/spreadsheet-to-markdown.mjs`: `import './lib/registerSrcAlias.mjs'; const { runCli } = await
   import('./lib/spreadsheetToMarkdownCli.mjs'); process.exitCode = await runCli(process.argv.slice(2));`
   with a header comment explaining that the dynamic import is the Node loader-registration idiom (the
   hook must be registered before any `~/` import resolves) and that `scripts/` is not a shipping build.
3. `Labels.js`: `createLabels(langJson)` returns `label(key, fallback = key)` reading
   `langJson.LOCAL[`${key}.text`]`; a missing key returns `fallback`. Also export `PLURAL_TYPE_LABELS`
   (`{ weapon: ['weapons','Weapons'], armor: ['armor','Armor'], shield: ['shields','Shields'],
   equipment: ['equipment','Equipment'], commodity: ['commodities','Commodities'],
   ability: ['abilities','Abilities'], spell: ['spells','Spells'] }`) and `TYPE_ORDER`
   (`['weapon','armor','shield','equipment','commodity','ability','spell']`).
4. `Slug.js`: `createSlugger()` returns `slugFor(text)`: lowercase, whitespace → `-`, strip everything not
   `[a-z0-9-]`, collapse `-` runs, trim `-`; on collision append `-1`, `-2`, … (first repeat gets `-1`).
5. `MarkdownText.js`: `escapeText(text)` (backslash-escape `\ * _ \` [ ]`, `+` → `\+`, `-` followed by a
   digit → `\-`, a `#` at the start of the text → `\#`); `statLine(label, value)` →
   `**${label}:** ${value}  `; `heading(level, text, slug)` → the five forms in the spec's heading table
   (`***` for H4/H5, `**` for H3, plain for H1/H2), text passed through `escapeText`.
6. Tests: `RegisterSrcAlias.test.js` spawns `node --import ./scripts/lib/registerSrcAlias.mjs -e
   "import('~/spreadsheet/codec/Workbook.js').then(m => console.log(m.FIXED_COLUMNS.length))"` with
   `execFileSync` from the repo root and asserts `7`. The other three test the rules above exhaustively.
7. Commit: `feat(markdown): add ~/ alias hook, CLI bootstrap, and markdown text helpers`.

## Task 2 — HtmlToMarkdown

**Files:** `src/spreadsheet/markdown/HtmlToMarkdown.js`, `tests/unit/spreadsheet/markdown/HtmlToMarkdown.test.js`.

1. Implement a tokenizer (open tag with attributes, close tag, self-closing, comment, text) → node tree →
   renderer exactly per the spec's HtmlToMarkdown table, enricher rules, entity decoding, whitespace
   collapsing, and text escaping via `escapeText`. Block separation: paragraphs/lists/blockquotes/tables
   separated by one blank line; top-level list items separated by a blank line; nested list items
   directly under their parent with two-space indentation per level (see A Cunning Plan and Caregiver in
   `TITAN Rules Compendium.md` lines 2923–3120 for the target look).
2. Export `htmlToMarkdown(html)` returning the text with no trailing newline. Blank/undefined input → `''`.
3. Tests: one `it` per table row, entity decoding (named + numeric), nested `<ul>` inside `<li>`, ordered
   list numbering, `<section class="secret">` dropped, `@UUID[Item.abc]{Fireball}` → `*Fireball*`,
   `@UUID[Compendium.titan.effects.Item.xyz]` → `*xyz*`, `[[/r 1d6]]` → `1d6`, the compendium's
   miscasting table (lines 4483–4491) reproduced from an HTML table, escaping of `+`/`-3`/`*`.
4. Commit: `feat(markdown): convert ProseMirror HTML descriptions to Markdown`.

## Task 3 — Extract spell aspect cost math into a pure shared module (fixes a double-count bug)

**Files:** `src/document/types/item/types/spell/CalculateSpellAspectCosts.js`,
`src/document/types/item/types/spell/SpellDataModel.js`, `tests/unit/CalculateSpellAspectCosts.test.js`,
`docs/CLOSED_BUGS.md`.

1. Read `SpellDataModel.prepareDerivedData` (lines 32–132). Note the defect: for aspects whose settings use
   `optionCosts` (`inflictCondition`), the loop `for (const option of aspect.option) {
   aspect.option.forEach(...) }` adds every option's cost `option.length` times (two options → each cost
   added twice). The correct behaviour adds each selected option's cost once.
2. Write the failing test first: `calculateSpellAspectCosts([{ label: 'inflictCondition', option:
   ['blinded','deafened'], resistanceCheck: 'none' }], [])` must report an aspect cost of `5` (4 + 1) and
   total `5`. Also cover: initial-value costs (`range` self/touch/10/30/50), unit costs (`duration`
   rounds/minutes), `optionCost` × option count, `allOptions` + `allOptionsCost`, resistance halving
   (`max(floor(cost/2), 1)`), `scalingCost` reported, requireOption-with-no-options → disabled with cost 0,
   custom aspect costs summed, difficulty/complexity: total 4 → 4:1, 5 → 5:1, 6 → 5:2, 8 → 5:4, and
   total 2 → 4:1 (minimum difficulty 4).
3. Implement `calculateSpellAspectCosts(aspects, customAspects)` returning
   `{ aspectCosts: number[], enabled: boolean[], scalingCosts: (number|undefined)[], totalAspectCost,
   difficulty, complexity }` (arrays index-aligned with `aspects`). Pure: imports only `SpellAspects.js`.
4. Rewire `prepareDerivedData` to call it and write back `aspect.enabled`, `aspect.cost`,
   `aspect.scalingLost` (keep that existing property name — it is read elsewhere; grep before renaming
   anything), `this.totalAspectCost`, and the auto-calculated DC. Behaviour must be identical except for
   the fixed double count. Run the whole unit suite.
5. Append to `docs/CLOSED_BUGS.md` (next number) an entry: what (per-option cost double-counted for
   `optionCosts` aspects with 2+ options), severity, found 2026-09-10 while designing the Markdown export,
   fixed by the extraction + regression test.
6. Commit: `fix(spell): count each inflict-condition option cost once; share aspect cost math`.

## Task 4 — DecodeSpreadsheetFiles extraction and WorkbookToDocuments

**Files:** `src/spreadsheet/format/DecodeSpreadsheetFiles.js`, `src/spreadsheet/io/PlanImport.js`,
`src/spreadsheet/markdown/WorkbookToDocuments.js`, tests `tests/unit/spreadsheet/format/DecodeSpreadsheetFiles.test.js`,
`tests/unit/spreadsheet/markdown/WorkbookToDocuments.test.js`.

1. Extract `PlanImport.js`'s `decodeFiles`/`sheetNameFromFilename` logic into pure
   `decodeSpreadsheetFiles(entries)` where `entries` is `Array<{ name: string, bytes: Uint8Array }>`:
   one `.xlsx` → `decodeXlsx`; one `.zip` → each `.csv` inside via `decodeCsv` (sheet name = filename
   without `.csv`, non-csv entries ignored); otherwise every entry must be `.csv` (decoded as text via
   `fflate`'s `strFromU8`), and any other extension throws `Error('Unsupported spreadsheet file: <name>')`.
   `PlanImport.js` keeps its `decodeFiles(files)` name but only converts browser `File`s to
   `{ name, bytes }` and delegates. `PlanImport.test.js` must still pass unchanged.
2. `WorkbookToDocuments.js`: `workbookToDocuments(workbook)` → `RenderableDocument[]` per the spec
   (`readTables(workbook, {})`; Item types only; embedded rows dropped; Actor/ActiveEffect `packType`
   throws `Error('Only Item compendium exports can be rendered as Markdown (this file is an <packType>
   export)')`; a manifest-less workbook accepts sheets named after Item types and throws on any other
   sheet name). Folder path: split `folderPath` on unescaped `/`, unescape `\/` → `/` (read
   `src/spreadsheet/io/FolderPath.js` and `ApplyImport.js`'s `splitFolderPath`; reuse `splitFolderPath`
   by moving it to `FolderPath.js` if it is not already exported from there — keep ApplyImport importing
   it).
3. Tests: build workbooks with `buildTables` (wide and relational) from hand-made envelopes for a weapon,
   an armor, a spell inside folder `Magic/Fire`, an effect embedded on the weapon; encode with
   `encodeXlsx` and decode with `decodeXlsx`; assert three documents, the folder segments, the embedded
   effect ignored, values typed. A zip-of-CSV variant. Actor pack refused. Manifest-less workbook with a
   `weapon` sheet accepted; with a `goblin` sheet refused.
4. Commit: `feat(markdown): decode spreadsheet files and extract renderable item documents`.

## Task 5 — Item block renderer and the gear renderers

**Files:** `src/spreadsheet/markdown/renderers/RenderItemBlock.js`, `RenderTraits.js`, `RenderItemChecks.js`,
`RenderWeapon.js`, `RenderArmor.js`, `RenderShield.js`, `RenderEquipment.js`, `RenderCommodity.js`, and one
test file per module under `tests/unit/spreadsheet/markdown/renderers/`.

1. `RenderItemBlock.js`: `renderItemBlock({ headingText, slug, statLines, descriptionHtml,
   extraDescriptionHtml, attackSections })` assembling the block per the spec's "Item block format" and
   the multi-attack rule (`attackSections: Array<{ headingText, slug, statLines }>`; when present the
   item's own stat lines are not followed by `---`). Returns the block without a trailing blank line.
2. `RenderTraits.js`: `renderTraitList(standardTraits, customTraits, labels)` → `'Slashing, Blast 1, My
   Trait'` (`value === true` → label; numeric → `Label N`; `false`/0 traits skipped; custom → `name`).
3. `RenderItemChecks.js`: `renderItemCheckLines(checks, labels)` per the spec's checks rule.
4. Each type renderer exports `render<Type>(document, context)` where `context = { labels, slugFor }`,
   returning the block string. Common lines via a shared `commonStatLines(system, labels)` helper in
   `RenderItemBlock.js` (Rarity when not common, Value when > 0).
5. Tests assert exact expected strings. Include the compendium examples verbatim from
   `TITAN Rules Compendium.md`: Battle Axe (lines 2295–2304; its description HTML is
   `<p>These axes are designed …</p>`), Dagger (2317–2334, two attacks), Heavy Armor (2648–2657),
   Shield (2681–2688), Weighted Gauntlet (no Damage line? — no: damage 1 renders `**Damage:** 1 \+ ES`;
   the compendium omits it, so assert the data-driven output, not the compendium text, for that one).
   Note that the compendium lists `Requirements:` lines; there is no such field in the data model, so
   they are never rendered — assert their absence.
6. Commit: `feat(markdown): render weapons, armor, shields, equipment, and commodities`.

## Task 6 — Ability and spell renderers

**Files:** `src/spreadsheet/markdown/renderers/RenderAbility.js`, `RenderSpell.js`, tests.

1. `RenderAbility.js` per the spec (Rarity, XP Cost, Type flags, custom traits, checks).
2. `RenderSpell.js` per the spec: DC line from `calculateSpellAspectCosts` when `autoCalculateDC`, else
   stored; enabled aspects only (use the `enabled` array from the calculator, which applies the
   requireOption rule); Range/Area/Enhancements/other-aspect lines; Traits with tradition first.
   `SpellAspects` sortOrder orders standard aspects.
3. Tests: Alert (compendium 2953–2964: zero stat lines when rarity common and xpCost… NOTE the spec always
   renders `**XP Cost:**`, so the expected block has that one line; assert the data-driven text),
   A Cunning Plan (nested list), Blast (4513–4527), Air Walk (`Fly Speed (5 \+ ES / 2)` — model this as a
   custom aspect `{ label: 'Fly Speed', scaling: true, initialValue: 5, cost: 2 }`), an inflictCondition
   spell (`**Inflict Conditions:** Stunned, resisted by Resilience`), a spell with `autoCalculateDC:
   false` using stored 6:1.
4. Commit: `feat(markdown): render abilities and spells`.

## Task 7 — Section tree, table of contents, full document rendering

**Files:** `src/spreadsheet/markdown/CompendiumTree.js`, `src/spreadsheet/markdown/RenderCompendiumMarkdown.js`,
tests `CompendiumTree.test.js`, `RenderCompendiumMarkdown.test.js`.

1. `buildCompendiumTree(documents, labels)` → `{ sections: Section[] }` where
   `Section = { level, text, documents: RenderableDocument[], children: Section[] }` built per the spec's
   five tree rules (root type groups first in `TYPE_ORDER`, then root folders alphabetical; folder
   heading level `min(depth, 3)`; mixed-type leaves partitioned by type one level down (clamped at 3);
   unfoldered spells partitioned by tradition at H3 with blank-tradition documents first and headingless).
2. `renderCompendiumMarkdown(documents, { title, labels })`: walks the tree, dispatches each document to
   its renderer (a `RENDERERS` map by type), assigns slugs in document order with one `createSlugger()`
   per render (headings first: the walk must assign heading slugs and item/attack slugs in the same
   order they appear), builds the TOC per spec rule 5, and returns the whole file text ending with a
   single `\n`.
3. Tests: tree shape for (a) three unfoldered types, (b) folders `Equipment/Weapons/Melee Weapons` with
   a weapon, (c) a mixed leaf (`Urderic Equipment` holding an armor and a weapon → H1 folder, H2 type
   groups), (d) unfoldered spells across two traditions plus one blank, (e) foldered spells with no
   tradition headings, (f) depth-4 folder clamped to H3. Full render test: exact expected text for a
   small pack (title, Contents links for every heading including items and attacks, sections, blocks,
   blank-line separation).
4. Commit: `feat(markdown): build folder/type sections and render the full reference document`.

## Task 8 — CLI

**Files:** `scripts/lib/spreadsheetToMarkdownCli.mjs`, `package.json` (`export:markdown` script),
`tests/unit/spreadsheet/markdown/SpreadsheetToMarkdownCli.test.js`.

1. `runCli(argv)`: parse `--out/-o`, `--title`, `--lang`, `--help/-h`, positionals (paths). Resolve
   inputs: a directory → every `.csv`/`.xlsx`/`.zip` inside (sorted); a file → itself. Read bytes with
   `node:fs`. Group: each `.xlsx`/`.zip` is its own `decodeSpreadsheetFiles([entry])` call; all loose
   `.csv` files together form one call. Concatenate `workbookToDocuments` results. Load the lang JSON.
   Render with `renderCompendiumMarkdown`. Write the output file (UTF-8). Print `Wrote <out> (<n>
   documents)` to stdout. Any error → `console.error(message)` and return 1 without writing.
2. Usage text printed for `--help` or no inputs (exit 0 for `--help`, 1 for no inputs).
3. Test with `execFileSync('node', ['scripts/spreadsheet-to-markdown.mjs', ...])` from the repo root
   against an `.xlsx` generated in a `fs.mkdtempSync` directory (built with `buildTables` + `encodeXlsx`):
   default `--out`, `--title`, output equality with `renderCompendiumMarkdown`, exit 1 + stderr message
   for an Actor-pack workbook and for a missing path. Temp files are cleaned with `fs.rmSync` on the
   temp directory only (a `mkdtemp` directory the test itself created).
4. Commit: `feat(markdown): add the spreadsheet-to-markdown CLI and npm script`.

## Task 9 — Documentation and final verification

**Files:** `README.md`, `.claude/skills/titan-codebase/references/architecture.md`,
`.claude/skills/titan-codebase/references/conventions.md`.

1. README section per the spec's Documentation list. Skill updates per the spec.
2. Run `npx eslint .`, `npx vitest run` (whole suite), and `npm run build` (the production bundle must
   still be a single chunk and must not grow by the markdown modules — `grep -c "HtmlToMarkdown"
   dist/index.js` must print 0).
3. Commit: `docs(markdown): document the spreadsheet-to-markdown export`.
