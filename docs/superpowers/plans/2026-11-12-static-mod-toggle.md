# Static Modifier Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A header button on the Character sheet shows or hides every static modifier input; the choice is saved per character in `flags.titan.showStaticMods` and defaults to hidden.

**Architecture:** One pure reader (`areStaticModsShown`) and one writer (`setStaticModsShown`) in `src/system/StaticMods.js`. The seven consumer components read the flag through the existing `'document'` `ReactiveDocument` bridge (`const showStaticMods = $derived(areStaticModsShown(document.data))`) and render their static input behind `{#if showStaticMods}`. Layout widths come from CSS custom properties that a class on the sheet root (sidebar width) and on the Skills tab (stat tracks, name column) change; no component is duplicated.

**Tech Stack:** Foundry VTT v14 (ApplicationV2, document flags), Svelte 5 runes, SCSS, Vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-11-12-static-mod-toggle-design.md`. Appearance reference: `docs/superpowers/specs/mockups/static-mod-layout-A.html` (the HIDDEN frame).

## Global Constraints

- Platform: Foundry VTT v14, ApplicationV2, Svelte 5 runes, SCSS. Svelte mounts directly to ApplicationV2; no middleware.
- Formatting: 120-character wrap; always multi-line `{}` for conditional scopes; objects with more than 1 property and arrays with more than 1 entry are multi-line; Svelte components with more than 1 property are multi-line with `>` or `/>` on a new line.
- Typing and docs: variables typed with a single-line comment; functions have a multi-line comment with typed parameters and return types.
- CSS: `:global` selectors are forbidden.
- Comments describe present code only: no history, task IDs, or plan references; plain `TODO:` for deferred technical work, each logged in docs/TODO.md.
- No dynamic imports in shipping builds; no test or e2e code in shipping builds (test code builds to test/build/).
- No migrations: a missing flag means hidden; do not add migration code or migration tests.
- Tests of document changes use documents made through real Foundry user flows and delete them when done; no checked-in records from the user's world; world settings may be set through the API; mid-test edits go through sheet and HUD controls.
- Every test wait on an already-loaded page is at most 1000 ms (expect.poll, waitForFunction, toPass, explicit timeouts); a longer wait is a defect to fix.
- Commit each logical work unit after local CI passes; push only at a full milestone.
- Do not delete files permanently; use `trash`.
- After modifying code, run `graphify update .`
- Debug artifacts go to debug/dumps/ and are deleted when resolved.

## Model/Effort directives

- Every task runs on `sdd-implementer` (Sonnet, medium effort). Do not pass `model` or `effort` on a dispatch.
- No Opus agents anywhere in this plan (user ruling 2026-10-07). A task that comes back BLOCKED escalates to `sdd-implementer-highthink` and then to the user, not to Opus.
- Reviews use `sdd-reviewer`; the whole-branch review uses `sdd-final-reviewer`.
- Tasks run serially: they share one working tree, one `dist/` and one Foundry server.

## Notes for the dispatcher

- Paste the Global Constraints block, the "Common commands" block and the "Project rules" block below into every implementer brief; implementers do not read this plan or any `CLAUDE.md`.
- The working tree holds the user's own uncommitted edits (`.claude/settings.local.json`, `src/spreadsheet/io/ApplyImport.js`, untracked spec files). A task stages only the files it names. Check `git status` and `git branch --show-current` before each commit.
- One stop-and-report rule for every task: when a measurement or a test result differs from what the task states, stop, report the measured value and the command, and make no workaround.

### Project rules (from the project `CLAUDE.md`)

- Variables are typed with a single-line descriptive comment; functions carry a multi-line comment with typed parameters and typed return values (async included).
- Always multi-line `{}` for conditional scopes; objects with more than 1 property and arrays with more than 1 entry are multi-line; Svelte components with more than 1 property are multi-line with `>` or `/>` on a new line.
- Comments state what the code does or why, in the present tense. Banned in comments: history ("previously", "replaced X"), task or plan references, notes to reviewers.
- Every user-visible string goes through `lang/en.json` under `LOCAL` (`localize('key')` reads `LOCAL.key.text`; a tooltip key such as `'foo.desc'` reads `LOCAL.foo.desc.text`).
- A CSS/layout change is verified by loading the real element in the live sheet and reading `getComputedStyle` or `getBoundingClientRect` (the e2e specs do this), never by reading the stylesheet.
- No `grep`, `sed` or heredocs in shell commands; use the Grep tool, Edit and Write.

### Common commands

Run from `C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan`.

- Unit, one file: `npx vitest run tests/unit/<File>.test.js`. Passing output ends with `Test Files  1 passed (1)`.
- Unit, all: `npm test`. Passing output has no `failed` in the `Test Files` and `Tests` lines.
- Lint: `npx eslint <paths>` (no output, exit 0 means clean) and `npx stylelint "<svelte paths>"` (no output, exit 0).
- Build: `npm run build`. Foundry serves the built `dist/`, so rebuild before every e2e run.
- E2E, one spec: `npm run test:e2e -- <spec-file-name-without-.spec.js>` from a foreground shell (a detached shell crashes Playwright workers on this machine). Passing output ends with `N passed` and no `failed`. The throttled wrapper passes the filter through to `playwright test`.
- E2E list: `npx playwright test --list` prints `Total: N tests in M files`.
- Graph: `graphify update .`

## Reactivity check (done while writing this plan)

Read: the flag is reactive on the existing bridge; no new reader is needed.

- `src/document/reactive/ReactiveDocument.svelte.js:188-191`: `get data()` calls the `createSubscriber` registration and returns the live document, so any `document.data.flags...` read inside a component or `$derived` subscribes.
- `ReactiveDocument.svelte.js:70-77` and `:150-152`: the subscriber registers `Hooks.on('update<DocumentName>')` and invalidates when the updated document's `uuid` equals the bridged document's `uuid`, unless the update ran with `options.diff === false`.
- `setFlag` is an ordinary Actor update (`updateActor` fires on the writing client and, from the server broadcast, on every other client), so a local or remote flag change re-runs every reader.
- The header buttons read the same bridge: `src/document/sheet/TitanDocumentSheet.js:213-222` mounts them with the `'document'` context set to the sheet bridge; the body gets it from `src/document/sheet/DocumentSheetShell.svelte:21`.
- Inferred, not yet measured: delivery to a second client and an unlinked token's synthetic actor. Task 6 measures both.

## Review Focus

Failure modes the design implies but no consumer task exercises directly; each has a pinning test in the task that owns the code.

1. A user who can see the sheet but not edit it (Observer): no button, yet the sheet follows the setting. Task 6.
2. A second client with the same sheet open while another client toggles: both sheets update with no reload. Task 6.
3. An unlinked token's sheet: the flag lives on the token's own actor and leaves the base actor's setting alone. Task 6.
4. An NPC sheet: it shares every consumer, so it gets the button and the layout. Task 2.
5. A stored flag that is not the boolean `true` (a string, a number, a missing scope): hidden. Task 1.
6. Row heights: toggling must not move the rows below it (the sidebar scroll tests depend on the sidebar height). Task 3.

## Open for user

These are decisions the design leaves open; the plan assumes the answer in bold and builds nothing extra for them.

1. **Locked compendium Actor.** The button shows for anyone with `isOwner` (the project's "can edit" test, as in `DocumentOwnerButton`). For an Actor inside a locked pack, `isOwner` can be true while core refuses the write, so the click raises core's notification and the flag stays unset. **Assumed: accept this.** The alternative is to hide the button when `document.data.pack` is locked.
2. **Row heights.** Mockup A does not state them. **Assumed: every sidebar row keeps its shown-state height**, so the sheet does not jump when the button is pressed and the existing "sidebar reaches its last section at 50-150% zoom" test keeps its premise (the sidebar overflows by 17px at 100% zoom). The mockup's Resource label row would be about 5px shorter.
3. **NPC sheets.** The NPC sheet extends the Character sheet and renders the same consumer components, so NPCs get the button and the compact layout. The design's non-goal "NPC-specific layouts" is read as "no separate NPC layout". **Assumed: yes.**
4. **Existing characters.** Every existing character becomes hidden on first open (the design's stated risk). No migration, as the design says.

## Decisions made in this plan (not stated in the design)

- Flag helper file: `src/system/StaticMods.js` (beside `Icons.js`, `ModBuckets.js`), so the flag path is written once.
- Button state is exposed as `aria-pressed` on the button, with a fixed `aria-label` (`Static Mods`), because the icon alone cannot be asserted as state by e2e and a toggle button's label should not change with its state. Tooltip text changes with the state.
- The hidden icon is `MOD_ICON` plus a new `SLASH_ICON` (`'fas fa-slash'`) in one FontAwesome stack, per mockup A's note.
- Each static input gets a `testId` of the form `sheet-<kind>-<key>-mod` (skills: `sheet-skill-<key>-training-mod` and `-expertise-mod`), following the existing `-base` / total ids. `DocumentIntegerInput` already forwards `testId`; this adds a `data-testid` attribute, no element.
- `isOwner` gates the button; it does not use the `TOKEN_CONFIGURE` permission that gates Edit Token.

## File structure

| File | Responsibility |
|---|---|
| `src/system/StaticMods.js` (create) | Flag scope/key constants, `areStaticModsShown`, `setStaticModsShown` |
| `src/system/Icons.js` (modify) | `SLASH_ICON` |
| `src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte` (modify) | The toggle button |
| `lang/en.json` (modify) | `staticMods`, `showStaticModsButton.desc`, `hideStaticModsButton.desc` |
| `.../character/sheet/sidebar/CharacterSheetResource.svelte`, `CharacterSheetRating.svelte`, `CharacterSheetMod.svelte`, `CharacterSheetSpeed.svelte` (modify) | Sidebar markup |
| `.../character/sheet/CharacterSheetBase.svelte` (modify) | Sidebar width class |
| `.../character/sheet/header/CharacterSheetAttribute.svelte`, `CharacterSheetResistance.svelte` (modify) | Header markup |
| `.../character/sheet/tabs/skills/CharacterSheetSkill.svelte`, `CharacterSheetSkillsTab.svelte`, `CharacterSheetSkillsHeader.svelte` (modify) | Skills markup, tracks, header labels |
| `tests/unit/StaticMods.test.js` (create) | Reader pins |
| `tests/e2e/static-mods-toggle.spec.js` (create) | Toggle behavior and geometry |
| `tests/e2e/flows.js` (modify) | `setStaticModsShown` helper; stale comment fix |
| `tests/e2e/sheet-layout-widths.spec.js` (modify) | Runs in both states |

(`...` is `src/document/types/actor/types/character`.)

## Hidden-state geometry (from mockup A)

| Property | Shown (today) | Hidden |
|---|---|---|
| Character sheet sidebar width (`--titan-sidebar-width`) | 208px | 184px |
| Skill stat cells (`--skill-stat-columns`) | `28px 10px 28px 10px 28px` | `28px 10px 28px` |
| Skill stat group width (`--skill-stat-width`) | 124px (`104px` + 4 gaps) | 76px (`66px` + 2 gaps) |
| Skill stat track (group + 21px divider) | 145px | 97px |
| Skill name column maximum (`--skill-name-max`) | 195px | 300px |
| Skill name column minimum, Attribute track | 165px, 121px | unchanged |
| Skill entry minimum width | 165 + 121 + 145 + 145 + 15 = 591px | 165 + 121 + 97 + 97 + 15 = 495px |
| Skills header sub-labels | Base, Mod, Total | Base, Total |

---

### Task 1: Flag reader and writer

**Files:**
- Create: `src/system/StaticMods.js`
- Create: `tests/unit/StaticMods.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (every later task imports these from `~/system/StaticMods.js`):
  - `export const STATIC_MODS_FLAG_SCOPE = 'titan'`
  - `export const STATIC_MODS_FLAG_KEY = 'showStaticMods'`
  - `export function areStaticModsShown(actor: foundry.documents.Actor | null | undefined): boolean` — true only when `actor.flags.titan.showStaticMods === true`; every other value, a missing scope and a missing actor are false.
  - `export async function setStaticModsShown(actor: foundry.documents.Actor, shown: boolean): Promise<foundry.documents.Actor>` — `actor.setFlag(STATIC_MODS_FLAG_SCOPE, STATIC_MODS_FLAG_KEY, shown)`.

- [ ] **Step 1: Write the failing unit test** in `tests/unit/StaticMods.test.js` (the reader works on given inputs, so plain objects are allowed; the writer changes a document and is covered by e2e in Task 2):

```js
describe('areStaticModsShown', () => {
   it('is false when the actor, its flags or the flag is missing', () => {
      expect(areStaticModsShown(undefined)).toBe(false);
      expect(areStaticModsShown(null)).toBe(false);
      expect(areStaticModsShown({})).toBe(false);
      expect(areStaticModsShown({ flags: {} })).toBe(false);
      expect(areStaticModsShown({ flags: { titan: {} } })).toBe(false);
   });

   it('is true only for the boolean true', () => {
      expect(areStaticModsShown({ flags: { titan: { showStaticMods: true } } })).toBe(true);
      expect(areStaticModsShown({ flags: { titan: { showStaticMods: false } } })).toBe(false);
   });

   it('is false for a stored value that is not a boolean', () => {
      for (const value of ['true', 1, {}, [], null]) {
         expect(areStaticModsShown({ flags: { titan: { showStaticMods: value } } }), String(value)).toBe(false);
      }
   });
});
```

- [ ] **Step 2: Run it to see it fail.** Run: `npx vitest run tests/unit/StaticMods.test.js`. Expected: FAIL (module `~/system/StaticMods.js` not found).
- [ ] **Step 3: Implement `src/system/StaticMods.js`** with the four exports above, JSDoc per the project rules. Read `flags` directly (as `TitanActor.js` reads `this.flags?.titan?.uuid`); do not use `getFlag`.
- [ ] **Step 4: Run it to see it pass.** Run: `npx vitest run tests/unit/StaticMods.test.js`. Expected: `Test Files  1 passed (1)`.
- [ ] **Step 5: Lint and commit.** `npx eslint src/system/StaticMods.js tests/unit/StaticMods.test.js` clean; `graphify update .`; `git add src/system/StaticMods.js tests/unit/StaticMods.test.js`; `git commit -m "feat(sheet): add the static mod visibility flag reader and writer"`.

---

### Task 2: Header button, icon, localization and its e2e tests

**Files:**
- Modify: `src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte`
- Modify: `src/system/Icons.js` (add `export const SLASH_ICON = 'fas fa-slash';` in alphabetical position)
- Modify: `lang/en.json`
- Modify: `tests/e2e/flows.js` (add `setStaticModsShown`)
- Create: `tests/e2e/static-mods-toggle.spec.js`

**Interfaces:**
- Consumes: `areStaticModsShown`, `setStaticModsShown` (Task 1); `MOD_ICON` (`src/system/Icons.js:46`); `document` context = the sheet's `ReactiveDocument` bridge (`getContext('document')`, already used in this component); `document.data.isOwner`.
- Produces:
  - A button with classes `header-control icon titan-header-button static-mods-button` in the window header, `aria-pressed` = `"true"` when shown and `"false"` when hidden, `aria-label` = `localize('staticMods')`. Rendered whenever `document.data.isOwner` is true, for Player and NPC sheets, linked or unlinked token or directory Actor; placed after the token buttons.
  - Shown: one `<i class={MOD_ICON}>`. Hidden: a `fa-stack` holding `<i class={MOD_ICON}>` and `<i class={SLASH_ICON}>`. The button has the same box (width and height within 1px) as `.edit-token-button` in both states.
  - Tooltip: `'hideStaticModsButton.desc'` while shown, `'showStaticModsButton.desc'` while hidden (via `tooltipAction`).
  - `en.json` keys under `LOCAL`: `staticMods.text` = `Static Mods`; `hideStaticModsButton.desc.text` = `<p>The <strong>Static Mod</strong> inputs are <strong>shown</strong>.</p><p>Click to <strong>hide</strong> them.</p>`; `showStaticModsButton.desc.text` = `<p>The <strong>Static Mod</strong> inputs are <strong>hidden</strong>.</p><p>Click to <strong>show</strong> them.</p>`. Insert each next to its alphabetical neighbours.
  - `export async function setStaticModsShown(sheet: Locator, shown: boolean): Promise<void>` in `tests/e2e/flows.js`: finds `sheet.locator('.window-header .static-mods-button')`, clicks it only when `aria-pressed` differs from `shown`, then asserts `aria-pressed` equals `String(shown)` (default 1000 ms expect timeout). Every later e2e task sets the state explicitly with it, because the state persists on shared actors.

- [ ] **Step 1: Write the failing e2e tests** in `tests/e2e/static-mods-toggle.spec.js`, structured like `tests/e2e/sheet-header.spec.js` (file-shared `page`, `login`, `attachPageErrors`, `closeAllApps` in `afterEach`, `test` and `expect` from `./harness.js`). Helper in the spec: `readFlag(page, uuid): Promise<boolean|undefined>` = `page.evaluate(async (uuid) => (await fromUuid(uuid)).flags.titan?.showStaticMods, uuid)`. Each test makes its own actor with `createActor(page, { name: 'E2E Static Mods <n>', type })`. Test names and assertions:

```js
test.describe('the Static Mods header button', () => {
   test('a new player starts hidden: pressed false, slashed icon, no flag stored', async () => {
      const sheet = await openSheetByUuid(page, uuid);
      const button = sheet.locator('.window-header .static-mods-button');
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button.locator('i.fa-plus-minus')).toHaveCount(1);
      await expect(button.locator('i.fa-slash')).toHaveCount(1);
      expect(await readFlag(page, uuid)).toBeUndefined();
   });

   test('pressing it shows the inputs: pressed true, slash gone, flag true, button as big as Edit Token', async () => {
      await setStaticModsShown(sheet, true);
      await expect(button.locator('i.fa-slash')).toHaveCount(0);
      await expect.poll(() => readFlag(page, uuid), { message: 'the flag is stored' }).toBe(true);
      // width and height of button vs sheet.locator('.window-header .edit-token-button') differ by at most 1px,
      // in this state and in the hidden state
   });

   test('the setting survives closing and reopening the sheet', async () => {
      // show, closeAllApps(page), reopen: aria-pressed is 'true'; hide, close, reopen: 'false' and flag is false
   });

   test('an NPC sheet has the same button and stores the same flag', async () => {
      // createActor type 'npc'; setStaticModsShown(sheet, true); flag true; aria-pressed 'true'
   });
});
```

- [ ] **Step 2: Build and run to see them fail.** Run: `npm run build` then `npm run test:e2e -- static-mods-toggle`. Expected: FAIL (the `.static-mods-button` locator finds nothing).
- [ ] **Step 3: Add `SLASH_ICON`, the three `en.json` keys and the button** in `ActorSheetHeaderButtons.svelte`. Click handler calls `setStaticModsShown(document.data, !shown)`; `shown` is `$derived(areStaticModsShown(document.data))`. Verify the stack looks right in the live header by measuring (the box-size assertion in Step 1); a stack that enlarges the button fails it.
- [ ] **Step 4: Add `setStaticModsShown` to `tests/e2e/flows.js`** with the signature above and a JSDoc block.- [ ] **Step 5: Build and run to see them pass.** Run: `npm run build` then `npm run test:e2e -- static-mods-toggle`. Expected: `4 passed`. Also run `npm run test:e2e -- sheet-header` (the existing header specs) and `npm run test:e2e -- surfaces` (it scans sheets and tooltips for `LOCAL.` text): both end with `passed` and no `failed`.
- [ ] **Step 6: Lint and commit.** `npx eslint src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte src/system/Icons.js tests/e2e/flows.js tests/e2e/static-mods-toggle.spec.js`; `npx stylelint "src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte"`; `npm test` (includes `LocalizationKeys.test.js`); `graphify update .`; stage exactly the five files above; `git commit -m "feat(sheet): add the Static Mods header button"`.

---

### Task 3: Sidebar consumers, sidebar width, and their tests

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/sidebar/CharacterSheetResource.svelte`
- Modify: `.../sidebar/CharacterSheetRating.svelte`
- Modify: `.../sidebar/CharacterSheetMod.svelte`
- Modify: `.../sidebar/CharacterSheetSpeed.svelte`
- Modify: `src/document/types/actor/types/character/sheet/CharacterSheetBase.svelte`
- Modify: `tests/e2e/sheet-layout-widths.spec.js` (the Resource tests and the sidebar overflow test)
- Modify: `tests/e2e/static-mods-toggle.spec.js` (add the sidebar describe block)

**Interfaces:**
- Consumes: `areStaticModsShown` (Task 1), `setStaticModsShown` e2e helper (Task 2), the `'document'` context.
- Produces (static input `testId`s, always present when the input is rendered): `sheet-resource-<stamina|resolve|wounds>-mod`, `sheet-rating-<rating>-mod`, `sheet-mod-<mod>-mod`, `sheet-speed-<speed>-mod`.

Hidden-state results, per mockup A (the `+`, the input and, where nothing is left to add, the `=` all leave the DOM; use `{#if showStaticMods}`):
- Resource: the label row keeps icon and centered label; no `+`, no static input. Value input, meter and max label unchanged.
- Rating and Mod: label (or Initiative button) and a lone total `ModifiableStatValueLabel`; no `+`, input or `=`.
- Speed: `[base input] = [total]`; no `+`, no static input.
- Every sidebar row (Resource label row, Rating, Mod, Speed) keeps the height it has in the shown state (give a Resource label row the input's height with a minimum height).
- `CharacterSheetBase.svelte`: the `.titan-sheet` root gets a class when hidden that sets `--titan-sidebar-width: 184px` (custom properties inherit into `DocumentSheetSidebar`, which already sizes itself from `var(--titan-sidebar-width)`; the item sheets' sidebars are not touched). Reads the flag with `$derived(areStaticModsShown(document.data))`.

- [ ] **Step 1: Write the failing tests** in the `sidebar` describe block of `tests/e2e/static-mods-toggle.spec.js` (imports `RESOURCES`, `RATINGS`, `MODS`, `SPEEDS` from `~/system/...`):

```js
test('hidden: no sidebar static mod input exists and every total is still shown', async () => {
   await setStaticModsShown(sheet, false);
   for (const id of sidebarModIds) {
      await expect(sheet.getByTestId(id), id).toHaveCount(0);
   }
   for (const id of sidebarTotalIds) {
      await expect(sheet.getByTestId(id), id).toBeVisible();
   }
});

test('shown: every sidebar static mod input exists (3 resources, 5 ratings, 1 mod, 5 speeds)', async () => {
   await setStaticModsShown(sheet, true);
   for (const id of sidebarModIds) {
      await expect(sheet.getByTestId(id), id).toHaveCount(1);
   }
   expect(sidebarModIds).toHaveLength(14);
});

test('the sidebar is 184px wide hidden and 208px shown', async () => {
   // width of `.titan-sheet > .sidebar > .sidebar` via getBoundingClientRect, rounded:
   // hidden -> 184, shown -> 208
});

test('toggling does not change any sidebar row height', async () => {
   // heights of `.titan-sheet > .sidebar .section` (and of each Resource/Rating/Mod/Speed container)
   // measured hidden then shown are equal within 1px
});

test('a typed static mod still counts while hidden', async () => {
   // shown: type 2 into sheet-rating-defense-mod (commitText); read the sheet-rating-defense total;
   // hidden: the total text is unchanged and the input is gone; actor system.rating.defense.mod.static is 2
});
```

  `sidebarTotalIds` = `sheet-resource-<r>-max`, `sheet-rating-<r>`, `sheet-mod-armor`, `sheet-speed-<s>`.
- [ ] **Step 2: Update `tests/e2e/sheet-layout-widths.spec.js`** so it passes in both states (the default is now hidden, so each test that needs a static input sets the state first):
  - "a two-digit value, maximum and static mod are not cut off": call `setStaticModsShown(sheet, true)` first and locate the static mod input with `sheet.getByTestId(`sheet-resource-${resource}-mod`)` (replacing `.row.first.side input`, at lines 126, 139 and 206 and 222). Add a sibling test "with the static mods hidden, a two-digit value and maximum are not cut off" that sets hidden and measures the current value input and the maximum label only.
  - "a Stamina of 120 is not cut off": same shown-state change.
  - "no Resource row overflows the sidebar horizontally": run it once per state (a `for` over `[true, false]` with the state set through `setStaticModsShown`).
- [ ] **Step 3: Build and run to see failures.** Run: `npm run build` then `npm run test:e2e -- static-mods-toggle` (the new sidebar tests fail: inputs still present) and `npm run test:e2e -- sheet-layout-widths` (the Resource tests fail: static input absent).
- [ ] **Step 4: Implement the four components and `CharacterSheetBase.svelte`** as the results above state, adding the `testId` to each static `DocumentIntegerInput`. Components keep their own flag read; no prop is added to any component.
- [ ] **Step 5: Build and run to see them pass.** Run: `npm run build`; `npm run test:e2e -- static-mods-toggle`, `npm run test:e2e -- sheet-layout-widths`, `npm run test:e2e -- character-sheet-layout` (its sidebar zoom test needs the sidebar to still overflow; if it fails, report the measured sidebar heights per state). Expected for all three: `passed`, no `failed`.
- [ ] **Step 6: Lint and commit.** `npx eslint` on the changed `.svelte` and `.js` files; `npx stylelint` on the changed `.svelte` files; `graphify update .`; stage the seven files; `git commit -m "feat(sheet): hide the sidebar static mod inputs and narrow the sidebar"`.

---

### Task 4: Header consumers (Attribute and Resistance) and their tests

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/header/CharacterSheetAttribute.svelte`
- Modify: `src/document/types/actor/types/character/sheet/header/CharacterSheetResistance.svelte`
- Modify: `tests/e2e/static-mods-toggle.spec.js` (add the header describe block)

**Interfaces:**
- Consumes: `areStaticModsShown` (Task 1), `setStaticModsShown` e2e helper (Task 2).
- Produces: `testId`s `sheet-attribute-<body|mind|soul>-mod` and `sheet-resistance-<reflexes|resilience|willpower>-mod` on the static inputs.

Hidden-state results: Attribute is `[base input] = [total]`; Resistance is `[base label] = [total]` (the base stays the read-only bordered label); the `+` and the static input leave the DOM. The check button keeps `width: 100%` of the space the stats leave, so each button grows by about 48px (the shown stats group is 124px, the hidden one 76px).

- [ ] **Step 1: Write the failing tests** (header describe block):

```js
test('hidden: the Attribute and Resistance static mod inputs are gone, totals and bases remain', async () => {
   await setStaticModsShown(sheet, false);
   for (const id of headerModIds) {
      await expect(sheet.getByTestId(id), id).toHaveCount(0);
   }
   for (const id of headerTotalIds) {
      await expect(sheet.getByTestId(id), id).toBeVisible();
   }
});

test('shown: all six header static mod inputs exist', async () => {
   await setStaticModsShown(sheet, true);
   for (const id of headerModIds) {
      await expect(sheet.getByTestId(id), id).toHaveCount(1);
   }
});

test('each header check button is wider hidden than shown', async () => {
   // widths of `.container:has(> .button > button.<attribute>) .button button` and
   // `.container[data-resistance="<r>"] .button button`, measured shown then hidden:
   // hiddenWidth - shownWidth > 40 for all six buttons
});
```

  `headerTotalIds` = `sheet-attribute-<a>` and `sheet-resistance-<r>`.
- [ ] **Step 2: Build and run to see them fail.** `npm run build`; `npm run test:e2e -- static-mods-toggle`. Expected: the three new tests fail.
- [ ] **Step 3: Implement both components** per the results above.
- [ ] **Step 4: Build and run to see them pass.** `npm run build`; `npm run test:e2e -- static-mods-toggle`; `npm run test:e2e -- linked-token-sync` (it types Attribute base values through `.stats input` `.first()`). Expected: `passed`, no `failed`.
- [ ] **Step 5: Lint and commit.** `npx eslint` and `npx stylelint` on the three files; `graphify update .`; `git commit -m "feat(sheet): hide the Attribute and Resistance static mod inputs"` with those three files staged.

---

### Task 5: Skills tab (rows, tracks, column header) and its tests

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte`
- Modify: `.../tabs/skills/CharacterSheetSkillsTab.svelte`
- Modify: `.../tabs/skills/CharacterSheetSkillsHeader.svelte`
- Modify: `tests/e2e/sheet-layout-widths.spec.js` (the Skills describe blocks)
- Modify: `tests/e2e/flows.js` (the comment above `setSkillTraining`'s locator, line ~2152)
- Modify: `tests/e2e/static-mods-toggle.spec.js` (add the skills describe block)

**Interfaces:**
- Consumes: `areStaticModsShown` (Task 1), `setStaticModsShown` e2e helper (Task 2), the existing custom properties `--skill-stat-columns`, `--skill-stat-width`, `--skill-name-max` defined on `.skill-tab` in `CharacterSheetSkillsTab.svelte`.
- Produces: `testId`s `sheet-skill-<skill>-training-mod` and `sheet-skill-<skill>-expertise-mod`.

Results:
- `CharacterSheetSkill.svelte`: hidden, each of the Training and Expertise groups is `[base input] = [total]` (the `+` and the static input leave the DOM; the stat grid then places `=` and the total in tracks 2 and 3 of `--skill-stat-columns`).
- `CharacterSheetSkillsTab.svelte`: reads the flag, and when hidden the `.skill-tab` element carries a class that sets `--skill-stat-columns: 28px 10px 28px`, `--skill-stat-width: calc(66px + 2 * var(--skill-stat-gap))` and `--skill-name-max: 300px`. The other derived properties (`--skill-stat-track`, `--skill-columns`, `--skill-row-min-width`) already compute from these, so the entry minimum width becomes 495px hidden and stays 591px shown.
- `CharacterSheetSkillsHeader.svelte`: hidden, each group's sub-labels are Base (grid column 1) and Total (grid column 3); the Mod label is not rendered. Shown, unchanged.
- Expected at the 900px sheet in the hidden state: the skill name column measures 300px. If it measures less, stop and report the measured available width; do not change 300.

- [ ] **Step 1: Write the failing tests** (skills describe block of `static-mods-toggle.spec.js`; open the Skills tab with `openSheetTab(page, 'Skills')`, which is lazy-mounted):

```js
test('hidden: no Training or Expertise mod input exists in any of the 18 skill rows, and the header has no Mod label', async () => {
   await setStaticModsShown(sheet, false);
   for (const skill of SKILLS) {
      await expect(sheet.getByTestId(`sheet-skill-${skill}-training-mod`), skill).toHaveCount(0);
      await expect(sheet.getByTestId(`sheet-skill-${skill}-expertise-mod`), skill).toHaveCount(0);
      await expect(sheet.getByTestId(`sheet-skill-${skill}-training`), skill).toBeVisible();
   }
   expect(await sheet.locator('.skill-tab .head-sub span').allTextContents())
      .toEqual(['Base', 'Total', 'Base', 'Total']);
});

test('shown: all 36 skill mod inputs exist and the header has Base, Mod and Total twice', async () => {
   await setStaticModsShown(sheet, true);
   // 36 `-mod` test ids found; head-sub texts ['Base','Mod','Total','Base','Mod','Total']
});

test('hidden skill geometry: name column 300, stat track 97, entry minimum 495', async () => {
   // hidden: `.skill-tab .head-name` width is 300; each `.skill .stats .stat` width is 97 - 21 (divider) = 76;
   // `.skill` computed min-width is '495px'
   // shown: 195, 124, '591px'
});
```

- [ ] **Step 2: Update the Skills tests in `tests/e2e/sheet-layout-widths.spec.js`** to run once per state. Use a table `{ shown: true, nameMax: 195, statTrack: 145, subLabels: [Base, Mod, Total, Base, Mod, Total], controls: 7 }` and `{ shown: false, nameMax: 300, statTrack: 97, subLabels: [Base, Total, Base, Total], controls: 5 }`, set the state with `setStaticModsShown` before each measurement, and derive `ENTRY_MIN_WIDTH` per state as `NAME_MIN + 121 + 2 * statTrack + 15`. Affected tests: "every skill sits on one line", "a very long skill name wraps inside its button" (`controlCentres` length is `controls`), "the header labels the columns" (sub-labels), "the entry has a minimum width and the skill name column stays within its bounds" (`NAME_MAX` per state), and "a wider sheet leaves its extra room after the columns". Keep the "restores the localized name" `finally` block.
- [ ] **Step 3: Update the comment in `tests/e2e/flows.js` above the Skill row locator in `setSkillTraining`** to say the row's first stat is Training and its first input is the base value (the static modifier input may be absent).
- [ ] **Step 4: Build and run to see failures.** `npm run build`; `npm run test:e2e -- static-mods-toggle`; `npm run test:e2e -- sheet-layout-widths`. Expected: the new and updated Skills tests fail on the old geometry.
- [ ] **Step 5: Implement the three components** per the results.
- [ ] **Step 6: Build and run to see them pass.** `npm run build`; `npm run test:e2e -- static-mods-toggle`, `npm run test:e2e -- sheet-layout-widths`, `npm run test:e2e -- character-sheet-layout`, `npm run test:e2e -- rules-element-stats` (it types Training and Speed base values by test id). Expected: `passed`, no `failed`.
- [ ] **Step 7: Lint and commit.** `npx eslint` and `npx stylelint` on the changed files; `graphify update .`; stage the six files; `git commit -m "feat(sheet): hide the skill static mod inputs and widen the skill name column"`.

---

### Task 6: Permission, second-client and unlinked-token behavior

**Files:**
- Modify: `tests/e2e/static-mods-toggle.spec.js`

**Interfaces:**
- Consumes: the finished feature (Tasks 1-5); `withClients(browser, { player: 'E2E Player 1' }, fn)` from `tests/e2e/multiClient.js`; `setOwnership(page, actorId, userName, level)`, `createActor`, `placeToken`, `unlinkPlacedToken`, `viewScene`, `shared(page, 'scene')` from `tests/e2e/flows.js`; `openSheetByUuid` from `tests/e2e/fixtures.js`. The two-client pattern and the wait for the player's client to hold an ownership level are in `tests/e2e/ownership.spec.js` (`giveLevel`, `waitForFunction` with `timeout: 1000`).
- Produces: nothing later tasks use. Only the spec file changes; if a test finds a defect in the feature, stop and report it (the rule in the dispatcher notes).

- [ ] **Step 1: Write the tests** (they pass on the finished feature; they are written last because they need every consumer):

```js
test.describe('who sees and uses the button', () => {
   test('an Observer sees the effect but no button; an Owner sees the button; a toggle reaches the other client', async ({ browser }) => {
      // GM page `page`: createActor player, setOwnership(page, actorId, 'E2E Player 1', 'OBSERVER');
      // player's client holds OBSERVER (waitForFunction, timeout 1000).
      // withClients: player opens the sheet.
      //   expect(playerSheet.locator('.window-header .static-mods-button')).toHaveCount(0)
      //   GM: setStaticModsShown(gmSheet, true)
      //   player: sheet-rating-defense-mod toBeVisible() and toBeDisabled()   (effect follows, no reload)
      // GM gives OWNER: the player's header button appears (toHaveCount(1)); the player presses it:
      //   setStaticModsShown(playerSheet, false) -> gmSheet button aria-pressed 'false' and
      //   gmSheet.getByTestId('sheet-rating-defense-mod') toHaveCount(0) with no reload.
   });
});

test.describe('an unlinked token', () => {
   test('its sheet keeps its own setting and leaves the base actor alone', async () => {
      // createActor player on the shared scene, placeToken, unlinkPlacedToken (as sheet-header.spec.js does);
      // open the token actor's sheet via `(await fromUuid(tokenUuid)).actor.uuid` and the base sheet `Actor.<id>`;
      // setStaticModsShown(tokenSheet, true);
      // token actor flags.titan.showStaticMods === true, base actor flag undefined,
      // baseSheet button aria-pressed 'false', tokenSheet 'true'.
   });
});
```

- [ ] **Step 2: Run them.** `npm run build`; `npm run test:e2e -- static-mods-toggle`. Expected: all tests in the file pass (`passed`, no `failed`).
- [ ] **Step 3: Lint and commit.** `npx eslint tests/e2e/static-mods-toggle.spec.js`; `graphify update .`; `git add tests/e2e/static-mods-toggle.spec.js`; `git commit -m "test(sheet): pin the static mod toggle for observers, a second client and unlinked tokens"`.

---

### Task 7: Regression run, first half of the e2e suite

**Files:** only spec files that fail because they expect a static input, and `docs/OPEN_BUGS.md` for any unrelated defect found.

**Interfaces:**
- Consumes: the finished feature. The default changed from shown to hidden for every character, so a spec that reads or types a static mod input (no spec found so far does, except `sheet-layout-widths`, handled in Tasks 3 and 5) fails until it turns the state on with `setStaticModsShown(sheet, true)` from `tests/e2e/flows.js`.
- Produces: a list in the report of every spec file run and its result.

- [ ] **Step 1: Build.** `npm run build`.
- [ ] **Step 2: Run every spec file in `tests/e2e/` whose name starts with `a` to `g`** (`npx playwright test --list` shows the files), one or a few files per command so that each command finishes inside one tool call: `npm run test:e2e -- <spec-name> [<spec-name> ...]`. Expected: each ends with `passed` and no `failed`. Run every file in the range, including `character-sheet-layout`, `character-sheet-rows`, `chat-cards` and `compendium-content`, even if an earlier task ran it.
- [ ] **Step 3: For a failure,** read the failing assertion. If it fails because a static input is now absent, add `await setStaticModsShown(sheet, true)` before it (the state is set through the header button, never by writing the flag). Any other failure: stop and report it with the test name and message; log a real defect in `docs/OPEN_BUGS.md`.
- [ ] **Step 4: Commit** any spec edits: `git commit -m "test(e2e): turn on the static mod inputs where a spec edits them"` with only those files staged. No edits means no commit.

---

### Task 8: Regression run, second half of the e2e suite

**Files:** as Task 7.

**Interfaces:** as Task 7.

- [ ] **Step 1: Build.** `npm run build`.
- [ ] **Step 2: Run every spec file in `tests/e2e/` whose name starts with `h` to `z`,** including `static-mods-toggle`, `sheet-layout-widths`, and the three specs in `tests/e2e/logic/`, in commands that each finish inside one tool call. Expected: each ends with `passed` and no `failed`.
- [ ] **Step 3: Handle failures** exactly as Task 7 Step 3.
- [ ] **Step 4: Run the unit suite.** `npm test`. Expected: no `failed` in the `Test Files` and `Tests` lines.
- [ ] **Step 5: Commit** any spec edits as in Task 7 Step 4.

---

### Task 9: Documentation (last task)

**Files:**
- Modify: `.claude/skills/titan-codebase/references/data-flow.md`
- Modify: `.claude/skills/titan-codebase/references/architecture.md`
- Modify: `.claude/skills/titan-codebase/references/conventions.md`
- Modify (only if something was deferred or found): `docs/TODO.md`, `docs/OPEN_BUGS.md`, `docs/POST_WORK_FINDINGS.md`

**Interfaces:**
- Consumes: the finished code and the measured counts.
- Produces: the `titan-codebase` skill matching the code. The skill describes the current state, not a changelog.

- [ ] **Step 1: Measure the counts.** `npm test` (files and tests) and `npx playwright test --list` (`Total: N tests in M files`).
- [ ] **Step 2: Update `data-flow.md`.** In "Sheet render lifecycle" step 4 (the Skills row paragraph): the name track is `minmax(165px, 195px)` shown and `minmax(165px, 300px)` hidden; the stat group is 124px shown and 76px hidden; the header sub-labels are Base / Mod / Total shown and Base / Total hidden; the sidebar is 208px shown and 184px hidden (`--titan-sidebar-width` set on the `.titan-sheet` root). Add one paragraph: `flags.titan.showStaticMods` (boolean; missing means hidden) is read with `areStaticModsShown(document.data)` in the seven consumers, which render their static input behind `{#if}`; the Static Mods button in `ActorSheetHeaderButtons.svelte` (shown when `isOwner`, `aria-pressed` carries the state) writes it with `setStaticModsShown`; the flag is reactive through `ReactiveDocument` because a flag write is an Actor update.
- [ ] **Step 3: Update `architecture.md`.** Add `StaticMods.js` to the `src/system/` list (near line 95).
- [ ] **Step 4: Update `conventions.md`.** Replace the unit and e2e counts and the "The 68 spec files" heading with the measured numbers; add `static-mods-toggle.spec.js` to the sheets list with one sentence; extend the `sheet-layout-widths.spec.js` sentence to say it measures both states; add the `-mod` test id names to the `data-testid` convention paragraph.
- [ ] **Step 5: Tracking files.** `docs/TODO.md` gets an entry only for work deferred during execution (for example, the locked compendium Actor question if the user defers it); `docs/OPEN_BUGS.md` gets any defect Tasks 6-8 found; `docs/POST_WORK_FINDINGS.md` gets any anomaly. Delete nothing that is not completed. If none of the three applies, change none.
- [ ] **Step 6: Commit.** `graphify update .`; stage the changed docs and skill files; `git commit -m "docs: record the static mod toggle in the codebase skill"`. In the final message list one line per skill entry added or changed.
