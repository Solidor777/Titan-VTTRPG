# HUD Animation Polish + Theme Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate the action-menu sub-buttons, make a category always open with sub-buttons closed, give TITAN headers/text their own themed colors across every `.titan` surface, and make light-theme panels distinguishable from the background.

**Architecture:** Two areas. Action menu (#1 sub-button `in:fly`, #2 reveal gated on real pointer movement) in `ActionMenuFlyout.svelte`. Theme readability (#3 per-level header tokens + a `.titan` text-color override that wins by redefining Foundry's `--color-text-primary` on heading elements; plus adding the `titan` class everywhere; #4 retuned light-theme panel ramps).

**Tech Stack:** Pure Svelte 5 (runes) on Foundry v14 ApplicationV2; SCSS with `--titan-*` design tokens; Vitest (unit) + Playwright (e2e).

## Global Constraints

- Source lives in `src/`; intra-project imports use the `~/` Vite alias.
- No `:global` selectors in Svelte component `<style>` blocks (plain global stylesheets like `Global.scss` are exempt).
- 120-character wrap limit; multi-line `{}` for conditionals; multi-line objects/arrays with >1 entry.
- Variables typed with a single-line comment; functions get multi-line JSDoc (typed params + return).
- Clean stale comments on contact.
- Unit tests: `npm test` (vitest run). E2E: `npx playwright test <spec>` — **requires the Foundry world launched by the user**.
- Lint: `npm run stylelint` (SCSS/Svelte) and `npm run eslint` (JS). The branch base has pre-existing
  stylelint failures in unrelated files (spell/weapon sheets, a `Global.scss` `0.06em`); verify only that
  changed files add no new errors.
- Branch: `fix/hud-anim-and-theme-contrast` (already cut from `main`).

---

### Task 1: Per-level header color tokens

**Files:**
- Modify: `src/theme/ThemeTokenContract.js`
- Modify: `src/theme/themes/HeritageDark.js`, `HeritageLight.js`, `Macchiato.js`, `CleanNeutralLight.js`
- Modify: `lang/en.json`
- Test: `tests/unit/ThemeContract.test.js` (existing; enforces completeness)

**Interfaces:**
- Produces: theme tokens `--titan-header-1-font-color` … `--titan-header-6-font-color`; removes
  `--titan-heading-font-color`.

- [ ] **Step 1: Confirm the green baseline**

Run: `npm test -- tests/unit/ThemeContract.test.js`
Expected: PASS.

- [ ] **Step 2: Update the contract — drop heading-font-color, add a headers group**

In `src/theme/ThemeTokenContract.js`, remove `'heading-font-color'` from the `application` array and add
a new `headers` group immediately after `application`:

```javascript
   application: [
      'app-background', 'app-font-color', 'border-color', 'window-content-background',
      'content-link-font-color', 'editor-menu-color', 'scrollbar-color', 'scrollbar-gutter-color',
      'highlighted-background', 'highlighted-font-color', 'accent-color',
   ],
   headers: [
      'header-1-font-color', 'header-2-font-color', 'header-3-font-color',
      'header-4-font-color', 'header-5-font-color', 'header-6-font-color',
   ],
```

- [ ] **Step 3: Run the contract test to verify it fails**

Run: `npm test -- tests/unit/ThemeContract.test.js`
Expected: FAIL — each theme `defines exactly the contract tokens` fails (themes still carry
`heading-font-color` and lack the six header tokens).

- [ ] **Step 4: Update all four themes**

In each theme file, replace the single `'heading-font-color': '<value>',` line with six header lines, all
set to that theme's existing `app-font-color` value:

`HeritageDark.js` (app-font-color `#d8dbe8`):

```javascript
      'header-1-font-color': '#d8dbe8',
      'header-2-font-color': '#d8dbe8',
      'header-3-font-color': '#d8dbe8',
      'header-4-font-color': '#d8dbe8',
      'header-5-font-color': '#d8dbe8',
      'header-6-font-color': '#d8dbe8',
```

`HeritageLight.js` (app-font-color `#262626`): the same six lines with `#262626`.
`Macchiato.js` (app-font-color `#cad3f5`): the same six lines with `#cad3f5`.
`CleanNeutralLight.js` (app-font-color `#1f2430`): the same six lines with `#1f2430`.

- [ ] **Step 5: Run the contract test to verify it passes**

Run: `npm test -- tests/unit/ThemeContract.test.js`
Expected: PASS.

- [ ] **Step 6: Add the editor group label**

In `lang/en.json`, add the headers group label among the `themeGroup.*.text` entries (alphabetical,
between `themeGroup.fonts.text` and `themeGroup.inputs.text`):

```json
      "themeGroup.headers.text": "Headers",
```

- [ ] **Step 7: Commit**

```bash
git add src/theme/ThemeTokenContract.js src/theme/themes/ lang/en.json
git commit -m "feat: replace heading-font-color with per-level header tokens"
```

---

### Task 2: Apply TITAN text/header colors across `.titan` and the HUD

**Files:**
- Modify: `src/styles/Global.scss`

**Interfaces:**
- Consumes: `--titan-header-1-font-color` … `-6-` and `--titan-app-font-color` (Task 1 / existing).

- [ ] **Step 1: Replace the rich-text heading rule with the TITAN color rules**

In `src/styles/Global.scss`, replace the existing block:

```scss
// Rich-text headings read from the themed heading color so they stay legible on light themes and in
// the Player HUD, which renders outside the .titan themed text scope.
.rich-text :is(h1, h2, h3, h4, h5, h6) {
   color: var(--titan-heading-font-color);
}
```

with:

```scss
// TITAN surfaces use TITAN text colors instead of Foundry's --color-text-* (which track Foundry's
// color scheme and mismatch the active TITAN theme — e.g. light heading text on a TITAN light theme).
.titan {
   --color-text-primary: var(--titan-app-font-color);
   --color-text-secondary: var(--titan-app-font-color);
   --color-text-emphatic: var(--titan-app-font-color);
}

// Per-level heading color across TITAN surfaces (.titan) and the non-.titan Player HUD rich text.
// Setting --color-text-primary on the heading element itself makes Foundry's own
// `color: var(--color-text-primary)` heading rule resolve to our token regardless of that rule's
// specificity; the explicit `color` covers surfaces where Foundry does not paint the heading (the HUD).
@for $level from 1 through 6 {
   .titan h#{$level},
   .rich-text h#{$level} {
      color: var(--titan-header-#{$level}-font-color);

      --color-text-primary: var(--titan-header-#{$level}-font-color);
   }
}
```

- [ ] **Step 2: Verify the changed file adds no stylelint errors**

Run: `npx stylelint "src/styles/Global.scss"`
Expected: only the pre-existing `120:` `0.06em` `unit-disallowed-list` error (present on `main`); no new
errors from the added rules. If a new error appears (e.g. comment spacing), fix it with
`npx stylelint --fix "src/styles/Global.scss"` and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/styles/Global.scss
git commit -m "fix: theme TITAN header and body text across .titan surfaces and the HUD"
```

---

### Task 3: Every TITAN app and chat message carries the `titan` class

**Files:**
- Modify: `src/document/types/item/dialog/AddCustomTraitDialog.js`
- Modify: `src/document/types/item/dialog/EditCustomTraitDialog.js`
- Modify: any other TITAN `ApplicationV2`/`DialogV2` whose `classes` array lacks `'titan'` (audited in Step 1)

**Interfaces:**
- Produces: every TITAN application/dialog/chat element carries the base `titan` class, so the Task 2
  `.titan` rules reach them.

- [ ] **Step 1: Audit every `classes:` declaration in src**

Run: `npx rg -n "classes:\s*\[" src` (or use the Grep tool).
For each result whose array does NOT contain `'titan'`, that file needs the class added. Known gaps:
`AddCustomTraitDialog.js` (`['titan-add-custom-item-trait-dialog']`) and `EditCustomTraitDialog.js`
(`['titan-edit-custom-trait-dialog']`). Record the full list of files to edit before proceeding.

- [ ] **Step 2: Add `'titan'` to each gapped classes array**

In `AddCustomTraitDialog.js`:

```javascript
         classes: ['titan', 'titan-add-custom-item-trait-dialog'],
```

In `EditCustomTraitDialog.js`:

```javascript
         classes: ['titan', 'titan-edit-custom-trait-dialog'],
```

Apply the same edit (prepend `'titan'`) to every other gapped file found in Step 1.

- [ ] **Step 3: Verify the chat message element carries `titan`**

Read `src/document/types/chat-message/TitanChatMessage.js` (the `renderHTML` path). Confirm the rendered
message element carries the `titan` class (the chat CSS in `Global.scss` is scoped `.titan.chat-message`,
so it must). If it does not, add `titan` to the message element's class list in `renderHTML`. If it
already does, make no change and note it.

- [ ] **Step 4: Verify no `classes:` array is left without `'titan'`**

Run: `npx rg -n "classes:\s*\[" src`
Expected: every listed array contains `'titan'` (dialogs whose only purpose is a non-themed Foundry dialog
are not in scope, but all TITAN-rendered windows must carry it).

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "fix: ensure every TITAN app and chat message carries the titan class"
```

---

### Task 4: Sub-buttons swoosh in when revealed

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte`

**Interfaces:**
- Consumes: existing `subButtonsSide` ('before' | 'after'), `fly` is not yet imported here.

- [ ] **Step 1: Import `fly` and add the swoosh params**

In `ActionMenuFlyout.svelte`, add the import below the existing component imports:

```javascript
   import { fly } from 'svelte/transition';
```

Add these after the `subOptionAlign` derivation:

```javascript
   /** @type {number} The sub-button lane swoosh distance, in pixels. */
   const SUB_BUTTON_SWOOSH_DISTANCE = 24;

   /** @type {number} The sub-button lane swoosh duration, in milliseconds. */
   const SUB_BUTTON_SWOOSH_DURATION = 180;

   /**
    * @type {object} The sub-button lane entrance: a horizontal slide+fade emerging from the sub-option
    * toward the lane's side ('before' lane sits left → slides left from a positive offset; 'after' lane
    * sits right → slides right from a negative offset).
    */
   const subButtonFly = $derived({
      x: subButtonsSide === 'before' ? SUB_BUTTON_SWOOSH_DISTANCE : -SUB_BUTTON_SWOOSH_DISTANCE,
      duration: SUB_BUTTON_SWOOSH_DURATION,
   });
```

- [ ] **Step 2: Apply the transition to the sub-button lane**

In the `.sub-buttons-lane` div, add the transition (keep all existing attributes):

```svelte
      <div
         class="sub-buttons-lane"
         class:before={subButtonsSide === 'before'}
         class:after={subButtonsSide === 'after'}
         style:top={`${laneTop}px`}
         bind:clientHeight={laneHeight}
         in:fly={subButtonFly}
      >
```

- [ ] **Step 3: Verify stylelint, build**

Run: `npx stylelint "src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte"`
Expected: CLEAN.
Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 4: Run the action-menu e2e (world must be launched)**

Run: `npx playwright test tests/e2e/player-hud-action-menu.spec.js tests/e2e/player-hud-action-menu-layout.spec.js --reporter=line`
Expected: PASS (the reveal still works; only its entrance is animated).

- [ ] **Step 5: Commit**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte
git commit -m "feat: swoosh the action-menu sub-button lane in when revealed"
```

---

### Task 5: A category always opens with sub-buttons closed

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte`

**Interfaces:**
- Consumes: existing `reveal(sub, event)` and the `.sub-options` element (remounted per open category by
  the parent `{#key openCategory.key}`).

- [ ] **Step 1: Add the armed flag and gate `reveal`**

In `ActionMenuFlyout.svelte`, add the state near the other `$state` declarations:

```javascript
   /** @type {boolean} Whether a real pointer move has occurred since this flyout mounted; until then a
    * pointerenter fired by the flyout appearing under a stationary cursor must not reveal sub-buttons. */
   let armed = $state(false);
```

Change `reveal` to return early when not armed:

```javascript
   function reveal(sub, event) {
      if (!armed) {
         return;
      }
      hoveredKey = sub.key;
      hoveredOffset = event.currentTarget.offsetTop;
   }
```

- [ ] **Step 2: Arm on the first pointer move over the sub-options**

Add an `onpointermove` handler to the `.sub-options` div (keep its existing attributes):

```svelte
<div
   class="sub-options"
   data-testid="player-hud-flyout"
   bind:clientHeight={columnHeight}
   use:wheelScroll
   onpointermove={() => armed = true}
>
```

- [ ] **Step 3: Verify stylelint, build**

Run: `npx stylelint "src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte"`
Expected: CLEAN.
Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 4: Run the action-menu e2e (world must be launched)**

Run: `npx playwright test tests/e2e/player-hud-action-menu.spec.js --reporter=line`
Expected: PASS. Playwright's `.hover()` dispatches a pointer/mouse move before the boundary event, which
arms the flyout, so the reveal-driven sub-button tests still work. The "weapon sub-buttons send to chat
and open the sheet" test (which hovers a sub-option then clicks a sub-button) confirms reveal-after-move
still functions.

- [ ] **Step 5: Commit**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte
git commit -m "fix: open a HUD category with sub-buttons closed until the pointer moves"
```

---

### Task 6: Light-theme panel ramps

**Files:**
- Modify: `src/theme/themes/HeritageLight.js`
- Modify: `src/theme/themes/CleanNeutralLight.js`

**Interfaces:**
- Consumes: nothing new; adjusts existing background tokens.

- [ ] **Step 1: Step HeritageLight panels darker than the background**

In `HeritageLight.js`, set:

```javascript
      'app-background': '#fbfbfc',
      ...
      'window-content-background': '#fbfbfc',
      ...
      'panel-1-background': '#f0f1f4',
      'panel-1-color': '#262626',
      'panel-2-background': '#e6e8ec',
      'panel-2-color': '#262626',
      'panel-3-background': '#dadde2',
      'panel-3-color': '#262626',
```

(Change only the `*-background` values shown; leave each `panel-N-color` at `#262626`.)

- [ ] **Step 2: Step CleanNeutralLight panels darker than the background**

In `CleanNeutralLight.js`, set:

```javascript
      'panel-1-background': '#eef0f3',
      'panel-1-color': '#1f2430',
      'panel-2-background': '#e3e6ea',
      'panel-2-color': '#1f2430',
      'panel-3-background': '#d7dbe1',
      'panel-3-color': '#1f2430',
```

(Leave `app-background` at `#ffffff` and each `panel-N-color` at `#1f2430`.)

- [ ] **Step 3: Verify the contract test still passes**

Run: `npm test -- tests/unit/ThemeContract.test.js`
Expected: PASS (all values are valid 6-digit hex).

- [ ] **Step 4: Commit**

```bash
git add src/theme/themes/HeritageLight.js src/theme/themes/CleanNeutralLight.js
git commit -m "fix: step light-theme panels darker so they separate from the background"
```

---

### Task 7: Full verification

**Files:** none.

- [ ] **Step 1: Full unit suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Build and run all six player-HUD e2e specs (world must be launched)**

Run: `npm run build`
Then: `npx playwright test tests/e2e/player-hud-visibility.spec.js tests/e2e/player-hud-portrait.spec.js tests/e2e/player-hud-action-menu.spec.js tests/e2e/player-hud-action-menu-layout.spec.js tests/e2e/player-hud-effects-panel.spec.js tests/e2e/player-hud-layout.spec.js --reporter=line`
Expected: PASS.

- [ ] **Step 3: Lint changed files**

Run: `npm run eslint` (must be clean for the changed JS) and `npx stylelint "src/styles/Global.scss" "src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte"` (no new errors beyond the pre-existing `Global.scss` `0.06em`).

- [ ] **Step 4: Live verification in Foundry (manual)**

On **both** light themes (HeritageLight, CleanNeutralLight) and one dark theme:

1. #1: hover a sub-option — its sub-buttons swoosh in from the sub-option toward their side.
2. #2: open a category by clicking either side of its button — it always opens with sub-buttons closed;
   sub-buttons appear only after you move the pointer onto a sub-option.
3. #3: open the theme editor — the section `<h3>` headers are readable; open an actor sheet and a chat
   card and confirm headings + body text are readable; confirm HUD effect-description headings are
   readable.
4. #4: confirm the effects panel and action-menu buttons (panel surfaces) read as distinct from the
   background on both light themes.

- [ ] **Step 5: Commit any live-tuning adjustments**

If header tokens or panel ramps need nudging from Step 4, edit the relevant theme files, rebuild, re-check,
then:

```bash
git add src/theme/themes/
git commit -m "fix: tune light-theme header/panel values from live verification"
```

(Skip if no adjustment was needed.)

---

### Task 8: Documentation

**Files:**
- Modify: `docs/CLOSED_BUGS.md`
- Modify: `.claude/skills/titan-codebase/references/*.md`

- [ ] **Step 1: Record the closed issues**

Read `docs/CLOSED_BUGS.md` for format and the current highest number. Append entries for the four issues
(sub-button swoosh, category-open reveal fix, per-level header tokens / TITAN text theming, light-theme
panel separation). For the header entry, note it supersedes the partial CLOSED_BUGS #25 fix (the single
`heading-font-color` token is replaced by per-level tokens applied across all `.titan` surfaces).

- [ ] **Step 2: Update the titan-codebase skill**

In the appropriate `.claude/skills/titan-codebase/references/*.md` file(s), record (current state, not a
changelog): the per-level header tokens (`header-1..6-font-color`, `headers` group); the `.titan`
text-variable override pattern (redefining Foundry's `--color-text-*` so TITAN surfaces use TITAN colors,
and overriding `--color-text-primary` on heading elements per level); the invariant that every TITAN
app/dialog/chat element carries the base `titan` class; and the light-theme panel ramp (panels step
darker than the app background). Update the action-menu animation note to include the sub-button lane
swoosh and the pointer-move-gated reveal.

- [ ] **Step 3: Commit**

```bash
git add docs/CLOSED_BUGS.md .claude/skills/titan-codebase/
git commit -m "docs: close HUD animation and theme-contrast issues, update codebase skill"
```

---

## Self-Review notes

- **Spec coverage:** #1 → Task 4; #2 → Task 5; #3a (tokens) → Task 1; #3b (Global.scss) → Task 2;
  #3c (titan class) → Task 3; #4 → Task 6; docs → Task 8; verification → Task 7. All spec sections map.
- **Specificity:** the spec flagged the heading-color specificity as "verify live"; this plan removes the
  uncertainty by overriding `--color-text-primary` on the heading element (core's own rule then resolves
  to our token) plus a direct `color` for the HUD — robust regardless of core's selector. Live check
  remains in Task 7.
- **Type/name consistency:** token names `header-1-font-color`…`header-6-font-color` and the `headers`
  group are used identically in Tasks 1, 2, 8. `armed`, `subButtonFly` are local to Task 4/5.
