# Test Suite on Real Foundry Data — Implementation Plan (revision 4)

> **For agentic workers:** Dispatch per `~/.claude/docs/sdd-model-effort-tiers.md` (`sdd-*` subagents). Implementers run serially (shared tree, dist, live Foundry). Every agent dispatched in this campaign receives this paragraph verbatim:
>
> "Invoke the core skill immediately. The iron rule is no deferrals of existing work, or new work as it comes up - we fix this now unless I give my EXPRESS authorization. The only exception is if a bug or to-do has a genuine blocker that is already logged in a milestone in PLAN.md that has not been started yet. Another iron clad is rule is that when faced with a design fork, determine the best long term shape in keeping with our plans and goals, and implement accordingly. You only need to ask me if the question "what is the best long term shape in keeping with our plans and goals?" is not able to answer the question. Churn is not a concern. This paragraph must be copied verbatim to any agents dispatched in this campaign."

**Goal.** Every TITAN test that touches a Foundry document runs against a document a real Foundry user flow produced in the live `test-titan` world; the suite keeps a running list of what it made and deletes all of it when it is done. Synthetic data remains only for UI-element tests, document-agnostic operations, intermediate computation on given inputs, and tests that invalid data is rejected or handled. All migration tests are deleted (none is active); one one-off check confirms the migration system works and is then reverted. The suite is cleaned up, merged where one world boot can carry what several did, updated to the current code, and extended where `src/` behaviour has no test.

**Binding rules (verbatim).**

`.claude/claude.md` "Project Scope (non-negotiable)" (read at commit `6bf6bfdc`):

> * **No migrations yet.** Only the user's existing world exists, and no other world runs this system yet. Data changes are made by fixing that existing world directly, with a backup first and the user's knowledge. The migration system (`MigrateWorld`, version chains, the stored-actor walker, `migrateData` hooks) stays in the code for future public releases. While no migration is active there are no migration tests, generic or specific, and no code is added only to make migrations testable. A one-off test may confirm the system works, and is then reverted. Do not build or extend specific migrations, or run them live, unless the user asks for it.
> * **Tests use genuine live documents.** Any test of a change to a document runs on documents made through real Foundry user flows. Tests may share documents; the suite keeps a running list and deletes every test document when it is done. Cleanup may use the API `delete`. Records from the user's world are never checked in as test data. Synthetic data is allowed only for UI elements, document-agnostic operations such as localization, intermediate computations on given inputs, and tests that invalid data is rejected or handled (real flows cannot produce invalid data). Values the system derives, such as a check's Dice Mod or Advantage from rules elements, are set up through the real flows that produce them. World settings may be set through the API. Mid-test document edits go through sheet and HUD controls, with a direct update only for a field that has no control.
> * **Never make unverified claims.** Docs, comments and reports state only what was measured (with the command or log) or read (with the source location). Anything inferred is labelled as such.

User rulings relayed 2026-10-01 (verbatim where quoted): (1) "Tests may share documents. The suite just has to delete all the test documents when it is done. It may keep a running list." (2) Real records from the user's world are never checked into the repo as test data. (3) "The goal is to clean up junk, optimize, update, and combine tests where it would be a good idea, and plug gaps. It has been a long time since the suite was first added and the code has changed a lot. So we can use what still is good, but do not shy away from churn." (4) "I want the fable agent to hand review every test before it makes any conclusions." (5) Legacy client-setting Boolean normalisation tests: delete; leave the code alone. (6) No API-created chat messages anywhere. (7) OPEN_BUGS #110 is deferred to a future document-inheritance campaign; it stays open and nothing here depends on it. (8) "since we don't have any active migrations, we don't need unit tests for them right now. Do a one off test to make sure the system is working, then revert it and continue with the rest of the test refactor." (9) LIMITED-permission sheet: "Leave as is." — pin the current behaviour. (10, U-a) Hand-editing exported JSON and re-importing it through Import Data is a workaround; do not use it ("If there is no way to store an odd value in actual user data then why have the test?"). (11, U-b) "When you are testing to see if data will be rejected as invalid, then it is okay to use synthetic data, since manufactured data would not be invalid." (12, U-c) "Dice mod CAN be passed. Dice mod is calculated from rules elements. When the dialog is opened with a dice mod from rules elements that gets passed along as a starting value. The same with advantage." (13, U-d) OPEN_BUGS #111 (a condition's edited description is ignored) is logged and deferred with #110; the kept test pins today's behaviour.

**Evidence labels.** **measured** (a command was run; named), **read** (a file location is named), **inferred** (reasoning named; alternatives not excluded are stated). Test counts are given as **sites** (`test(` calls) unless marked **runtime** (loops expanded).

---

## 0. Measured baseline

| Fact | Value | Evidence |
|---|---|---|
| Unit suite | 140 files, 1662 tests, 0 failed, 22.65 s wall | measured: `npx vitest run --reporter=json` → `.superpowers/sdd/test-suite-rewrite/vitest-run.json`, `unit-file-stats.txt` |
| E2E spec files | 98 (`tests/e2e/*.spec.js` 95 + `tests/e2e/logic/*.spec.js` 3) | measured: `find tests/e2e -name "*.spec.js" \| wc -l` |
| E2E test sites | 605 (`test(`/`test.only(`, plus `test.skip(` only with a string title; `gpu-rendering.spec.js:28` is a runtime `test.skip(condition, reason)`, not a site); loops expand to 654 at runtime | measured: `source-test-map.mjs` → "605 test sites mapped" |
| Last full e2e run with every current spec | 654 passed (runtime), 7.0 m wall; summed per-test time 221.7 s | read: `.superpowers/sdd/2026-09-29-conditions-rework/t5f3-final-e2e.log`; measured: `spec-durations.mjs` over that log → "221.7s over 654 tests in 98 specs". The earlier `t5f2-final-e2e.log` ran 653: it predates `a5b9be82` (the #105 fix), which added `condition-migration.spec.js:711` (deleted in P1, `source-test-map.tsv`). `spec-durations-654.txt` holds that earlier run despite its name ("218.8s over 653 tests") |
| Playwright | `@playwright/test ^1.60.0`; `timeout: 60_000`, `workers: 1`, `fullyParallel: false`, `globalSetup` only (`globalTeardown` exists in `node_modules/playwright/types/test.d.ts`) | read: `playwright.config.mjs:13-23`, `package.json:17` |
| Specs that create documents through the API | 82 of 98 | measured per spec in the hand review |
| Hand review | 140 unit records, 98 e2e spec entries in 9 batch records, 2 helper records; every test read in full | measured: `comm` of `find` output against the record set → 0 unrecorded (§2) |
| Record line numbers | 390 quoted-title citations across the 9 batch records all point at test sites | measured: `node .superpowers/sdd/test-suite-rewrite/record-line-check.mjs` → "checked 390 cited line numbers; 0 mismatches" |
| Orphaned tokens in `test-titan` today | 4 (one unlinked `HUD Vis NPC`, three linked), left by `player-hud-visibility.spec.js` | read: `docs/OPEN_BUGS.md` #106 |
| Dangling hotbar entries on the E2E users | not yet measured; Phase 0 measures and cleans (§4.1) | — |
| Migration unit tests | 9 files, 154 tests: `StoredActorSources` 48, `SyncConditionEffects` 33, `ConvertEffectItemsToActiveEffects` 28, `MigrateStoredActors` 20, `MigrateWorld` 8, `OnceReady` 5, `MigrationAction` 5, `CheckChatMessageDataModel` 4, `ReportChatMessageDataModel` 3 | measured: grep over `tests/unit` × `unit-file-stats.txt` |

---

## 1. What the hand review found, in one paragraph

Measured by reading every test (records in §2): the e2e suite boots the world 98 times for ~653 runtime tests, of which ~243 are UI-element probes or harness guards that are already compliant (two more after A1, §3.1.b), ~15 are vestigial (duplicates, tests of deleted helpers, tests of Foundry core), ~28 are tests of migration shapes or legacy data (including the 8-case `effect-creation-source` and two legacy client-setting Boolean tests) and are deleted, 5 are invalid-data cases that become probe tests on synthetic input (ruling 11), and ~360 are necessary tests whose subjects come from the document API and must move onto flow-created documents — in ~115 of them only the source is synthetic, in ~245 a mid-test edit is also made by API where a sheet, HUD, token-HUD, tracker or tray control exists. 46 of the 82 seeding specs share one of ~20 subjects, which is why one shared, flow-created, id-keyed fixture set serves most of the suite. The unit suite is 129 compliant files (1491 tests, of which 8 legacy-setting normalisation tests are deleted by ruling 5), 9 migration-test files deleted whole (154 tests, ruling 8), 1 file whose coverage moves to a live gate (`ApplyImport`, 14 tests), and 1 vestigial file (`builders`, 3 tests).

By e2e **site** (measured, `source-test-map.tsv`): of 605 sites, 566 move to a target spec (5 of them as synthetic probe tests), 11 stay unchanged (`dice`, `gpu-rendering`, `fast-check-smoke`, `integration-manifest`), 16 are deleted as migration or legacy shape, 10 as vestigial, 1 by ruling 5, and 1 moves to the unit suite.

---

## 2. Hand-review records and derivation scripts (the evidence this plan cites)

Directory: `.superpowers/sdd/test-suite-rewrite/` (local evidence; gitignored; not shipped).

- `hand-review/README.md` — classification definitions and record format.
- `hand-review/unit/<File>.md` — one per unit file (140; `/`→`-` in names; `Report`→`Rpt` because the tooling blocks filenames containing "Report"). Each ends with `## File: <class> — <n> tests. <disposition>`; the five generic-migration records carry a `## Ruling 2026-10-01` line that supersedes it.
- `hand-review/e2e/README.md` — the rewrite sub-labels: **R-source** (API-made document; interaction already real), **R-edit** (API mid-test edit where a control exists), **R-both**.
- `hand-review/e2e/batch-01-small-specs.md` … `batch-09-specs.md` — one entry per spec, one bullet per test with line number, assertion, data source, class, reason, merge target, gaps. Entries re-classified in revision 4 carry a "Rev-4 class" sentence (html-sanitization 74/93, effect-creation-source, rules-element-check-modifier-editor 154/223, rules-element-rounding-editor 172, check-dialog-advantage 697, portrait-persistence).
- `hand-review/helpers/e2e-helpers.md`, `helpers/setup-shared-components.md` — every non-spec module under `tests/`.
- **`record-line-check.mjs`** — every `'title' (n)` citation in a record must be a test site of that spec. Measured: 390 checked, 0 mismatches.
- **`source-test-map.mjs`** → `source-test-map.tsv` — the machine form of §3.1: for each of the 605 sites its target spec (or deletion class) and the phase in which the test is written; prints the per-phase source-spec deletion list and the per-phase helper deletion list derived from importers. Measured: "605 test sites mapped; 0 problems". Any site not in the map, or a mapped line that is not a site, fails it.
- **`closed-bugs-gates.sh`** → `closed-bugs-gates.txt` — every CLOSED_BUGS entry with the spec/test files its text cites (§8).

Completeness: measured — 140/140 unit records; 98/98 spec entries.

---

## 3. Classification

### 3.1 E2E — by target spec (what the suite becomes)

Each row is one file in the rewritten suite. "Sources" are today's files and the tests taken from them (site line numbers, verified by `record-line-check.mjs`); "Phase" is where the target is written (a test written earlier into an existing file says so). The authoritative per-line map is `source-test-map.tsv`. A source spec is deleted in the phase its last test lands (derived list in §12).

| Target spec (one boot each) | Phase | Sources → tests | Record |
|---|---|---|---|
| `surfaces.spec.js` — every sheet type and dialog renders, no page error, no `LOCAL.` text; the first consumer of the shared fixtures; the portrait describe | 2 | render-smoke (39, 46, 54 ×7 runtime, 62); localization (all 13); editor-description (33); effect-sheet-layout (67, 103); portrait-persistence (72, 84 — the pick goes through Foundry's own FilePicker, flow F1; no `browse` stub); sheet-regressions (46 rarity-once, 155 attacks tab); spell-rules-regressions (130 render, 190) + new: Edit UUID dialog function | 01, 02, 05, 07 |
| `sheet-header.spec.js` | 2 | header-controls (77, 88); header-buttons (58, 67 toggle-link via the button, 87 and 102 send-to-chat clicks); sheet-regressions (178 unlink from a sheet opened by double-clicking the token) + new: #104 pin (an edit on the unlinked token's sheet leaves the open base sheet unchanged) | 02, 03, 05 |
| `character-sheet-rows.spec.js` — per-type row sweep, row reactivity, effect rows, confirm dialogs | 3 | embedded-context-items (all 8 — its `TYPE_CASES` table is the skeleton); reactive-ability, -spell, -weapon (2), -armor-shield (2), -inventory-basic (4), -effect-rows (3), -expanded-toggle (4); effect-reactivity (72); armor-heavy-trait (25 — equip via row toggle); embedded-context-effects (221, 269); embedded-context-check-parity (343, 378); attack-tags (200); spell-rules-regressions (145 delete equipped armor); sheet-regressions (75 add owned item via A2, #10); interaction-dialogs (191 immediate delete) + new: effect confirm **cancel**, and confirmation-off deletes with no dialog (#103 gate) | 01, 02, 03, 04, 05, 06, 07 |
| `custom-traits.spec.js` | 3 | trait-add-custom (79); traits (all 5); effect-traits (78, 110); html-sanitization (126 live tooltip — stays live: a trait description edited through the Edit dialog is a real flow) | 02, 04 |
| `sheet-filters.spec.js` | 3 | spells-filter (65); checks-tab-filter (57); character-sheet-layout (132 skills filter) + new: abilities, inventory, effects filters | 01, 02, 03 |
| `rules-element-editor.spec.js` | 3 | rules-element-crud (69, 132); rules-element-rounding-editor (134 ×2 runtime); rules-element-check-modifier-editor (103, 126, 140, 208, 264, 316). Their invalid-data siblings (154, 223, 172) become probe tests in `component-probe-inputs`, written in Phase 3 (ruling 11; §3.1.c) | 03, 04, 07 |
| `item-sheet-rolls.spec.js` | 3 | item-sheet-roll (all 4); item-check-damage-reduction (143, 171); sheet-regressions (218 add check while open) | 04, 05 |
| `spell-sheet.spec.js` | 3 | spell-rules-regressions (376, 416, 448 — custom-aspect count sized by measured overflow); spell-aspect-conditions (117 ×2 runtime) | 02, 07 |
| `character-sheet-layout.spec.js` | 3 | character-sheet-layout (104, 147, 168); sheet-zoom (all 4; a "bulk" shared actor built once) | 03, 06 |
| `drag.spec.js` — real pointer drags | 3 | character-sheet-reorder (126, 132); settings-list-reorder (all 5); cross-sheet-element-copy (all 4) + new: type-gating refusal; sheet-regressions (96 world item onto a sheet via `dragTo`) + new: Item **folder** onto a sheet (#107 fix, §7.1) | 02, 03, 04, 05 |
| `check-math.spec.js` — forced dice + oracle | 4 | checks-integration (all 8); checks-opposed (all 6, real targeting); interaction-rolls (164 ×5 runtime, folded into the five oracle rolls); check-advantage (136, 160, 189, 225 — Advantage / Automatic Failure set in the dialog's own controls under `getCheckOptions = 'always'`) + new: damage card **Apply/Resist** buttons incl. Penetrating (read: `HudAmountDialogShell.svelte` has no penetrating control; the real path is an attack with the Penetrating trait → `ChatMessageDamageButtons.svelte:21-57`); report-cards (114 Penetrating math through that card) | 05, 06, 07, 08 |
| `check-dialog.spec.js` — two shared actors (plain, situational) | 4 | checks-dialog (all 7); check-dialog-advantage (all 21 sites; §4.2 says which use the active toggle, which keep a live create/delete, and how 697 derives its Dice Mod and Advantage from rules elements — ruling 12); check-options-setting (43); condition-checks (151); armor-trait-situations (120, 143, 164, 182, 221) | 03, 05, 06, 09 |
| `logic/rules-elements.spec.js` — elements entered in the editor, derived values on the sheet | 4 | logic/rules-elements (all 10 example tests); conditional-damage-healing-mods (27); resistance-check-modifiers (98, 141); spell-rules-regressions (108, 207); check-advantage (394, 410, 430) | 03, 07, 08 |
| `logic/conditions.spec.js` — conditions via the token HUD | 4 | logic/conditions (all 11); stat-breakdown-conditions (53); condition-checks (87, 103 ×2, 124 ×2 runtime); condition-description (104 positive half, extended per ruling 13: open the condition's sheet from the HUD's `player-hud-effect-sheet` button — core `ActiveEffectConfig`, since TITAN registers its sheet for the `effect` subtype only, read `OnceInit.js:247-251` — edit `description` on the Details tab (read `templates/sheets/active-effect/details.hbs:3`), submit, and assert the HUD still shows the definition text, `EffectsDetailBody.svelte:28-32`; this pins today's behaviour, OPEN_BUGS #111) | 01, 03, 05, 06 |
| `player-hud.spec.js` — one controlled token | 5 | player-hud-portrait (all 9); -visibility (all 9); -layout (all 11; the reload test last); -sidebar-anchor (7); -effects-panel (all 10) + new: Remove cancel (Remove calls `requestEffectDeletion`, read `EffectsDetailBody.svelte:100`); embedded-context-effects (317); embedded-context-check-parity (445) | 01, 05, 06, 07 |
| `player-hud-action-menu.spec.js` | 5 | player-hud-action-menu (all 17); player-hud-action-menu-layout (all 8); report-cards direct-method reports (148, 226, 251, 275, 312, 349, 372, 395) from the utility menu (read `BuildActionMenuModel.js:455-510`) | 07, 08 |
| `combat-turns.spec.js` — one session: E2E GM 1 + E2E GM 2 + E2E Player 1 | 5 | socket-sync (A1–A5); permissions-auto-open (8, 42) + new: player-side auto-open setting; condition-description (138, 219); report-cards (432, 474, 523, 562, 611, 741); combat-seed's `getCharacterCombatants` assertion folded into the encounter setup; #108 gate (no `getCombatantByActor` deprecation warning on the console during the spec) | 01, 02, 05, 06, 08 |
| `chat-cards.spec.js` | 5 | item-cards (all 9); effect-chat-card (115, 172 — the core message is typed in the chat input, C1); item-card-check-dialog (71); attack-tags (171, 224, 278); spell-rules-regressions (473); chat-message-mounts (88, 166); check-advantage (473, 540, 573, 605 positive halves); armor-trait-situations (242 positive half); effect-checks (120) | 03, 04, 05, 06, 07, 08 |
| `macros.spec.js` | 5 | macros (all 4) via M1; every macro's hotbar slot is recorded and cleared in teardown (§4.1) | 04 |
| `ownership.spec.js` — one two-client session | 5 | permissions-ownership (75, 94 with TITAN-side assertions; 113 LIMITED pins what the TITAN sheet shows a LIMITED viewer — ruling 9); permissions-observer-navigation (62); item-sheet-roll-gating (25) | 02, 03, 04 |
| `theme.spec.js` | 5 | theme (all 4); theme-editor-header (7, 48); content-link-theme (62 ×4 runtime) + new: import through the editor's hidden file input (read `ThemeEditorShell.svelte:40-41,174,183`; `setInputFiles` with a file the same editor exported — the editor's own export/import round trip, not Foundry's Import Data) | 01, 04 |
| `effect-tray.spec.js` (rewritten in place) | 6 | all 28 tests; the pack via P1, folders/effects via the tray's own controls, Apply targets via T1, stash via real `dragTo` from the sheet row, create/delete round-trip through the row's Delete + confirm; the 17-effect hand count derived from the `titan.effects` index | 09 |
| `compendium-spreadsheet.spec.js` (rewritten in place) | 6 | all 6 + the 14 live import outcomes of §5.1 | 08 |
| `multi-client.spec.js` | 6 | multi-client (5); permissions-compendium (25) | 01 |
| `component-probe-inputs.spec.js`, `component-probe-buttons-tags.spec.js`, `component-probe-display.spec.js` | 6 (probes for 154/223/172 written into `-inputs` in Phase 3) | the 8 probe files (214 sites) merged into 3: inputs + selects → `-inputs` (selects become a table over `{component, constant, allowNone}` against the `src/` constants) plus the three invalid-data probes of §3.1.c; buttons + tags + html-sanitization 197 and **93** (`EffectTag` probe with `{ label, img, description: PAYLOAD }`) → `-buttons-tags` (`SpellAspectTags` fixture from `selectDisplayedSpellAspects`); component-probe + labels + context + display + html-sanitization **74** (`RichText` probe, `value: PAYLOAD`) → `-display`. Both components are already in the probe registry (read `src/test-probe/componentRegistry.js:61,77`) | 04, 06, 07, 08, 09 |
| `dice.spec.js`, `gpu-rendering.spec.js`, `logic/fast-check-smoke.spec.js`, `integration-manifest.spec.js` | — | unchanged (integration-manifest derives its setting keys from the registration list — an edit, not a move) | 01, 05 |

3.1.b **Deleted** — each with its basis (`source-test-map.tsv` carries the line):

- **Vestigial** (no behaviour of `src/` under test, or a duplicate): combat-seed 29 (01 — asserts the seed helper); permissions-ownership 140 NONE (03 — core permission arithmetic); effect-checks 107 (03); embedded-context-check-parity 409 (07); interaction-dialogs 148, 160, 173, 208, 220, 232 (05 — subsumed by the specs that drive the same dialogs; the Edit UUID function becomes a `surfaces` test); check-advantage stored-parameter mutation halves inside 473/540/573/605 (08 — a re-render after `chatMessage.update({ system })` at `:465`; no control, including Import/Export, changes a check message after the roll: chat messages have Popout/Reveal/Conceal/Delete only, read `client/applications/sidebar/tabs/chat.mjs:333-381`; re-render after a real message update is asserted by chat-message-mounts 166).
- **Migration shape (Project Scope, ruling 8)**: condition-migration (3 sites, 08), pack-conversion (1, 05), converted-effect-identity (8, 09), effect-creation-source (1 site / 8 runtime cases, 06 — `TitanActiveEffect.buildCreationSource`'s only `src/` caller is the walker's Adventure writer, measured `grep -rn buildCreationSource src` → `StoredActorSources.js:511`; the two other hits are comments) — all whole files, Phase 1; report-cards 184 legacy snapshot (08); check-advantage 309 legacy message (08); condition-description 177 legacy report and the stale-description half of 104 (05); armor-trait-situations 242 label-less legacy half (06).
- **Ruling 5**: check-options-setting 129 ×2 runtime (03).
- **Moved to the unit suite**: logic/rules-elements 212 fast-check property (07).

3.1.c **Invalid-data cases → probe tests on synthetic input (ruling 11)**, written in Phase 3 into `component-probe-inputs.spec.js`; the three editor components named in §3.3 (`ItemSheetConditionalCheckModifierSettings`, `ItemSheetMulBaseSettings`, `ItemSheetMulSumSettings`) are added to the test-probe registry (`src/test-probe/componentRegistry.js`, which is built only into `test/build/probe.iife.js` — not shipping code, so no `src` export is added for them):

- rules-element-check-modifier-editor 154 (07): mount `ItemSheetConditionalCheckModifierSettings` (reads `getContext('document')` and `idx`, read `:27-30`) with a synthetic document context whose element holds `modifierType: 'advantage'` and `value` 0 / -3 / 3; assert the level select shows the clamped level (`clampAdvantage`, read `ApplyAdvantage.js:51-53`) and the synthetic element keeps its value.
- rules-element-check-modifier-editor 223 ×2 runtime (07): the same mount with `checkType` `'unknownCheck'` / `'toString'`; assert the modifier-type and selector option lists (the `Object.hasOwn` guards at `:65,77`).
- rules-element-rounding-editor 172 ×2 runtime (04): mount `ItemSheetMulBaseSettings` / `ItemSheetMulSumSettings` with an element lacking `rounding`; assert the select shows `down` and the element's `rounding` becomes `down`. (No flow produces a missing `rounding`: `RulesElementFactories` always sets it, read in `unit/RulesElementFactories.md`.)

Hand-editing exported JSON and re-importing it is not used anywhere (ruling 10).

Deliberate addition (Phase 3 Part B; the plan above did not name it): the probe bundle (`src/test-probe/`, built only into `test/build/probe.iife.js`) also holds `ProbeDocument` (`ProbeDocument.svelte.js`, a reactive stand-in for `ReactiveDocument` with an `update` that merges changes and re-renders readers), a document-marker resolution in `registerProbe.js` that turns a marker in the mount context into a `ProbeDocument`, and, in `tests/e2e/componentProbe.js`, `syntheticDocumentContext` and `readProbeContext`. The reason is in `.superpowers/sdd/test-suite-rewrite/phase-3/probe-inputs-1.log`: with the plain context object the modifier-type select mounted disabled and could not be opened (lines 53 and 91: `<button disabled ... data-testid="ccm-modifier-type">`), and the rounding probes failed their `data-value` read at `component-probe-inputs.spec.js:601` (lines 142 and 171) because a non-reactive context never re-renders after the component writes `rounding`. An owned, reactive context with an `update` is what the editors need. No shipping code is touched.

### 3.2 Unit (140 files; counts are vitest's, `unit-file-stats.txt`)

| Class | Files / tests | Disposition |
|---|---|---|
| **compliant** | 129 files, 1491 tests (1483 kept) | Keep, except the 8 legacy Boolean normalisation tests in `ShouldGetCheckOptions` (ruling 5): `it.each` at 111 and 120 (4) and the `true`/`'true'`/`false`/`'false'` rows of the `resolveCheckOptionsMode` table at 132 (4); the code stays. Seven carry an **optimizable** note applied in Phase 7: `BuildSchemaFromShape`, `CharacterCheckModifiers`, `ChatMessageMountRegistry`, `EffectPackSource` (derive vocabularies from `CONDITIONAL_CHECK_MODIFIER_TYPES` and the rules-element constants), `ItemChatMessageDataModel`, `spreadsheet/codec/BuildTables` (derive envelopes from the real shapes; `meleeWeapons` is a real skill, read `CharacterSystemTemplate.js:123`), `spreadsheet/io/PlanImport`. `GetEffectCreationChanges.test.js` stays (its function is not migration code). |
| **migration tests — delete whole** (ruling 8) | 9 files, 154 tests (§0) | Phase 1, after the one-off check (§7.0). The `src/` code stays untouched; no seam. |
| **rewrite onto live documents** | 1 file, 14 tests: `spreadsheet/io/ApplyImport` | Deleted in Phase 6 once `compendium-spreadsheet.spec.js` carries the 14 outcomes of §5.1 |
| **vestigial** | 1 file, 3 tests: `builders` | Deleted in Phase 5 with `tests/shared/builders.js` and `fixtureConstants.js` |
| **new** | `tests/unit/RulesElementStacking.property.test.js` — the fast-check property from `logic/rules-elements` 212 on the pure `ApplyRulesElements` path | Phase 7 |

### 3.3 Infrastructure (`helpers/*.md`); deletion phases derived by `source-test-map.mjs`

| File | Disposition |
|---|---|
| **new, Phase 1** | `tests/e2e/registry.js`, `tests/e2e/flows.js` (A1, A2, A6, S1, T1 with its spike, T2, P1, P3 in Phase 1; the rest as their first consumer lands), `tests/e2e/global-teardown.js`, `settings.js` prior-value recording, `playwright.config.mjs` `globalTeardown`, `.gitignore` `test/state/`. They precede the one-off check, which is their first consumer (§7.0). |
| `tests/e2e/world.js` | keep `closeAllApps`, `clearChat`, `attachPageErrors`, `newestMessageType`, `waitForAnimations`, `showChatLog`, `expectActiveGM`; delete `reloadWithMode` (Phase 1, after the one-off uses it), `buildCheck` (Phase 5), `controlFixtureActorToken`, `deleteFixtureActor`, `deleteOrphanedTokens` (Phase 6) |
| `tests/e2e/fixtures.js` | keep `login`, `openSheetTab`, `collectLocalizationOffenders`; `renderSheet` rewritten in Phase 2 to take a uuid (`fromUuid` then `sheet.render(true)` in `page.evaluate`) — today it rebuilds a locator through `new Function` (read `fixtures.js:64`), which the test rule bans (review checks it; no guard enforces it); delete `ensureDocument` (Phase 2) |
| `tests/e2e/checkDialog.js` | `openCheckDialog` opens from the sheet's roll button of a given fixture (Phase 4; read: today `request*Check` through `new Function` at `:54-74`); the field helpers unchanged |
| `tests/shared/builders.js`, `combat.js`, `fixtureConstants.js`, `tests/unit/builders.test.js` | deleted in Phase 5; `checkOracle.js` stays |
| `dice.js`, `select.js`, `contextMenu.js`, `multiClient.js`, `poll.js`, `componentProbe.js`, `fast-check.js`, `users.js`, `global-setup.js`, `slow-operation-reporter.js`, `tests/setup.js`, `tests/components/*`, `tests/unit/helpers/*` | stay |
| `src/test-probe/componentRegistry.js` | gains `ItemSheetConditionalCheckModifierSettings`, `ItemSheetMulBaseSettings`, `ItemSheetMulSumSettings` (Phase 3; probe bundle only) |

---

## 4. The real-flow approach

### 4.1 Shared fixtures: `tests/e2e/registry.js` + `tests/e2e/global-teardown.js` (Phase 1)

- **Running list.** `test/state/registry.json` (new directory, gitignored; not `test/build/`, which the probe build empties — read `vite.probe.config.mjs:40 emptyOutDir: true`) holds `runStartedAt` and every document the suite created: `{ key?, documentName, id, parent: uuid|null, sceneId?, packId?, createdBy: spec }`, every hotbar assignment `{ userId, slot, macroId }`, and `settings: [{ scope, namespace, key, prior }]`. Flows append through a Node-side `registry.record(entry)`; the file is the single source of truth across spec files and across a mid-file reload.
- **Shared, lazy, id-keyed.** `shared(page, key)` (exported from `flows.js`, so that `registry.js` stays a leaf module with no flow import) returns the id of the fixture named `key` (`player`, `npc`, `weapon`, `spell`, `ability`, `armor`, `shield`, `equipment`, `commodity`, `effectHost` (a player that holds only the two shared effects), `effect`, `conditionalEffect`, `bulkActor`, `roller`, `situationalActor`, `scene`, `trayPack`) if the list has it and the document still resolves, else creates it through the named flow and records it. Order-independent. Shared fixtures are never deleted mid-run (ruling 1). A test that needs its own document creates one with a per-test name and records it. Fixture names are `E2E Shared <Type>`; no spec references that prefix (measured: `grep -rn "E2E Shared" tests/` → 0) and the only by-type finder, `ensureDocument` (read `fixtures.js:110`), is deleted in Phase 2 with its six importers.
- **Mutation discipline.** A test that changes a shared fixture through a control restores the field through the same control before it ends, or uses a per-test document. A spec may not rely on a prior spec's edits.
- **Suite-end deletion.** `globalTeardown` launches one Chromium, logs in as `E2E GM 1`, and in order: deletes the list in dependency order through the API (`Combat#delete`, tokens on **every** scene via `scene.deleteEmbeddedDocuments('Token')`, scenes, embedded parents, world actors/items/macros/tables/journal/playlists/cards, folders, `pack.deleteCompendium()` after unlock); clears every recorded hotbar slot with `user.assignHotbarMacro(null, slot)` (deleting a Macro does not clear its slot: `client/documents/macro.mjs` has no `_onDelete`, and the slot map lives on the User, read `client/documents/user.mjs:158-188`); deletes every `ChatMessage` whose `timestamp >= runStartedAt`; restores every recorded setting; **sweeps** `E2E `-prefixed documents of the enumerated kinds (actors, items, scenes, folders, macros, roll tables, journal entries, playlists, cards, world compendia) plus tokens on any scene whose actor does not resolve, deleting them and printing the count per kind; then runs the **census** over the same kinds plus tokens, messages since `runStartedAt`, and hotbar entries of the E2E users whose macro does not resolve — never User documents. From Phase 6 a non-zero sweep count fails the run too; in Phases 1–5 the sweep count is recorded per run and only the census must be zero.
- **Crash recovery.** `global-setup.js` runs the same deletion over a leftover `registry.json` before the probe build.
- **One-time cleanup (Phase 0).** The four pre-existing orphans (#106), any `E2E `-prefixed leftover, and every dangling hotbar entry on the E2E users are removed once through the API; counts measured before and after and recorded.
- **Settings.** World settings through the API are allowed by the rule verbatim. Client settings through the API (`getCheckOptions`, `confirmDeletingItems`, player-HUD layout keys) are an **interpretation** of the same clause (configuration, not documents); the alternative is the Configure Settings window. The suite lists every client key it sets in `conventions.md`.

### 4.2 Edits, reads, deletion

- A mid-test change goes through the control a user would use. `Document#update` from `page.evaluate` is allowed only for a field with no control.
- Reads through the API are unrestricted.
- **Derived values come from the flows that derive them (ruling 12).** `check-dialog-advantage` 697: the situational shared actor carries rules elements entered in the editor (A5) that give the attribute check a Dice Mod and an Advantage; the dialog is opened from the sheet's attribute button; the test asserts the dialog's starting Dice Mod and Advantage and the rolled parameters. Measured scan for other option-seeded derived values (`grep -rn "diceMod:\|advantage:\|automaticFailure:" tests/e2e`): 697 was the only site that seeded a derived value through the API; every other hit is an assertion (`toMatchObject`/`expect` on `parameters`, e.g. armor-trait-situations 157), a dialog-set control (check-advantage 136–225: Advantage select and Automatic Failure checkbox under `getCheckOptions = 'always'`), an option read, or a deleted legacy/mutation half (check-advantage 309–380).
- **Modifier presence in `check-dialog.spec.js`.** The Effects-tab active toggle exists only for permanent effects (read `CharacterSheetEffect.svelte:87-90`; default duration `turnStart`, read `EffectSystemTemplate.js:17`), so the pre-made modifier effects are set permanent through the effect sheet's duration select first; `isActive = !disabled` is the gate the derivation reads. Toggle-driven: 350, 398, 440, 502, 570, 731, 1242. Live create/delete while the dialog is open (A3 from the sheet behind the dialog, row Delete + confirm): 226, 278 (same-key row identity), 1124 ×2 runtime, 1261.
- Deletion in teardown uses the API (rule). A test whose **subject** is deletion drives the UI.
- Dice: `forceDice`/`resetDice` replace `CONFIG.Dice.randomUniform` — a seam, not a document.

### 4.3 Flows — `tests/e2e/flows.js`

One exported async function per flow; each drives the DOM, returns the created id(s), and records them. Anchors were read in the Foundry v14 install (`C:/FoundryVTT/V14/dev/foundry/`; `client/…` and `templates/…` relative to it) and TITAN source.

**Actors, items, effects**
- **A1 `createActor(page, { name, type })`** — Actors tab `[data-action="createEntry"]` (read `client/applications/sidebar/document-directory.mjs:58`) → `#document-create` form → confirm. Phase 1.
- **A2 `createOwnedItem(page, actorId, type, name)`** — sheet Inventory/Abilities/Spells tab "+" (read `CharacterSheetInventoryTab.svelte:101`; `CharacterSheetAbilitiesTab.svelte:73`; `CharacterSheetSpellsTab.svelte:40`); rename in the item sheet. Phase 1.
- **A2b `dragItemOntoSheet(page, itemId, actorId)`** — `locator.dragTo` from `#items .directory-item[data-entry-id]` onto the open sheet (`TitanActorSheet#_onDropItem`, read `src/document/types/actor/sheet/TitanActorSheet.js:298`).
- **A3 `addEffect(page, actorId, name)`** — Effects tab `addNewEffect` (read `CharacterSheetEffectsTab.svelte:29`); duration/remaining/initiative/disabled through the effect sheet header (read `ActiveEffectSheetHeader.svelte:52-96`).
- **A4 `addCheck(page, documentId, fields)`** — Checks tab "+" (read `ItemSheetChecksTab.svelte:99-109`), then the row's inputs.
- **A5 `addRulesElement(page, documentId, element)`** — Rules Elements tab "+" then the operation/selector/key/value/rounding/mode/`ccm-*` controls (precedent: `rules-element-crud`, `rules-element-check-modifier-editor`).
- **A6 `createWorldItem(page, { name, type })`** — Items tab, same core dialog. Phase 1.
- **A7 `addCustomTrait`, `addAttack`, `enableAspect`, `addCustomAspect`** — the sidebar Add Custom Trait dialog, the weapon Attacks tab "+", the spell aspect tabs.
- **F1 `pickPortrait(page, sheetLocator, fileName)`** — the sheet's portrait button opens Foundry's FilePicker; navigate to `icons/svg/` and click `[data-action="pickFile"][data-name="<fileName>"]` (read `templates/apps/file-picker/body.hbs:7-8,20`); `icons/svg/mystery-man.svg` exists in `public/`. No stub.

**Tokens, scenes, conditions**
- **T1 `placeToken(page, actorId)`** — `dragTo` from the actor's directory entry onto `#board` centre (read `client/canvas/board.mjs:683,2481-2498` → `client/canvas/layers/tokens.mjs:962 _onDropActorData`). **Inferred:** HTML5 `dragTo` onto the PIXI canvas works in headless Chromium as between HTML elements; this is the Phase 1 spike. If it does not, stop and report (no alternative mechanism is pre-authorised). Control: click the token's screen centre (`canvas.clientCoordinatesFromCanvas(token.center)`, read `board.mjs:1972`); open its sheet: double-click. Phase 1.
- **T2 `toggleTokenLink` / `unlinkPlacedToken`** — header `.toggle-token-linked-button` (read `ActorSheetHeaderButtons.svelte:51-70`; `TitanActorSheet.js:210-237`). Phase 1.
- **T3 `applyCondition(page, tokenId, statusId)`** — token HUD `[data-action="togglePalette"][data-palette="effects"]` → `.status-effects .effect-control[data-status-id]` (read `templates/hud/token-hud.hbs:59-66`; `client/applications/hud/token-hud.mjs:329`).
- **S1 `createScene` / `activateScene` / `viewScene`** — Scenes tab create + entry context menu (read `client/applications/sidebar/tabs/scene-directory.mjs:40-49`). Phase 1. Measured in Phase 1: core views a scene created while none is viewed, and does not view a second one created while one is viewed; the context menu hides View for the viewed scene (`scene-directory.mjs:40`). `createScene` therefore waits for the draw when nothing was viewed, and `viewScene` skips the menu for a viewed scene.
- **O1 `setOwnership(page, actorId, userName, level)`** — directory context menu `OWNERSHIP.Configure` (read `document-directory.mjs:247`) → `DocumentOwnershipConfig`.

**Folders, packs**
- **P1 `createCompendium(page, { label, type })`** — Compendium tab create → `#create-compendium-label`, `select[name="type"]` (read `templates/sidebar/compendium-create.hbs:6,13`; `client/applications/sidebar/tabs/compendium-directory.mjs:455-484`); lock via context menu `COMPENDIUM.ToggleLocked.*` (read `:119-124`). Phase 1.
- **P2 `createFolder(page, directory, name)`** — `[data-action="createFolder"]` (read `document-directory.mjs:59`).
- **P3 `putInPack(page, entryLocator, packId)`** — click the pack entry to open the pack's popout window (`Compendium`, a `DocumentDirectory`), then `dragTo` the world entry onto the popout's `.directory-list` (read `document-directory.mjs` `_onDrop` / `_handleDroppedEntry`; the Compendium tab's own `_onDrop`, `compendium-directory.mjs:246,1099`, accepts only `Folder` and `Compendium` data, so a drop onto the pack entry does nothing); polls `pack.getIndex()` for the new id; the 200 ms retry loops in `compendium-spreadsheet.spec.js:104-142` are deleted. Phase 1.

**Combat, macros, chat**
- **K1 `createCombat(page)`** — tracker `[data-action="createCombat"]` (read `client/applications/sidebar/tabs/combat-tracker.mjs:27` → `_onCombatCreate :478`, creates and activates). **K2 `addCombatant(page, tokenId)`** — token HUD `[data-action="combat"]` (read `templates/hud/token-hud.hbs:101`). **K3** `rollAll`/`rollNPC` (header buttons, read `templates/sidebar/tabs/combat/header.hbs:63,66`) and `startCombat`, `nextTurn`, `previousTurn`, `nextRound`, `endCombat` (footer buttons, read `templates/sidebar/tabs/combat/footer.hbs:8-34`), all dispatched by `combat-tracker.mjs:425 _onClickAction`, under `forceDice` for initiative. Replaces `seedCombatEncounter` (`tests/shared/combat.js:18`; 4 importers) and `Combat.create` in `player-hud-visibility.spec.js:195-215`.
- **M1 `createItemMacro(page, actorId, itemId, kind)`** — drag the **item row** (the hotbar drop accepts only `Item` data, read `src/hooks/OnHotbarDrop.js:12`) onto `#hotbar` → `CreateItemMacroDialog` (read `src/document/types/item/dialog/CreateItemMacroDialog.js`; opened at `OnHotbarDrop.js:43-48`) → choose the kind and identifier method → click the slot; records the macro and `{ userId, slot }`.
- **C1 `typeChatMessage(page, text)`** — focus `.chat-input` (read `client/applications/sidebar/tabs/chat.mjs:495,519`), type, `Enter`; the Enter handler is not cited (no `keydown` match in `chat.mjs`; **inferred** to be core's keybinding layer); the flow asserts the resulting message.

### 4.4 Sub-label handling

R-source → the subject comes from `shared` (`flows.js`) or a flow. R-edit → the API call is replaced by the control named in the record. R-both → both. `renderSheet` (read-side render by uuid) is allowed; opening from a token is double-click (tested once in `sheet-header`); opening from the directory is double-click (tested once in `surfaces`); elsewhere `renderSheet`.

---

## 5. Where coverage lives after the rewrite

| Behaviour | Unit (intermediate, retained) | Live |
|---|---|---|
| Derived stats, rules-element math, conditions | `ConditionMechanics`, `CharacterCheckModifiers`, `ModBuckets`, `ComputeMulSumDelta`, `ComputeSetSumDelta`, `RoundDirectional`, new property test | `logic/rules-elements`, `logic/conditions` |
| Check options, dialog re-derivation, advantage | `check/*` (rebuild-check-options 41, apply-advantage 18, …) | `check-dialog` (incl. 697 from rules elements), `check-math` |
| Editor handling of invalid stored elements | — | `component-probe-inputs` (§3.1.c, synthetic input) |
| HTML cleaning of user text | — | `component-probe-display` (RichText), `component-probe-buttons-tags` (EffectTag, Tag), `custom-traits` 126 (live edit) |
| Embedded bridges, row plumbing | `EmbeddedDocument*`, `ReactiveDocument` (+ the #104 uuid case), `ResolveRollActor` | `character-sheet-rows`, `player-hud`, `sheet-header` |
| HUD model | `BuildActionMenuModel`, `HudGeometry`, `HudLayoutState` | `player-hud*` |
| Reports | `BuildEffectTagTooltip`, `ConditionReportData`, `Rpt…SchemaEquivalence` | `combat-turns`, `player-hud-action-menu` |
| Chat cards | `ChatMessageContent`, `ChatMessageMountRegistry`, `*SchemaEquivalence` | `chat-cards` |
| Migration system | none (ruling 8) | none; the one-off check of §7.0 ran once and is recorded |
| Spreadsheet | codec/format/markdown units, `PlanImport`, `ExportCompendium` | `compendium-spreadsheet` (§5.1) |
| Effect tray | `FilterEffectTree`, `EffectFolderContextMenu`, `EffectRowContextMenu` | `effect-tray` |
| Macros | `Macros` (23) | `macros` |

### 5.1 `ApplyImport` — the 14 unit outcomes and their live tests in `compendium-spreadsheet.spec.js`

The spreadsheet is the feature under test and the user's own editing medium: fixture files are produced by the Export dialog from a flow-made pack, their cells edited in Node through TITAN's codec exactly as a user edits them in a spreadsheet application (valid values only — ruling 10 bars editing exported data to smuggle odd values in; rows 9 and 12 feed deliberately invalid input, which ruling 11 permits), and fed to the Import dialog's `<input type="file">` (read `ImportDialogShell.svelte:131`) with `setInputFiles`. Outcomes are read from the preview summary (`import-preview-summary`), the error list (`:189-192`), the notification (`:98-114`), and the pack.

| # | Unit test (`ApplyImport.test.js` line) | Live test |
|---|---|---|
| 1 | creates top-level documents with `keepId` (9) | import new actor rows into an empty pack; the pack's ids equal the file's |
| 2 | creates an embedded item via the parent in the run (60) | actor row + its item row in one file, new pack |
| 3 | creates a depth-2 effect via the owned item in the run (116) | actor + item + effect rows in one file |
| 4 | updates a top-level document (187) | export, edit one cell, re-import; value changed, id kept |
| 5 | leaves the folder untouched without a `_folder` column (225) | re-import a file without the column; folder unchanged |
| 6 | moves an updated document into its target folder (259) | change `_folder`; the document sits in the new folder |
| 7 | creates an embedded item via a parent fetched from the pack (303) | a file with only an item row for an existing pack actor |
| 8 | creates a depth-2 effect via a parent item embedded in the pack (347) | a file with only an effect row for an existing owned item |
| 9 | throws naming the parent id when the parent exists nowhere (398) | item row with an unknown parent (invalid input, ruling 11) → the error notification names the id; nothing created |
| 10 | updates an embedded item via a parent fetched from the pack (429) | edit an owned-item cell; parent absent from the file |
| 11 | updates a depth-2 effect via a parent item embedded in the pack (474) | edit an effect cell; parents absent from the file |
| 12 | throws on update when the parent exists nowhere (531) | update row whose parent id matches nothing (invalid input) → error notification |
| 13 | refuses a locked pack (562) | lock the pack (P1 context menu), Apply → the locked-pack error (read `ApplyImport.js:111-112`) |
| 14 | deletes top-level documents by id (578) | tick `import-delete-missing-checkbox`; a pack document absent from the file is deleted |

---

## 6. Gaps the review found → new tests

| Gap (record) | Test | Target |
|---|---|---|
| Abilities, inventory, effects tab filters untested (01) | type in each filter; count rows | `sheet-filters` |
| No real pointer drag anywhere for lists (02, 03, 04) | grip drags for item/effect/element lists; order rendered + stored | `drag` |
| Cross-sheet drop type-gating (03) | drop a check onto a spell aspects list → refused | `drag` |
| Item folder dropped on a sheet creates nothing — OPEN_BUGS #107 (read `TitanActorSheet.js:382`) | drop an Items-directory folder → one owned item per folder item; non-Item folder refused | `drag` (fix on contact, Phase 3) |
| No spec opens a sheet from a token double-click (05) | double-click → the token actor's sheet, header shows unlink | `sheet-header` |
| #104 — open sheets re-render on another actor sharing their id (read `ReactiveDocument.svelte.js:39,50`) | base sheet and unlinked-token sheet open; an edit on the token sheet leaves the base sheet unchanged; plus a `ReactiveDocument.test.js` case with two fakes sharing `id` but not `uuid` | `sheet-header` (fix on contact, Phase 2) |
| Confirm dialog cancel for effects; confirmation-off path (05, 07); #103 (read `CharacterDataModel.js:6331-6351`) | cancel keeps, confirm deletes; with confirmation off the row deletes and no dialog opens | `character-sheet-rows` (fix on contact, Phase 3) |
| Edit UUID dialog function (05) | enter a new uuid → stored | `surfaces` |
| Player-side auto-open setting and GM "owned only" value (02) | the player client's sheet opens/does not per setting | `combat-turns` |
| #108 — `getCombatantByActor` deprecated (read `TitanActor.js:83`; callers `TitanActiveEffectDataModel.js:93`, `CharacterDataModel.js:6426`) | console listener fails on the deprecation warning; the fix resolves the combatant through `game.combat.combatants` by actor identity | `combat-turns` (fix on contact, Phase 5) |
| Condition description edited in its sheet (ruling 13; OPEN_BUGS #111) | the 103 extension in §3.1 pins today's behaviour (HUD keeps the definition text) | `logic/conditions` |
| LIMITED viewer of the TITAN sheet (03; ruling 9) | pin the measured current behaviour; the test's title states it; no `src/` change | `ownership` |
| Theme import through the editor control (04) | `setInputFiles` on the hidden import input with a file the editor exported | `theme` |
| Damage card Apply / Resist buttons, Penetrating (06, 08) | attack with Penetrating trait → card Apply damage to a targeted token; Resist → resistance roll with `damageToReduce` | `check-math` |
| Live import outcomes (08) | §5.1 | `compendium-spreadsheet` |
| HUD effects-panel Remove cancel (07) | cancel keeps the effect | `player-hud` |
| Macro deletion leaves its hotbar slot (reviewer, read `user.mjs:158-188`, `macro.mjs` has no `_onDelete`) | teardown clears recorded slots; census: no dangling hotbar entry on the E2E users | harness (§4.1) |

---

## 7. `src/` changes and the one-off migration check

### 7.0 One-off migration check (Phase 1; run once, recorded, reverted; never committed)

Purpose: confirm, on flow-made documents, that the migration system as shipped runs end to end on a GM load — the mode gate (`OnceReady.js:22-37` → `resolveMigrationAction`), the world scan (`worldNeedsMigration`: version chains and the stored-actor walk over every location), the version-chain write (`migrateDocument`), the stored-actor pass with nothing to do, and the notifications. Nothing in shipping code changes for it.

- **This is a live migration run over every actor and item in `test-titan`** — `documentNeedsMigration` compares each document's `system.documentVersion` with the chain's latest version (read `MigrateWorld.js:106-116`), and `migrateVersionChains` loops `game.actors`, their items and `game.items` — permitted as the user's own ask under Project Scope (ruling 8), and undone from the before-list. `test-titan` is the e2e world, not the user's.
- **Order within Phase 1:** registry, flows (A1, A2, A6, S1, T1, T2, P1, P3), teardown and config first (§3.3); the one-off is their first consumer and its record verifies them until `surfaces` lands in Phase 2; the deletions come after the revert.
- **Temporary local edits (uncommitted):** `src/helpers/migration/actor/ActorMigrations.js` and `src/helpers/migration/item/ItemMigrations.js` (both `export default []`, read) each get one entry `{ version: 1, migrate: (document, data) => ({ ...data, 'flags.titan.migrationOneOff': document.uuid }) }`. `TitanDataModel.latestVersion` is 0 (read `TitanDataModel.js:42-44`), so every world actor and item is behind the chain. A temporary spec `tests/e2e/migration-one-off.spec.js` drives it.
- **Documents (flows):** A1 player actor + A2 owned weapon, A6 world item, S1 scene + T1 token unlinked by T2, P1 Actor compendium + P3 copy of the actor, locked via the context menu. Before anything runs, the spec records `{ uuid, system.documentVersion, flags.titan }` of **every** world actor, owned item and world item to `test/state/migration-one-off-before.json`.
- **Sequence (GM reload per mode through `reloadWithMode`):** `disabled` → no dialog, nothing changed, no notification. `prompt` → `ConfirmMigrateWorldDialog` visible (read `ConfirmMigrateWorldDialog.js:9-19`); Cancel → nothing changed. `automatic` → no dialog; console `Starting world migration.`, `Stored-actor migration finished: 0 updated, N skipped; failures: 0` (read `MigrateStoredActors.js:155`), `World migration complete.`; notifications `migrationStarted` then `migrationComplete` (read `lang/en.json:448-450`); every world actor, owned item and world item has `documentVersion` 1 and the flag equal to its own uuid; the unlinked token's stored delta (`token._source.delta`) unchanged (chains loop `game.actors`/`game.items` only, read). Measured in Phase 1: the token's synthetic actor (`token.actor`) reads its base actor's merged data, so after Automatic it shows `documentVersion` 1 and the base actor's flag; only the stored delta is untouched; the pack still locked and its actor unchanged; `prompt` again → no dialog.
- **Revert, in order:** `git restore` the two chain files; `trash tests/e2e/migration-one-off.spec.js`; every document in the before-list restored by API — `system.documentVersion` to its recorded value and the flag removed with the deletion key `'flags.titan.-=migrationOneOff'` — measured before/after: zero documents differ from the before-list; the registry teardown deletes the flow-made documents; `migrationMode` restored.
- **Record:** `.superpowers/sdd/test-suite-rewrite/migration-one-off.md` (commands, console log, before/after counts), summarised in the Phase 1 commit message that deletes the migration tests and in `conventions.md` §Test infrastructure.

### 7.1 OPEN_BUGS #107 — `TitanActorSheet#_onDropFolder` (Phase 3)

An Item folder dropped on an actor or token sheet creates one owned item per item in the folder; any other folder type is refused with no error (read: the inverted condition at `TitanActorSheet.js:382`). Gated by the new `drag` test.

### 7.2 OPEN_BUGS #103 — `requestItemDeletion` / `requestEffectDeletion` (Phase 3)

With confirmation off the method deletes and returns; the confirm branch runs only when confirmation is on (read `CharacterDataModel.js:6331-6351`, `:6375-6396`). Gated by the `character-sheet-rows` confirmation-off test.

Deliberate deviation from "gated by the confirmation-off test": with confirmation off, "the row deletes and no dialog opens" cannot fail before the fix, because the stray dialog opens only when the delete is refused or fails. The gate installs a `preDelete` listener in the page that returns false (a test instrument, not a document, a mechanism or a code seam), clicks the row's delete button, and expects no dialog; the same test then removes the listener and deletes the row again. Measured before and after the fix: `.superpowers/sdd/test-suite-rewrite/phase-3/gate103-settle-before-fix.log` and `gates-fix-after.log` (local, not checked in).

### 7.3 OPEN_BUGS #104 — `ReactiveDocument` identity (Phase 2)

`ReactiveDocument.svelte.js:39` and `:50` compare `uuid`, not `id`. Gated by the `sheet-header` pin and a `ReactiveDocument.test.js` case.

### 7.4 OPEN_BUGS #108 — `TitanActor#getCombatant` (Phase 5)

Resolves the combatant from `game.combat?.combatants` by actor identity instead of the deprecated `getCombatantByActor(this.id)` (read `TitanActor.js:83`); gated by the `combat-turns` deprecation listener.

### 7.5 Nothing else in `src/` changes. No seam, no extension point, no code for testability. The probe registry (`src/test-probe/componentRegistry.js`) is probe-bundle code, not shipping code. So are `src/test-probe/ProbeDocument.svelte.js` and the document-marker resolution in `src/test-probe/registerProbe.js`, added in Phase 3 Part B as a deliberate addition (§3.1.c); they build only into `test/build/probe.iife.js`. Test-only fixtures that mirror `src/` constants import them instead.

---

## 8. CLOSED_BUGS gates → re-confirming tests

Derived: `closed-bugs-gates.sh` → `closed-bugs-gates.txt` (measured 2026-10-01). Entries citing no test file: #3–#9, #14–#17, #19, #20, #22–#31, #35, #40, #41, #43, #44, #48, #60, #62, #81, #90 — unchanged. Entries citing only unit files that stay: #1, #42, #45, #46, #68, #71, #72, #73, #86, #88 — unchanged. The rest:

| Bugs | Cited gate today | After |
|---|---|---|
| #2, #34 | report-cards | `combat-turns` (apply-confirm, 611), `player-hud-action-menu` |
| #10, #11, #12, #13, #18, #37 | sheet-regressions | `character-sheet-rows` (#10, 75), `drag` (#11, 96), `surfaces` (#12, #37), `item-sheet-rolls` (#13, 218), `sheet-header` (#18, 178) |
| #21, #33 | player-hud-layout, player-hud-effects-panel, embedded-context-*, theme | `player-hud`, `character-sheet-rows`, `theme` |
| #32 | embedded-context-check-parity, -effects | `character-sheet-rows`, `player-hud` (the 1920×1080 viewport stays) |
| #36 | localization | `surfaces` |
| #38 | effect-sheet-layout | `surfaces` |
| #39, #53, #63, #64, #66 | effect-tray (+ `FilterEffectTree` unit) | `effect-tray` |
| #47 | portrait-persistence | `surfaces` (72, 84 through the real FilePicker) |
| #49, #50, #51, #52, #87, #89 | spell-rules-regressions (+ units) | `logic/rules-elements` (#49, #50), `character-sheet-rows` (#51), `surfaces` (#52), `spell-sheet` (#87), `chat-cards` (#89) |
| #54 | content-link-theme | `theme` |
| #55, #58 | character-sheet-layout | `character-sheet-layout` |
| #56 | sheet-zoom | `character-sheet-layout` |
| #57 | permissions-observer-navigation | `ownership` |
| #59 | player-hud-action-menu + unit | `player-hud-action-menu` |
| #61 | armor-heavy-trait | `character-sheet-rows` |
| #65 | conditional-damage-healing-mods | `logic/rules-elements` |
| #67 | check-dialog-advantage + unit | `check-dialog` |
| #69, #70 | macros, item-card-check-dialog + units | `macros`, `chat-cards` |
| #75 | stat-breakdown-conditions + unit | `logic/conditions` |
| #77 | rules-element-rounding-editor + unit | `rules-element-editor` (134); the missing-rounding clamp as a probe on synthetic input (`component-probe-inputs`, §3.1.c) |
| #78, #79, #80, #91 | condition-description + units | `combat-turns`, `logic/conditions`, component probes |
| #84, #85 | html-sanitization | `component-probe-display` (74, RichText), `component-probe-buttons-tags` (93, EffectTag; 197, Tag), `custom-traits` (126, live) — re-labelled "cleaning asserted on the components with synthetic input; a real flow cannot carry the handler (ProseMirror drops `on*` attributes, read `common/prosemirror/schema/attribute-capture.mjs:83-93`, allowed attributes `common/constants.mjs:1839-1841,1862`)" |
| #74, #82, #83, #93, #94, #95, #96, #97, #98, #99, #100, #101, #105 | migration units + condition-migration / pack-conversion / converted-effect-identity / effect-creation-source | **no test** (ruling 8). Each gate line re-labelled "not tested: migration tests deleted 2026-10-01 by project rule; the migration system was confirmed once by the one-off check (§7.0)". #94's `GetEffectCreationChanges` unit stays and is named. |

---

## 9. Logged items folded in

- **OPEN_BUGS #106**: teardown deletes tokens on every scene and sweeps orphans; the four existing orphans removed in Phase 0 (measured). Closure evidence: a zero sweep count at the end of the Phase 5 full run. Cause not diagnosed and not needed (inferred: the active-scene-only `deleteFixtureActor`, read `world.js:160`).
- **OPEN_BUGS #107, #103, #104, #108**: §7.1–§7.4, fixed on contact.
- **OPEN_BUGS #110, #111**: deferred by the user to the document-inheritance campaign (`docs/TODO.md`); stay open; the 103 extension pins today's #111 behaviour (ruling 13).
- **OPEN_BUGS #102**: its entry cites no spec or unit file (measured grep); nothing to edit.
- **TODO**: Phase 8 deletes the "No synthetic documents in tests" entry and, in the parked Task 5 entry, only the hand-off paragraph ("These go to the test rewrite: … D2, D7 and D10 … D3 … D11"): D3 is §8; D11 is the census; D2/D7/D10 concerned migration tests now deleted. The rest of the Task 5 entry and the document-inheritance entry stay.
- **POST_WORK_FINDINGS** four "pending real-path re-run" notes (lines 8, 34, 45, 57, read): re-labelled "not re-run; no migration tests while no migration is active (project rule)".

---

## 10. Reviewer findings and how each is handled

### Round 1 (plan v1; A and B)

- [CRITICAL, both] Project Scope invalidates the migration rewrites → all migration tests deleted (ruling 8); no seam; one-off check (§7.0); §8 rows re-labelled.
- [IMPORTANT, A+B] §4 incomplete / unverified → §8 derived by script.
- [IMPORTANT, A] Shared vs per-test fixtures → ruling 1. [IMPORTANT, A] Checking in soresokai records → ruling 2.
- [IMPORTANT, B] #106's orphans vs census → Phase 0 cleanup + sweep.
- [Minor, A+B] anchors, counts, wording — fixed in revision 2.

### Round 2 (revision 2; `buddy-plan-rev2-findings.md`)

- Helper/source-spec deletion order → derived by `source-test-map.mjs`; `--list` gate. portrait-persistence and sheet-regressions 75 mapped. batch-01 regenerated + `record-line-check.mjs`. ChatMessages deleted before the census. Sweep-then-census; fixture names. Registry in `test/state/`. LIMITED → ruling 9. Anchors fixed. One-reviewer items: permanent-duration prerequisite; `renderSheet` by uuid; §5.1 table; #103/#104/#108 on contact; theme import via `setInputFiles`; M1 item-row drag; spell-rules 130 → `surfaces`; combat-seed P5; client settings labelled; 697 (superseded in round 3 by ruling 12).

### Round 3 (revision 3; `rev4-brief.md`) — all agreed items and user rulings

- **U-a** → no hand-edited export/import anywhere; §5.1 states why the spreadsheet round trip is the feature itself and edits only valid cells; the theme import test uses the editor's own export.
- **U-b** → 154, 223 ×2, 172 ×2 become probe tests on synthetic input (§3.1.c) in `component-probe-inputs`, written in Phase 3; the editor components join the probe registry (not shipping code). Records updated (batch-04, batch-07).
- **U-c** → 697 is a real flow from rules elements (§4.2); the script-macro route is gone; the measured scan found no other option-seeded derived value. Record updated (batch-09).
- **U-d** → #111 noted (§9); the 103 extension drives core's `ActiveEffectConfig` (§3.1 `logic/conditions`).
- **A1** → html-sanitization 74/93 are `RichText`/`EffectTag` probes; §8 #84/#85 re-labelled; §3.1.b no longer lists them; tsv updated. 126 stays live. Record updated (batch-04).
- **A3** → the T1 mouse fallback is deleted; on failure, stop and report (§4.3).
- **A4** → census kinds enumerated, plus tokens, messages and hotbar entries, never Users (§4.1).
- **A5** → §7.0 states the live run over every `test-titan` actor and item, cites `MigrateWorld.js:106-116`, ruling 8, and the before-list restore.
- **A6** → 103 extension specified (§3.1).
- **A7** → counts labelled sites vs runtime throughout.
- **A9** → effect-creation-source deleted whole in Phase 1 as a migration test; #94 re-labelled; `GetEffectCreationChanges` stays. Record updated (batch-06).
- **A10** → §3.1.b gives the basis for every deletion; invalid-data cases are synthetic tests, not deletions.
- **B1** → registry, flows (A1, A2, A6, S1, T1, T2, P1, P3), teardown, settings recording, config and `.gitignore` in Phase 1 ahead of §7.0; §3.3, §4.1 and the T1 wording updated; the Phase 1 gate says the one-off record verifies the moved flows until `surfaces` lands.
- **B3** → no FilePicker stub; F1 picks `icons/svg/mystery-man.svg` in the real FilePicker (`body.hbs:7-8,20`); record corrected (batch-01).
- **B4** → Phase 8 deletes only the "No synthetic documents" TODO entry and the Task 5 hand-off paragraph (§9).
- **B5** → 605 sites; both scripts require a string title for `test.skip(` (§0, §2).
- **B6** → K3 `rollAll`/`rollNPC` at `header.hbs:63,66` (§4.3).
- **B9** → the restore uses `'flags.titan.-=migrationOneOff'` (§7.0).
- **B-new** → hotbar slots recorded; teardown `assignHotbarMacro(null, slot)`; census adds dangling hotbar entries; Phase 0 cleans existing ones, measured (§4.1, §6).

---

## 11. Test rules

No meta-tests scan test code. The test rules in `.claude/claude.md` "Project Scope" are followed by whoever writes the tests and checked in review.

---

## 12. Phases

Every phase ends with: `npm test` green; `npx playwright test --list` succeeds; `npm run test:e2e` green, read from the incremental log (memory `e2e-output-pipes-lie`); census zero and the sweep count recorded (zero required from Phase 6); `source-test-map.mjs` and `record-line-check.mjs` green; durations measured with `spec-durations.mjs`; one commit per target spec (Phases 2–6) or per file group (0, 1, 7, 8). One rule for anything unexpected: stop and report to the controller with the measurement.

Source-spec deletion per phase (derived, `source-test-map.mjs` output 2026-10-01):

- **P1 (4):** condition-migration, converted-effect-identity, effect-creation-source, pack-conversion.
- **P2 (7):** editor-description, effect-sheet-layout, header-buttons, header-controls, localization, portrait-persistence, render-smoke.
- **P3 (28):** armor-heavy-trait, character-sheet-layout, character-sheet-reorder, checks-tab-filter, cross-sheet-element-copy, effect-reactivity, effect-traits, embedded-context-items, interaction-dialogs, item-check-damage-reduction, item-sheet-roll, reactive-ability, reactive-armor-shield, reactive-effect-rows, reactive-expanded-toggle, reactive-inventory-basic, reactive-spell, reactive-weapon, rules-element-check-modifier-editor, rules-element-crud, rules-element-rounding-editor, settings-list-reorder, sheet-regressions, sheet-zoom, spell-aspect-conditions, spells-filter, trait-add-custom, traits.
- **P4 (12):** check-dialog-advantage, check-options-setting, checks-dialog, checks-integration, checks-opposed, condition-checks, conditional-damage-healing-mods, interaction-rolls, logic/conditions, logic/rules-elements, resistance-check-modifiers, stat-breakdown-conditions.
- **P5 (30):** armor-trait-situations, attack-tags, chat-message-mounts, check-advantage, combat-seed, condition-description, content-link-theme, effect-chat-card, effect-checks, embedded-context-check-parity, embedded-context-effects, item-card-check-dialog, item-cards, item-sheet-roll-gating, macros, permissions-auto-open, permissions-observer-navigation, permissions-ownership, player-hud-action-menu, player-hud-action-menu-layout, player-hud-effects-panel, player-hud-layout, player-hud-portrait, player-hud-sidebar-anchor, player-hud-visibility, report-cards, socket-sync, spell-rules-regressions, theme, theme-editor-header.
- **P6 (13):** compendium-spreadsheet, component-probe, component-probe-buttons, component-probe-context, component-probe-display, component-probe-inputs, component-probe-labels, component-probe-selects, component-probe-tags, effect-tray, html-sanitization, multi-client, permissions-compendium.

Helper deletion per phase (derived from importers): `reloadWithMode` P1; `ensureDocument` P2 (`renderSheet` rewritten P2); `openCheckDialog` rewritten P4; `buildCheck`, `tests/shared/builders.js`, `tests/shared/combat.js`, `fixtureConstants.js`, `tests/unit/builders.test.js` P5; `controlFixtureActorToken`, `deleteFixtureActor`, `deleteOrphanedTokens` P6.

**Phase 0 — Baseline, one-time cleanup.** `.superpowers/sdd/test-suite-rewrite/baseline.md`; the census script run once against `test-titan` (the four orphans, every `E2E `-prefixed leftover and every dangling hotbar entry on the E2E users removed through the API; before/after counts recorded). Its fix rounds also added the harness error gate (`tests/e2e/harness.js`: every test fails on an uncaught page error or `Hooks.onError` report from any world page, from boot on) and changed `src/` (by commit subject: `3f1c56fd` and `17879ff0` for the Effect Tray, #112; `7ee14f8b` for #115; `1cf15022` for comments in bug citations).

**Phase 1 — Harness, migration one-off, migration deletions.** `registry.js`, `flows.js` (A1, A2, A6, S1, T1 spike, T2, P1, P3), `global-teardown.js`, `settings.js` recording, `playwright.config.mjs` `globalTeardown`, `.gitignore`; then §7.0 run, recorded, reverted (residue zero, measured); then delete the 9 unit files (154 tests), the 4 specs, `reloadWithMode`. Gate adds: the one-off record is the verification of the moved flows until `surfaces` lands; the commit message carries the one-off's measured summary.

**Phase 2 — `surfaces`, `sheet-header`.** `renderSheet` by uuid; F1; §7.3 (#104); the shared fixture set exists (every type via A1/A2/A2b/A3/A4/A5/A6/A7/T1); the P2 source list deleted with `ensureDocument`. Gate adds: the before/after duration of the merged specs recorded.

**Phase 3 — Sheet family.** `character-sheet-rows`, `custom-traits`, `sheet-filters`, `rules-element-editor`, `item-sheet-rolls`, `spell-sheet`, `character-sheet-layout`, `drag`; the three invalid-data probes added to `component-probe-inputs.spec.js` with the registry additions (§3.1.c); §7.1 (#107) and §7.2 (#103); the P3 source list deleted.

**Phase 4 — Checks and rules.** `check-math`, `check-dialog` (697 per §4.2), `logic/rules-elements`, `logic/conditions` (103 extension); `checkDialog.js` rewritten; the P4 source list deleted. Action-helper duty (conventions.md "Action helpers return only after the effect of their action is observable"; OPEN_BUGS #131): every spec-local helper of this phase's specs that writes through the API and returns at the awaited write ends with `await settle(page)` (or is replaced by a real flow, which already settles); the closing review found these: seedActor of condition-checks and resistance-check-modifiers.

**Phase 5 — Tokens, HUD, combat, chat, macros, ownership, theme.** `player-hud`, `player-hud-action-menu`, `combat-turns`, `chat-cards`, `macros`, `ownership`, `theme`; §7.4 (#108); the P5 source list, `buildCheck`, `tests/shared/*` (except `checkOracle.js`), `builders.test.js` deleted. #106 → CLOSED_BUGS with the zero sweep count as evidence. Its gate must also exercise the teardown branches no earlier phase reaches: `Combat` deletion, and the macro/hotbar path (`recordHotbar`, clearing the recorded slot), each shown to run in the teardown line of the full run. Action-helper duty (conventions.md "Action helpers return only after the effect of their action is observable"; OPEN_BUGS #131): every spec-local helper of this phase's specs that writes through the API and returns at the awaited write ends with `await settle(page)` (or is replaced by a real flow, which already settles); the closing review found these: seedArmoredActor of armor-trait-situations, seedEffect of check-advantage, seedObservedActor of permissions-observer-navigation, seedOwnedActor of permissions-ownership, seedControlledActor of the player-hud specs, seedWeaponFixture of player-hud-action-menu-layout, seedDocuments of player-hud-action-menu and seedPanelFixture of player-hud-effects-panel.

**Phase 6 — Packs, tray, spreadsheet, probe merges.** `effect-tray`, `compendium-spreadsheet` (§5.1), `multi-client`, the three component-probe files (incl. the RichText/EffectTag sanitization probes); the P6 source list, `controlFixtureActorToken`, `deleteFixtureActor`, `deleteOrphanedTokens`, `ApplyImport.test.js` deleted. Gate: sweep count zero. Action-helper duty (conventions.md "Action helpers return only after the effect of their action is observable"; OPEN_BUGS #131): every spec-local helper of this phase's specs that writes through the API and returns at the awaited write ends with `await settle(page)` (or is replaced by a real flow, which already settles); the closing review found these: seedScratchPack and seedScratchActorPack of compendium-spreadsheet, seedNestedFolders, seedFolders and deletePrefixed of effect-tray, and postTurnStartReport of html-sanitization.

**Phase 7 — Unit.** The 8 `ShouldGetCheckOptions` deletions; the seven optimizable edits; the new property test.

**Phase 8 — Documentation (required).** `conventions.md` §Test infrastructure rewritten to the current state (registry, flows, teardown, sweep + census incl. hotbar, client-setting keys, the merged spec list, the migration one-off line, the probe-registry editors; every deleted helper removed); `docs/TODO.md` per §9; `docs/OPEN_BUGS.md` (#103, #104, #106, #107, #108 → `docs/CLOSED_BUGS.md` with their gates; #102, #110, #111 untouched); `docs/CLOSED_BUGS.md` gate lines per §8; `docs/POST_WORK_FINDINGS.md` four notes per §9; `graphify update .`.

**Runtime expectation (method, not number).** Baseline 6.8 m for 98 boots. Boots fall to ~34 files (+ 2 multi-client sessions); flow creation adds dialog round-trips once per shared fixture and per per-test document. Phase 2 measures the first merged specs before/after; each later phase re-measures the full run and records it in the commit message. The 60 s per-test timeout stays; `combat-turns` raises its own with the measured reason.

---

## 13. Rulings received (2026-10-01) — no open questions

1. **Migration tests**: all deleted (9 unit files, 4 specs incl. effect-creation-source); no seam; one one-off check, then reverted (ruling 8; Project Scope at `6bf6bfdc`).
2. **Legacy client-setting Boolean normalisation tests**: deleted; code left alone (ruling 5).
3. **Chat messages**: none created through the API (ruling 6).
4. **OPEN_BUGS #110, #111**: deferred to the document-inheritance campaign; stay open (rulings 7, 13).
5. **LIMITED-permission sheet**: pin the measured current behaviour (ruling 9).
6. **Exported-data editing**: never used to inject values (ruling 10).
7. **Invalid data**: synthetic input is allowed to test rejection/handling; the three editor cases are probe tests (ruling 11).
8. **Derived values**: produced by the real flows that derive them; 697 from rules elements (ruling 12).
