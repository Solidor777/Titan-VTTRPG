# HUD Effects Panel + Action Menu Redesign Implementation Plan

> **For agentic workers:** This plan is executed mainline in-session via the
> `mainline-plan-execution` skill (project rule for Fable-class / long-context models),
> NOT subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.
> Each task ends with an inline enumerative spec-compliance check; one dispatched
> fresh-context review covers the whole branch at the end.

**Goal:** Reconcile the effects-panel WIP to the committed spec (bounded resizable
height + inner scroll, keeping the sub-panel rows) and add the action-menu vertical
anchoring, up/down sub-option flow setting, and refined-panels styling.

**Architecture:** Pure Svelte 5 (runes) mounted into Foundry v14 ApplicationV2, no
middleware. Two independent pieces of the Player HUD (`src/ui/player-hud/`) that share no
code and ship together: Part A is the effects panel; Part B is the action menu.

**Tech Stack:** Svelte 5 runes, SCSS (project panel mixins + CSS custom properties),
Playwright e2e against a live Foundry world.

**Spec:** `docs/superpowers/specs/2026-06-11-hud-effects-panel-and-action-menu-redesign-design.md`
(committed `9d31dbe8`).

**Resolved decision (this session):** Part A height behaviour = **bounded resizable
height + inner scroll** (follow spec), NOT the working-tree WIP's content-grow/width-only
resize. The WIP edits to `EffectsPanelElement.svelte`, `HudElementFrame.svelte`, and the
e2e scroll test are reverted; the WIP sub-panel-row / wrapped-controls / mount-retain
edits are kept.

## Global Constraints

- **Style authority:** `.claude/CLAUDE.md` — 120-col wrap; multi-line `{}` for conditionals;
  multi-line objects (>1 prop) and arrays (>1 entry); Svelte components with >1 prop
  multi-line with `>`/`/>` on their own line; every variable typed with a single-line
  comment; functions with multi-line `@param`/`@returns` docs; **`:global` selectors
  strictly forbidden**; perfect comment grammar; clean stale comments on contact.
- **No test/e2e code in shipping builds**; built artifacts go to `test/build/` (singular).
- **No dynamic imports** in shipping builds. **No stub fixes.**
- **Comment rules:** present-tense, what/why of current code only; no history, no plan/task
  references (a PreToolUse hook mechanically blocks violations).
- **Intra-project imports** use the `~/` alias (→ `src/`).
- **Docs:** every deferral → `docs/TODO.md`; every bug → `docs/OPEN_BUGS.md`; update the
  `titan-codebase` skill to current state as the required final step.
- **Theme has no dedicated accent token.** The action-menu accent defaults to
  `var(--titan-cyan)` (swappable later).

---

## File Structure

**Part A — effects panel (reconcile WIP to spec):**
- `src/ui/player-hud/elements/effects-panel/EffectsPanelElement.svelte` — restore the
  panel `style:height` and the `.body` bounded-scroll region.
- `src/ui/player-hud/HudElementFrame.svelte` — restore height in the resize drag and the
  `nwse-resize` cursor.
- `tests/e2e/player-hud-effects-panel.spec.js` — restore the inner-scroll assertion;
  strengthen the resize test to also assert height persists.
- *Unchanged (keep WIP):* `EffectsListRow.svelte`, `EffectsDetailBody.svelte`,
  `TitanPlayerHud.js`.

**Part B — action menu (new behaviour + styling):**
- `src/ui/player-hud/PlayerHudDefaults.js` — add `directions.vertical.subOptionsFlow: 'down'`.
- `src/ui/player-hud/settings/PlayerHudSettingsShell.svelte` — add the up/down flow
  `<select>` in the vertical branch.
- `lang/en.json` — add the `subOptionFlow` label key.
- `src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte` — measure the open
  category button's vertical offset+height; anchor the vertical flyout lane to it; pass
  `flow` to the flyout; add the accent edge-bar to the open category button.
- `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte` — apply up/down flow
  (reversed window + anchor side); pass the hovered key to the rows for highlight.
- `src/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte` — roomier padding;
  accent highlight when the row is the hovered/revealed one (icon already renders).

---

## Task A1: Reconcile the effects panel to the bounded-scroll spec

**Files:**
- Modify: `src/ui/player-hud/elements/effects-panel/EffectsPanelElement.svelte`
- Modify: `src/ui/player-hud/HudElementFrame.svelte`
- Test: `tests/e2e/player-hud-effects-panel.spec.js`

**Interfaces:**
- Consumes: `layoutState.effectsPanelSize` (`{ width, height }`, both `$state`, defaults
  `300 × 320`, persisted via `layoutState.persist()`).
- Produces: panel with fixed resizable width+height, pinned header, internally-scrolling
  `.body`; resize drag mutates both dimensions.

- [ ] **Step 1 — Restore the panel height binding.** In `EffectsPanelElement.svelte`, the
  root `<div class="effects-panel">` currently binds only `style:width`. Add the height
  bind back:

```svelte
<div
   class="effects-panel"
   style:width={`${layoutState.effectsPanelSize.width}px`}
   style:height={`${layoutState.effectsPanelSize.height}px`}
>
```

- [ ] **Step 2 — Restore the `.body` as a bounded scroll region.** Replace the WIP `.body`
  rule (which made it a content-sized `flex-column`) with the pinned-header scroll region.
  Header stays outside `.body`:

```scss
      .body {
         @include margin-top-standard;

         width: 100%;
         flex: 1;
         min-height: 0;
         overflow-y: auto;
      }
```

  (Delete the WIP comment "The body is a flexible column that grows with its effect
  rows…" — it now contradicts the code.)

- [ ] **Step 3 — Restore height in the resize drag.** In `HudElementFrame.svelte`
  `onResizeStart` → `onMove`, replace the width-only body with both axes and delete the
  "Width only…" comment:

```javascript
      const onMove = (move) => {
         layoutState.effectsPanelSize = {
            width: Math.max(180, start.width + (move.clientX - origin.x)),
            height: Math.max(120, start.height + (move.clientY - origin.y)),
         };
      };
```

- [ ] **Step 4 — Restore the resize-handle cursor.** In the `.resize-handle` SCSS rule,
  change `cursor: ew-resize;` back to `cursor: nwse-resize;`.

- [ ] **Step 5 — Restore the e2e inner-scroll assertion.** In
  `player-hud-effects-panel.spec.js`, revert the bulk-effects test to assert the body
  overflows into a scrollbar (rename it back, restore the comment + assertion):

```javascript
test('the panel body scrolls when content exceeds its size', async () => {
   const { actorId } = await seedPanelFixture(page);
   await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      /** @type {Array<object>} Bulk effect payloads to overflow the panel body. */
      const payloads = [];
      for (let index = 0; index < 12; index++) {
         const name = `HUD Bulk Effect ${index}`;
         if (!actor.effects.getName(name)) {
            payloads.push({ name, type: 'effect' });
         }
      }
      if (payloads.length > 0) {
         await actor.createEmbeddedDocuments('ActiveEffect', payloads);
      }
   }, actorId);

   await expect(page.locator('[data-testid="player-hud-effect-row"]')).toHaveCount(14);
   await expect.poll(
      () => page.evaluate(() => {
         const body = document.querySelector('[data-testid="player-hud-effects-panel"] [class*="body"]');
         return !!body && body.scrollHeight > body.clientHeight;
      }),
      { message: 'the panel body overflows into a scrollbar' },
   ).toBe(true);
});
```

- [ ] **Step 6 — Strengthen the resize test to assert height (spec acceptance: both axes).**
  In the `'an edit-mode resize persists the panel size'` test, after the existing width
  poll, add a height poll (the drag already moves `+40` on Y):

```javascript
   await expect.poll(
      () => page.evaluate(() => game.settings.get('titan', 'playerHudLayout').effectsPanelSize?.height),
      { message: 'the resized height persists to the layout setting' },
   ).toBe(before.height + 40);
```

- [ ] **Step 7 — Build, then run the effects-panel e2e file.**

Run: `npm run build`
Then (world must be launched by the user): `npm run test:e2e -- player-hud-effects-panel`
Expected: all effects-panel tests pass, including the restored scroll test and the
width+height resize persistence.

- [ ] **Step 8 — Spec-compliance check (Part A).** Confirm against spec §Part A acceptance:
  (1) with more effects than fit, the list scrolls inside the panel and the panel does not
  grow past its set height; (2) the handle resizes both width and height and the size
  persists; (3) expanding an effect grows only that sub-panel (kept WIP) and shifts those
  below it. Confirm `EffectsListRow.svelte`, `EffectsDetailBody.svelte`, and the
  `TitanPlayerHud.js` edit-mode mount-retain guard are untouched.

- [ ] **Step 9 — Commit.**

```bash
git add src/ui/player-hud/elements/effects-panel/EffectsPanelElement.svelte \
        src/ui/player-hud/HudElementFrame.svelte \
        tests/e2e/player-hud-effects-panel.spec.js
git commit -m "fix: restore bounded resizable height + inner scroll for HUD effects panel"
```

---

## Task B1: Add the `subOptionsFlow` setting (default + UI + i18n)

**Files:**
- Modify: `src/ui/player-hud/PlayerHudDefaults.js`
- Modify: `src/ui/player-hud/settings/PlayerHudSettingsShell.svelte`
- Modify: `lang/en.json`
- Test: `tests/e2e/` (settings persistence — see Step 5)

**Interfaces:**
- Produces: `options.actionMenu.directions.vertical.subOptionsFlow` ∈ `{'down','up'}`,
  default `'down'`. Consumed by Tasks B2/B3 to choose stacking direction.

- [ ] **Step 1 — Add the default.** In `PlayerHudDefaults.js`, the
  `directions.vertical` object gains `subOptionsFlow` (keep keys alphabetical with the
  existing `subButtons`/`subOptions`):

```javascript
            vertical: {
               subButtons: 'left',
               subOptions: 'left',
               subOptionsFlow: 'down',
            },
```

- [ ] **Step 2 — Add the i18n label.** In `lang/en.json`, add next to the expand keys:

```json
      "subOptionFlow.text": "Stack Direction",
```

- [ ] **Step 3 — Add the flow `<select>` in the vertical settings branch.** In
  `PlayerHudSettingsShell.svelte`, inside `{#if options.actionMenu.layout === 'vertical'}`,
  after the existing sub-option direction `<label>` (closes at line ~217), add a second
  control bound to the new field, reusing `expandDown`/`expandUp`:

```svelte
         <label>
            {localize('subOptionFlow')}
            <select
               bind:value={options.actionMenu.directions.vertical.subOptionsFlow}
               data-testid="player-hud-settings-menu-sub-options-flow"
               onchange={save}
            >
               <option value="down">{localize('expandDown')}</option>
               <option value="up">{localize('expandUp')}</option>
            </select>
         </label>
```

- [ ] **Step 4 — Build.** Run: `npm run build` — Expected: clean build, no Svelte/SCSS
  errors.

- [ ] **Step 5 — e2e: the flow setting persists.** Add a test to
  `tests/e2e/player-hud-settings.spec.js` (the settings spec; confirm its exact name and
  the open-settings helper it already uses, then follow that file's pattern) that opens
  the settings app, sets the new `player-hud-settings-menu-sub-options-flow` select to
  `up`, and polls
  `game.settings.get('titan','playerHudOptions').actionMenu.directions.vertical.subOptionsFlow`
  to equal `'up'`. Restore `playerHudOptions` to `{}` in cleanup.

Run (world launched): `npm run test:e2e -- player-hud-settings`
Expected: the new persistence test passes.

- [ ] **Step 6 — Commit.**

```bash
git add src/ui/player-hud/PlayerHudDefaults.js \
        src/ui/player-hud/settings/PlayerHudSettingsShell.svelte \
        lang/en.json tests/e2e/player-hud-settings.spec.js
git commit -m "feat: add vertical sub-option flow (up/down) setting to the HUD action menu"
```

---

## Task B2: Anchor the vertical flyout to the open category button

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte`

**Interfaces:**
- Consumes: `barEl` (the `.categories` element), `layoutState.openCategory`, `vertical`,
  `subOptionsSide`.
- Produces: a measured `activeTop` (the open category button's `offsetTop` within the
  bar) and `activeHeight`; the vertical flyout lane positioned so the button row anchors
  the first/last sub-option. Horizontal layout's `margin-left: activeOffset` is unchanged.

- [ ] **Step 1 — Measure the vertical anchor.** Add `$state` for the active button's top
  and height, measured in the same `$effect` that already measures `activeOffset`:

```svelte
   /** @type {number} The active category button's top offset within the bar (vertical alignment). */
   let activeTop = $state(0);

   /** @type {number} The active category button's height, anchoring the flyout's first row. */
   let activeHeight = $state(0);
```

```svelte
   $effect(() => {
      void layoutState.openCategory;
      /** @type {HTMLElement | null} The open category's button, if rendered. */
      const active = barEl?.querySelector('.active') ?? null;
      activeOffset = active?.offsetLeft ?? 0;
      activeTop = active?.offsetTop ?? 0;
      activeHeight = active?.offsetHeight ?? 0;
   });
```

- [ ] **Step 2 — Anchor the lane in the vertical layout.** Make `.action-menu.vertical`
  `position: relative` and the flyout lane absolutely positioned beside the category
  column on the configured side, offset by the measured button position. The flow is
  passed in Task B3; here, position the lane:
  - **flow down:** lane `top: activeTop` (first option aligns to the button's top).
  - **flow up:** lane `bottom: (column height − (activeTop + activeHeight))` so the lane's
    bottom aligns to the button's bottom and earlier options stack upward.

  Use the existing `subOptionsSide` (`'before'`→left, `'after'`→right) for the horizontal
  side and CSS custom properties for the offsets to keep the template declarative:

```svelte
   /** @type {boolean} Whether the vertical sub-options stack upward (first row on the button, rest above). */
   const flowUp = $derived(vertical && options.directions.vertical.subOptionsFlow === 'up');
```

```svelte
   {#if openCategory}
      {#key openCategory.key}
         <div
            class="flyout-lane"
            class:anchored={vertical}
            class:before={vertical && subOptionsSide === 'before'}
            class:after={vertical && subOptionsSide === 'after'}
            style:order={subOptionsSide === 'before' ? 0 : 2}
            style:margin-left={!vertical && activeOffset > 0 ? `${activeOffset}px` : null}
            style:--anchor-top={vertical && !flowUp ? `${activeTop}px` : null}
            style:--anchor-bottom={vertical && flowUp ? `${activeTop + activeHeight}px` : null}
         >
            <ActionMenuFlyout
               category={openCategory}
               windowSize={options.windowSize}
               {vertical}
               {flowUp}
               {subOptionsSide}
               {subButtonsSide}
               {onAction}
            />
         </div>
      {/key}
   {/if}
```

  SCSS — replace `&.vertical { align-items: flex-end; }` with the relative-anchored layout
  (the categories column keeps normal flow at the top of the relative container, so a
  button's `offsetTop` within the bar equals its top within `.action-menu`):

```scss
      &.vertical {
         @include flex-row;

         position: relative;
         align-items: flex-start;
      }

      .flyout-lane {
         flex-shrink: 0;

         &.anchored {
            position: absolute;

            &.before {
               right: calc(100% - var(--titan-spacing-standard));
            }

            &.after {
               left: calc(100% - var(--titan-spacing-standard));
            }
         }
      }
```

  The flyout lane's own top/bottom is set inside `ActionMenuFlyout` from the `--anchor-top`
  / `--anchor-bottom` custom properties (Step in Task B3), so an empty offset simply
  leaves the lane at the container edge.

- [ ] **Step 3 — Build + visual verify (mainline).** Run: `npm run build`. In the live
  world (user-launched), open the HUD in vertical layout, open a category with one
  sub-option and confirm it lands on the button row; open one with many and confirm the
  first aligns to the button.

- [ ] **Step 4 — Spec-compliance check.** Spec §Part B.1: first sub-option aligns to the
  open category button; single-sub-option case lands exactly on the button. Horizontal
  layout positioning unchanged.

- [ ] **Step 5 — Commit.**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte
git commit -m "feat: anchor the vertical action-menu flyout to the open category button"
```

---

## Task B3: Apply up/down flow in the flyout

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte`

**Interfaces:**
- Consumes: new prop `flowUp` (boolean) from `ActionMenuElement`; the `--anchor-top` /
  `--anchor-bottom` custom properties on the parent lane.
- Produces: rows rendered top-down (down) or bottom-up (up); the column anchored from the
  parent custom properties; scroll-window fades follow the flow direction.

- [ ] **Step 1 — Accept the `flowUp` prop.** Add to the `$props()` destructure and the
  typedef:

```svelte
 * @property {boolean} flowUp - Whether the vertical sub-options stack upward (reverse order, bottom-anchored).
```

```svelte
   const { category, windowSize, vertical, flowUp, subOptionsSide, subButtonsSide, onAction } = $props();
```

- [ ] **Step 2 — Reverse the visible window when flowing up.** The `visible` window stays
  the same slice; only render order reverses so the first logical option sits on the
  button (bottom-most when flowing up):

```svelte
   /** @type {Array<object>} The visible window in render order (reversed when stacking upward). */
   const rendered = $derived(flowUp ? [...visible].slice().reverse() : visible);
```

  Render `{#each rendered as sub, i (sub.key)}` instead of `visible`. Keep the
  `flyIn` stagger keyed off render index `i`.

- [ ] **Step 3 — Anchor the column from the parent custom properties.** On the
  `.sub-options` root, consume the lane offsets so the column's top (down) or bottom (up)
  aligns to the button. Because the lane is `position: absolute` (Task B2), set its
  vertical edge here:

```scss
   .sub-options {
      @include flex-column;
      @include flex-group-top;

      position: relative;
      gap: 2px;
      top: var(--anchor-top, auto);
      bottom: var(--anchor-bottom, auto);
   }
```

  (When the parent lane is absolutely positioned, `top`/`bottom` on the lane place it;
  pushing the offset onto `.sub-options` keeps the horizontal layout — where the props are
  null — unaffected.)

  > **Implementation note for the executor:** Steps B2/B3 split the offset between the lane
  > (`position: absolute`, horizontal side) and `.sub-options` (vertical edge). Verify in
  > the live world that the single-option case lands exactly on the button for BOTH flow
  > directions and BOTH sides; if the split mis-aligns, consolidate the `top`/`bottom`
  > onto the `.flyout-lane.anchored` rule in B2 and drop the `.sub-options` offsets here.
  > Pick whichever single approach aligns correctly — do not keep both.

- [ ] **Step 4 — Flow-direction fades.** The overflow fade spans (`.overflow.top` /
  `.overflow.bottom`) already mark hidden entries above/below the window; they remain
  correct regardless of flow because the window slice is unchanged. No change unless the
  reversed render visibly inverts them — verify in the live world and adjust only if wrong.

- [ ] **Step 5 — Build + visual verify.** Run: `npm run build`. In the live world, toggle
  the new Stack Direction setting between Down and Up and confirm the sub-options stack
  below vs. above the button, first option always on the button.

- [ ] **Step 6 — Spec-compliance check.** Spec §Part B.2: default down (first on button,
  rest below); up (first on button, rest above); persists per user (covered by B1's test).

- [ ] **Step 7 — Commit.**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte
git commit -m "feat: stack action-menu sub-options up or down per the flow setting"
```

---

## Task B4: Refined-panels styling (accent edge-bar, padding, hover highlight)

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte`
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte`
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte`

**Interfaces:**
- Consumes: `hoveredKey` (already tracked in `ActionMenuFlyout`); `subOptionsSide` for the
  edge-bar side.
- Produces: open category keeps `panel-3` plus an accent edge-bar on the flyout-facing
  side; sub-options have roomier padding; the hovered/revealed row gets the accent
  highlight (no permanent highlight on the anchored row).

- [ ] **Step 1 — Accent edge-bar on the open category button.** In `ActionMenuElement.svelte`
  the `button.active` rule keeps `@include panel-3`; add an accent edge-bar on the side
  facing the flyout. Pass the side via a class on the categories container or compute it
  per the existing `subOptionsSide`. Add to the `.active` rule:

```scss
            &.active {
               @include panel-3;

               position: relative;
               box-shadow: inset 0 0 0 1px transparent;
            }

            &.active::after {
               content: '';
               position: absolute;
               top: 0;
               bottom: 0;
               width: 2px;
               background: var(--titan-cyan);
            }
```

  Place the bar on the flyout-facing side: for `subOptionsSide === 'after'` set
  `right: 0`, for `'before'` set `left: 0`. Drive this with a `class:flyout-after` /
  `class:flyout-before` on the `.categories` container (derived from `subOptionsSide`) so
  the `::after` rule can select the correct edge. Horizontal layout: the bar sits on the
  top/bottom edge facing the flyout — derive from `subOptionsSide` the same way (the
  horizontal flyout opens up/down), using `left/right: 0; top|bottom: 0; height: 2px;
  width: auto;` for the horizontal orientation. Keep both orientations in one rule set
  gated by the existing `vertical` class on `.action-menu`.

- [ ] **Step 2 — Pass the hovered key to the rows.** In `ActionMenuFlyout.svelte`, pass
  whether each row is the revealed one to `ActionMenuSubOption`:

```svelte
      <ActionMenuSubOption
         {sub}
         categoryKey={category.key}
         active={sub.key === hoveredKey}
         flyIn={{ ...flyParams, delay: i * FLY_STAGGER }}
         {onAction}
         onreveal={reveal}
      />
```

- [ ] **Step 3 — Roomier padding + accent highlight in the sub-option.** In
  `ActionMenuSubOption.svelte` add the `active` prop (typedef + destructure, default
  `false`), apply it as a class, bump the vertical padding to ~6px, and accent the active
  row (the icon already renders):

```svelte
 * @property {boolean} [active] - Whether this row is the hovered/revealed one (accent highlight).
```

```svelte
   const { sub, categoryKey, active = false, flyIn = {}, onAction, onreveal } = $props();
```

```svelte
<button
   class="sub-option"
   class:active
   type="button"
   ...
>
```

```scss
   .sub-option {
      @include panel-2;
      @include flex-row;
      @include flex-group-left;
      @include font-size-small;

      width: 100%;
      gap: var(--titan-spacing-standard);
      padding: 6px var(--titan-spacing-standard);
      border: none;
      border-radius: var(--titan-border-radius);
      color: inherit;
      cursor: pointer;
      white-space: nowrap;

      &.active {
         @include panel-3;

         box-shadow: inset 2px 0 0 0 var(--titan-cyan);
      }

      img {
         width: 20px;
         height: 20px;
         object-fit: contain;
      }
   }
```

- [ ] **Step 4 — Build + visual verify.** Run: `npm run build`. In the live world: the
  open category shows the accent edge-bar on the flyout side; hovering/focusing a
  sub-option highlights that row with the accent and reveals its sub-buttons; no row is
  highlighted by default (the anchored first row is NOT permanently highlighted).

- [ ] **Step 5 — Spec-compliance check.** Spec §Part B.3 acceptance: open category accent
  edge-bar; hovered/focused sub-option gets the accent + reveals sub-buttons; no default
  highlight. Both layouts.

- [ ] **Step 6 — Commit.**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte \
        src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte \
        src/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte
git commit -m "feat: refined-panels styling for the HUD action menu (accent bar + hover highlight)"
```

---

## Task C1: Documentation (required final step)

**Files:**
- Modify: `.claude/skills/titan-codebase/references/*.md` (the file describing the player
  HUD / action menu / effects panel — locate via grep for `player-hud` / `action-menu`).
- Modify (only if applicable): `docs/TODO.md`, `docs/OPEN_BUGS.md` — log any deferral or
  bug discovered during execution (none anticipated).

- [ ] **Step 1 — Update `titan-codebase`.** Reflect the *current* state: effects panel is a
  fixed resizable width+height panel with a pinned header and an internally-scrolling
  `.body` of per-effect sub-panel rows; the action menu's vertical flyout anchors to the
  open category button, has a `directions.vertical.subOptionsFlow` (`down`/`up`) setting,
  and uses refined-panel styling (accent edge-bar on the open category, hover-driven
  accent highlight on sub-options).

- [ ] **Step 2 — Log deferrals/bugs if any arose.** If execution surfaced a deferral, add
  it to `docs/TODO.md`; if a bug, `docs/OPEN_BUGS.md`. Otherwise no change.

- [ ] **Step 3 — Commit.**

```bash
git add .claude/skills/titan-codebase docs/
git commit -m "docs: record HUD effects-panel scroll + action-menu vertical anchoring/flow state"
```

---

## Final review (after all tasks)

One dispatched fresh-context review over the full branch diff (per `mainline-plan-execution`):
verify spec coverage (both Parts A and B acceptance criteria), style-guide conformance,
no `:global`, no stale comments, and that the WIP reconciliation kept exactly the intended
sub-panel/wrapped-controls/mount-retain edits while reverting the height/scroll edits.

## Self-Review (plan vs. spec)

- **Spec coverage:** Part A reconcile → Task A1 (height + scroll + 2 e2e edits; sub-panel
  rows / wrapped controls / mount-retain kept as WIP, called out explicitly). Part B.1
  anchoring → B2. Part B.2 flow setting → B1 (plumbing) + B3 (behaviour). Part B.3 refined
  styling → B4. Docs → C1. No spec section is unmapped.
- **Placeholder scan:** the only open items are the explicitly-flagged live-world visual
  verifications (UI styling/anchoring cannot be unit-asserted) and the B3 offset-split
  reconciliation note, which instructs the executor to converge on a single approach — not
  a deferred TODO.
- **Type consistency:** `flowUp` (boolean) is produced in B2 and consumed in B3;
  `subOptionsFlow` (`'down'`/`'up'`) string is produced in B1 and read in B2/B3; `active`
  (boolean) is produced in B4's flyout and consumed in B4's sub-option. `activeTop` /
  `activeHeight` are local to B2. Names are consistent across tasks.
