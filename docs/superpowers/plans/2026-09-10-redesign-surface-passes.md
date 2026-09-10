# Redesign Surface Passes — implementation plan

Spec: `docs/superpowers/specs/2026-09-10-redesign-surface-passes-design.md`. Branch: `campaign/backlog-closeout`
(already checked out; do NOT switch branches — `packs/**` is a live database and blocks checkout). Commit
after each task once its verification passes. Never stage `.claude/agents`, `.claude/claude.md`,
`.claude/settings*.json`, `.claude/skills/graphify/**`, the root `CLAUDE.md` deletion, `packs/effects/**`,
or the root `*.png` files — those are another session's uncommitted work. Never stage `tests/e2e/zz-*.spec.js`.
Run `npm run build` before any e2e run so the live Foundry at :30000 serves your change; run Playwright
specs individually in the foreground (`npx playwright test <spec> --reporter=line`).

## Task 1 — Compact skill rows (Pass 1a)

Files: `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte`.

1. Re-lay the template on one line: `.skill` = flex-row, space-between, vertically centred: the check
   button (`CharacterSheetCondensedSkillCheckButton`), the `DocumentAttributeSelect` (keep its
   `defaultAttribute.desc` tooltip), then a `.stats` flex-row holding two `.stat` groups (Training,
   Expertise). Each group: the icon (`TRAINING_ICON` for training, `EXPERTISE_ICON` for expertise — the
   current file has these two swapped on the labels; fix it) carrying `use:tooltipAction` with
   `'training.desc'` / `'expertise.desc'`, then base `DocumentIntegerInput`, `+`, static-mod
   `DocumentIntegerInput`, `=`, `ModifiedValueLabel` — exactly the same bindings and tooltips as today.
   Remove the text labels `{localize('training')}` / `{localize('expertise')}` from the row (the tooltip
   carries them). Keep `@include panel-2` and the horizontal padding; drop the per-row `border-top`
   separators that only made sense between stacked rows.
2. Every JSDoc/comment in the file must describe the new layout (present tense).
3. `npx eslint <file> --quiet` and `npx stylelint "<file>"` clean; `npm run build`; run
   `npx playwright test checks-integration reactive-ability embedded-context-check-parity --reporter=line`
   (green). Commit: `feat: lay each character sheet skill out on one row`.

## Task 2 — Sidebar section labels (Pass 1b)

Files: `src/styles/Mixins/FontMixins.scss`, `src/document/sheet/DocumentSheetSidebar.svelte`,
`src/document/types/actor/types/character/sheet/sidebar/CharacterSheetSidebar.svelte`, and the NPC sidebar
if one exists separately (`grep -rn "DocumentSheetSidebar" src`).

1. Add `@mixin section-label` to `FontMixins.scss`: `@include font-size-small`, `font-weight: bold`,
   `letter-spacing: 0.06em`, `text-transform: uppercase`, `color: var(--titan-header-6-font-color)`.
2. `DocumentSheetSidebar` accepts `sections` entries as either a component (unchanged) or
   `{ component, label }`; when `label` is present render `<div class="section-label">{localize(label)}</div>`
   above the section using the mixin. Update the typedef.
3. `CharacterSheetSidebar` (and the NPC equivalent) passes `{ component: CharacterSheetRatings, label: 'ratings' }`,
   `{ component: CharacterSheetMods, label: 'mods' }`, `{ component: CharacterSheetSpeeds, label: 'speeds' }`;
   Portrait and Resources stay bare. Check `lang/en.json` for `ratings`/`mods`/`speeds` keys (add
   sentence-case `LOCAL`-style entries if missing, matching how sibling keys are declared — read the file's
   convention first).
4. Add `tests/e2e/character-sheet-layout.spec.js` (module-scoped page, `login`, `attachPageErrors`,
   `closeAllApps` in `afterEach`, delete its fixture actor in `afterAll`): create a player actor with two
   skills' training set non-zero, render the sheet, assert (a) the first `.skill` row's bounding height is
   < 56px, (b) the sidebar contains three `.section-label` elements whose computed `text-transform` is
   `uppercase` and whose text matches the three localized labels, (c) no page errors.
5. Lint, build, run the new spec plus `localization --reporter=line` (the sidebar labels must not
   introduce `LOCAL.` text). Commit: `feat: label the character sheet sidebar sections`.

## Task 3 — Spell card tradition guard (Pass 3)

Files: `src/document/types/item/types/spell/components/SpellStats.svelte`, `tests/e2e/item-cards.spec.js`.

1. Wrap the Tradition `StatTag` in `{#if tradition}` (mirror the XP-cost guard below it); fix the
   comment.
2. In `item-cards.spec.js` add a describe `spell card tradition tag`: create a world spell with an empty
   tradition, `sendToChat()`, locate the card in `#chat` by `data-message-id`, assert no `.tag` whose text
   starts with the localized "Tradition" label; update the spell's `system.tradition` to `'Air'`,
   `sendToChat()` again, assert the new card shows a tag containing `Tradition` and `Air`. Clean up the
   spell in `afterAll`.
3. Lint, build, run `npx playwright test item-cards --reporter=line`. Commit:
   `fix: hide the spell card tradition tag when the spell has none`.

## Task 4 — Secondary button for dismiss actions (Pass 4)

Files: `src/styles/Mixins/ButtonMixins.scss`, `src/helpers/svelte-components/button/Button.svelte`,
`src/check/dialog/CheckDialogBase.svelte`, `src/helpers/dialogs/ConfirmationDialogShell.svelte`,
`tests/e2e/component-probe.spec.js`.

1. Add `@mixin button-secondary` after `button` in `ButtonMixins.scss`: `@include button;` then
   `--titan-button-background: transparent; --titan-button-font-color: var(--titan-app-font-color);`
   (border colour stays `--titan-button-border-color`; hover inherits the button mixin's hover tokens).
   Verify against the mixin's `--titan-*` indirections that the override actually applies (the mixin sets
   `background: var(--titan-button-background)` so redefining the custom property is enough).
2. `Button.svelte`: add `secondary = false` to the props typedef and destructure; render
   `class:secondary={secondary}` on the `<button>`; style `button.secondary { @include button-secondary; }`.
3. `CheckDialogBase.svelte` Cancel → `<Button secondary …>`; `ConfirmationDialogShell.svelte` Cancel →
   `<Button secondary …>`. Grep for any other dialog shell with a Cancel `Button`
   (`grep -rln 'text="cancel"' src`) and convert those too.
4. `component-probe.spec.js` → Button describe: add `secondary renders a transparent fill` — mount `Button`
   with `{ text: 'Cancel', secondary: true, testId: 'probe-secondary' }` and a default one; read
   `getComputedStyle(button).backgroundColor` for both; assert the secondary is `rgba(0, 0, 0, 0)` and the
   default is not.
5. Lint (ESLint + stylelint), build, run `component-probe checks-dialog interaction-dialogs --reporter=line`.
   Commit: `feat: render dialog dismiss actions as secondary buttons`.

## Task 5 — Remember Effect Tray folder expansion (Pass 5)

Files: `src/system/SystemSettings.js`, `src/sidebar/tray/EffectTrayState.svelte.js`,
`tests/e2e/effect-tray.spec.js`.

1. Register client setting `effectTrayExpandedFolders` next to `effectTrayLastPack`: `config: false`,
   `scope: 'client'`, `type: Object`, `default: {}` (pack collection id → string[] of expanded folder ids).
2. `EffectTrayState`: after the folders of the selected pack load in `refresh()` (find where `this.folders`
   is assigned), initialize `expandedFolders` from the stored entry for `selectedPackId`; when the pack has
   no stored entry, expand every folder id and persist that. `toggleFolder` persists the new set under the
   current pack id (`game.settings.set`). Selecting another pack re-initializes from its own entry. Update
   the class doc comment listing `$state` fields.
3. `effect-tray.spec.js`: in the shipped-pack test, remove the expand-each-folder loop and assert the 17
   rows are visible immediately (first open expands all — clear the setting for `titan.effects` in the test's
   setup with `game.settings.set('titan', 'effectTrayExpandedFolders', {})` so the assertion is about the
   default); add a test that collapses `Actions` via `[data-testid="effect-tray-folder-toggle"]`, re-renders
   the tray (`ui.titanEffects.render(true)` after closing), reselects `titan.effects`, and asserts the
   `Actions` section has no rows while `Circumstances` still has rows. The Dodging apply test must still
   expand `Actions` if collapsed (keep its guard).
4. Lint, build, run `effect-tray --reporter=line`. Commit: `feat: remember Effect Tray folder expansion per pack`.

## Task 6 — Documentation

1. `docs/TODO.md`: delete `### 26.` and the "## UX/UI redesign" heading; if the file now has no items,
   leave only its header paragraph.
2. `titan-codebase` skill: skill row layout (`CharacterSheetSkill` single-row), `DocumentSheetSidebar`
   labelled sections + `section-label` mixin, `Button` `secondary`, `effectTrayExpandedFolders`, SpellStats
   guard. Grep the skill for `CharacterSheetSkill`, `DocumentSheetSidebar`, `Button.svelte`,
   `expandedFolders` and fix every stale sentence.
3. Commit: `docs: record the redesign surface passes`.

## Final verification (report these numbers)

`npx vitest run`, `npx eslint . --quiet`, `npx stylelint "src/**/*.{css,svelte}"`, `npm run build`, and every
e2e spec named above with pass counts. Also `git log --oneline` of your commits.
