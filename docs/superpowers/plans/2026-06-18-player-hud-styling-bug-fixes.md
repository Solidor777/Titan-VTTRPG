# Player HUD Styling Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five reported Player HUD visual defects (effect-row clip, sub-option width, themed button text, light-mode heading color, minimize-chip overlap) plus the undefined `--titan-cyan` accent, by routing every HUD button through one themed `HudButton` component and adding two themed tokens.

**Architecture:** A new parameterized `HudButton.svelte` defines every box/text property from `--titan-button-*` tokens via the existing `@include button` mixin (overriding tokens per variant), so Foundry core button styling cannot leak in. All HUD buttons route through it. Two new theme tokens (`heading-font-color`, `accent-color`) are added to the contract and all four built-in themes; rich-text headings and the flyout accent consume them.

**Tech Stack:** Pure Svelte 5 (runes) on Foundry v14 ApplicationV2; SCSS with `--titan-*` design tokens; Vitest (unit) + Playwright (e2e).

## Global Constraints

- Source lives in `src/`; intra-project imports use the `~/` Vite alias.
- No `:global` selectors in Svelte component `<style>` blocks (plain global stylesheets like `Global.scss` are exempt).
- 120-character wrap limit; multi-line `{}` for conditionals; multi-line objects/arrays with >1 entry.
- Svelte components with >1 prop are multi-line with `>` / `/>` on their own line.
- Variables typed with a single-line comment; functions get multi-line JSDoc (typed params + return).
- Clean stale comments on contact.
- Every HUD button must keep its current `data-testid` and `.active` semantics (e2e selectors depend on them).
- Unit tests: `npm test` (vitest run). E2E: `npx playwright test <spec>` — **requires the Foundry world to be launched by the user**; e2e is world-launch-gated.
- Lint: `npm run stylelint` (SCSS/Svelte) and `npm run eslint` (JS) must pass.
- Branch: `fix/player-hud-styling` (already cut from `main`).

---

### Task 1: Add `heading-font-color` and `accent-color` theme tokens

**Files:**
- Modify: `src/theme/ThemeTokenContract.js` (the `application` group in `THEME_TOKEN_GROUPS`)
- Modify: `src/theme/themes/HeritageDark.js`
- Modify: `src/theme/themes/HeritageLight.js`
- Modify: `src/theme/themes/Macchiato.js`
- Modify: `src/theme/themes/CleanNeutralLight.js`
- Test: `tests/unit/ThemeContract.test.js` (existing; enforces completeness, no edit required)

**Interfaces:**
- Produces: theme tokens `--titan-heading-font-color` and `--titan-accent-color`, resolvable wherever `--titan-*` tokens apply (injected at `:root` by `ThemeManager`).

- [ ] **Step 1: Run the contract test to confirm the current green baseline**

Run: `npm test -- tests/unit/ThemeContract.test.js`
Expected: PASS (all themes currently define exactly the contract tokens).

- [ ] **Step 2: Add the two tokens to the contract's `application` group**

In `src/theme/ThemeTokenContract.js`, extend the `application` array (append the two token names):

```javascript
   application: [
      'app-background', 'app-font-color', 'border-color', 'window-content-background',
      'content-link-font-color', 'editor-menu-color', 'scrollbar-color', 'scrollbar-gutter-color',
      'highlighted-background', 'highlighted-font-color', 'heading-font-color', 'accent-color',
   ],
```

- [ ] **Step 3: Run the contract test to verify it now fails**

Run: `npm test -- tests/unit/ThemeContract.test.js`
Expected: FAIL — `built-in theme <id> › defines exactly the contract tokens` fails for all four themes (they lack the two new tokens).

- [ ] **Step 4: Add token values to all four built-in themes**

Add these two lines to the `tokens` object of each theme (place them right after the existing
`highlighted-font-color` line so the diff stays readable). Use the per-theme values below.

`src/theme/themes/CleanNeutralLight.js` (light — dark heading text, indigo accent matching its buttons):

```javascript
      'heading-font-color': '#1f2430',
      'accent-color': '#3730a3',
```

`src/theme/themes/HeritageLight.js` (light): use this theme's existing `app-font-color` value for
`heading-font-color`, and its existing `label-font-color` value for `accent-color`. Read the file and
copy those two hex values verbatim into the two new lines.

`src/theme/themes/HeritageDark.js` (dark): use this theme's existing `app-font-color` value for
`heading-font-color`, and its existing `content-link-font-color` value for `accent-color`. Copy verbatim.

`src/theme/themes/Macchiato.js` (dark): use this theme's existing `app-font-color` value for
`heading-font-color`, and its existing `content-link-font-color` value for `accent-color`. Copy verbatim.

(Reusing an existing in-theme hex guarantees a readable, on-palette value; `CleanNeutralLight` gets
explicit values because its accent identity is the indigo button tint.)

- [ ] **Step 5: Run the contract test to verify it passes**

Run: `npm test -- tests/unit/ThemeContract.test.js`
Expected: PASS — every theme again defines exactly the contract tokens, and both new tokens are valid
6-digit hex.

- [ ] **Step 6: Commit**

```bash
git add src/theme/ThemeTokenContract.js src/theme/themes/
git commit -m "feat: add heading-font-color and accent-color theme tokens"
```

---

### Task 2: Color rich-text headings from the new token

**Files:**
- Modify: `src/styles/Global.scss`

**Interfaces:**
- Consumes: `--titan-heading-font-color` (Task 1).

- [ ] **Step 1: Add the heading color rule to the global stylesheet**

In `src/styles/Global.scss`, after the `.titan` block (top-level, not nested), add:

```scss
// Rich-text headings read from the themed heading color so they stay legible on light themes and in
// the Player HUD, which renders outside the .titan themed text scope.
.rich-text :is(h1, h2, h3, h4, h5, h6) {
   color: var(--titan-heading-font-color);
}
```

- [ ] **Step 2: Verify stylelint passes**

Run: `npm run stylelint`
Expected: PASS (no `:global`, valid SCSS).

- [ ] **Step 3: Commit**

```bash
git add src/styles/Global.scss
git commit -m "fix: theme rich-text heading color for light mode and the HUD"
```

---

### Task 3: Create the `HudButton` component

**Files:**
- Create: `src/helpers/svelte-components/button/HudButton.svelte`

**Interfaces:**
- Produces: `HudButton` component with props
  `{ variant: 'category'|'sub-option'|'sub-button'|'chip'|'restore'|'ghost', active?: boolean, accentEdge?: 'top'|'right'|'bottom'|'left'|undefined, disabled?: boolean, type?: string, ariaLabel?: string, testId?: string, flyIn?: object, element?: HTMLElement (bindable), onclick?: function, children: Snippet, ...rest }`.
  Renders a single `<button>` carrying `class="hud-button <variant>"`, `class:active`, `data-testid={testId}`, and any spread `...rest` (e.g. `onpointerenter`, `onfocus`). When `flyIn` is set, the button plays an `in:fly` entrance. When `active` and `accentEdge` are set, an accent bar is drawn on that edge.

- [ ] **Step 1: Write the component**

Create `src/helpers/svelte-components/button/HudButton.svelte`:

```svelte
<script>
   import { fly } from 'svelte/transition';

   /**
    * @typedef {object} HudButtonProps
    * @property {'category' | 'sub-option' | 'sub-button' | 'chip' | 'restore' | 'ghost'} [variant] - Visual variant selecting the panel surface, padding, and alignment.
    * @property {boolean} [active] - Whether the button is in its open/revealed state (panel-3 surface plus the `active` class).
    * @property {'top' | 'right' | 'bottom' | 'left' | undefined} [accentEdge] - The edge to draw the accent bar on when active; omitted for no accent.
    * @property {boolean} [disabled] - Whether the button is disabled.
    * @property {string} [type] - The native button type.
    * @property {string | undefined} [ariaLabel] - The accessible label.
    * @property {string | undefined} [testId] - Stable selector applied as `data-testid`.
    * @property {object | undefined} [flyIn] - `svelte/transition` fly parameters for the entrance; applied only when present.
    * @property {HTMLElement | undefined} [element] - Bindable reference to the underlying button element.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - The click handler.
    * @property {import('svelte').Snippet} children - The button content.
    */

   /** @type {HudButtonProps} */
   let {
      variant = 'category',
      active = false,
      accentEdge = undefined,
      disabled = false,
      type = 'button',
      ariaLabel = undefined,
      testId = undefined,
      flyIn = undefined,
      element = $bindable(undefined),
      onclick = undefined,
      children,
      ...rest
   } = $props();
</script>

{#if flyIn}
   <button
      bind:this={element}
      class={`hud-button ${variant}`}
      class:active
      class:accent-top={accentEdge === 'top'}
      class:accent-right={accentEdge === 'right'}
      class:accent-bottom={accentEdge === 'bottom'}
      class:accent-left={accentEdge === 'left'}
      {type}
      {disabled}
      aria-label={ariaLabel}
      data-testid={testId}
      in:fly={flyIn}
      {onclick}
      {...rest}
   >
      {@render children()}
   </button>
{:else}
   <button
      bind:this={element}
      class={`hud-button ${variant}`}
      class:active
      class:accent-top={accentEdge === 'top'}
      class:accent-right={accentEdge === 'right'}
      class:accent-bottom={accentEdge === 'bottom'}
      class:accent-left={accentEdge === 'left'}
      {type}
      {disabled}
      aria-label={ariaLabel}
      data-testid={testId}
      {onclick}
      {...rest}
   >
      {@render children()}
   </button>
{/if}

<style lang="scss">
   // Every box/text property is defined from --titan-button-* tokens via @include button, so Foundry
   // core button styling cannot leak in. Variants override the tokens for each HUD surface; content
   // sizes the box (no forced min-height/line-height), which keeps tall content from clipping.
   .hud-button {
      @include button;

      // Release the mixin's fixed box so content drives height; the mixin derives min-height from
      // --titan-button-height, so a single override frees both.
      --titan-button-height: auto;
      --titan-button-line-height: normal;
      --titan-button-border-width: 0;
      --titan-button-font-size: var(--titan-font-size-small);
      --titan-button-font-weight: normal;
      // Standard panel radius. A literal is required: @include button remaps --titan-border-radius onto
      // --titan-button-border-radius, so referencing --titan-border-radius here would close a var()
      // cycle and zero the radius.
      --titan-button-border-radius: 8px;

      position: relative;
      gap: var(--titan-spacing-standard);
      cursor: pointer;
      white-space: nowrap;

      // Left-align content for the text/icon variants; the mixin centres by default.
      &.category,
      &.sub-option,
      &.sub-button,
      &.ghost {
         justify-content: flex-start;
         text-align: left;
      }

      &.category {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         padding: 3px var(--titan-spacing-standard);

         &.active {
            --titan-button-background: var(--titan-panel-3-background);
            --titan-button-font-color: var(--titan-panel-3-color);
         }
      }

      &.sub-option {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         padding: 6px var(--titan-spacing-standard);

         // The revealed row carries the panel-3 fill plus an accent edge-bar matching the open category.
         &.active {
            --titan-button-background: var(--titan-panel-3-background);
            --titan-button-font-color: var(--titan-panel-3-color);

            box-shadow: inset 2px 0 0 0 var(--titan-accent-color);
         }
      }

      &.sub-button {
         --titan-button-background: var(--titan-panel-3-background);
         --titan-button-font-color: var(--titan-panel-3-color);
         --titan-button-hover-background: var(--titan-panel-3-background);
         --titan-button-hover-font-color: var(--titan-panel-3-color);

         padding: 2px var(--titan-spacing-standard);
      }

      &.chip {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         width: auto;
         padding: 1px 5px;
      }

      &.restore {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         width: auto;
         padding: var(--titan-spacing-standard);
      }

      // The ghost variant is transparent (it sits on a panel-2 row), so its text uses the panel-2 pair.
      &.ghost {
         --titan-button-background: transparent;
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: transparent;
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         padding: 0;
      }

      // The accent edge-bar marks an open/active button on the edge facing its flyout.
      &.active.accent-top::after,
      &.active.accent-right::after,
      &.active.accent-bottom::after,
      &.active.accent-left::after {
         content: '';
         position: absolute;
         background: var(--titan-accent-color);
      }

      &.active.accent-top::after {
         left: 0;
         right: 0;
         top: 0;
         height: 2px;
      }

      &.active.accent-bottom::after {
         left: 0;
         right: 0;
         bottom: 0;
         height: 2px;
      }

      &.active.accent-left::after {
         top: 0;
         bottom: 0;
         left: 0;
         width: 2px;
      }

      &.active.accent-right::after {
         top: 0;
         bottom: 0;
         right: 0;
         width: 2px;
      }
   }
</style>
```

- [ ] **Step 2: Verify stylelint passes**

Run: `npm run stylelint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/svelte-components/button/HudButton.svelte
git commit -m "feat: add HudButton, a fully token-defined HUD button primitive"
```

---

### Task 4: Route action-menu sub-buttons through `HudButton` and widen the lane

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuSubButtons.svelte`

**Interfaces:**
- Consumes: `HudButton` (Task 3).

- [ ] **Step 1: Replace the raw button and widen the column**

Replace the markup and styles in `ActionMenuSubButtons.svelte`. The script's import of `localize`
stays; add the `HudButton` import.

Script — add the import below the existing `localize` import:

```javascript
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
```

Markup — replace the `{#each}` body's `<button>…</button>` with:

```svelte
   {#each subOption.subButtons as button (button.key)}
      <HudButton
         variant="sub-button"
         testId={`player-hud-sub-button-${subOption.key}-${button.key}`}
         onclick={() => onAction('sub', button)}
      >
         {#if button.icon}
            <i class={button.icon}></i>
         {/if}
         <span>{button.label ?? localize(button.labelKey)}</span>
      </HudButton>
   {/each}
```

Style — replace the whole `<style>` block (the per-button styling now lives in `HudButton`; only the
column layout remains, now `max-content` so it fits the longest sub-button label):

```svelte
<style lang="scss">
   .sub-buttons {
      @include flex-column;
      @include flex-group-top;

      // Grow to the longest sub-button label rather than clipping it.
      width: max-content;
      gap: 2px;
   }
</style>
```

- [ ] **Step 2: Verify stylelint passes**

Run: `npm run stylelint`
Expected: PASS.

- [ ] **Step 3: Build, then run the action-menu e2e specs (world must be launched)**

Run: `npm run build`
Then: `npx playwright test tests/e2e/player-hud-action-menu.spec.js tests/e2e/player-hud-action-menu-layout.spec.js`
Expected: PASS — sub-button selectors (`player-hud-sub-button-*`) resolve and clicks behave as before.

- [ ] **Step 4: Commit**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuSubButtons.svelte
git commit -m "fix: route HUD sub-buttons through HudButton and fit their labels"
```

---

### Task 5: Route sub-options through `HudButton` and widen the flyout column

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte`
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte` (`.sub-options` width)

**Interfaces:**
- Consumes: `HudButton` (Task 3). The sub-option forwards `onpointerenter`/`onfocus` (whose `event.currentTarget` must be the `<button>`) and a `flyIn` entrance; both are preserved through `HudButton`'s `...rest` and `flyIn` props.

- [ ] **Step 1: Replace the sub-option button**

In `ActionMenuSubOption.svelte`, replace the `fly` import with the `HudButton` import (the entrance now
lives in `HudButton`):

```javascript
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
```

Replace the `<button>…</button>` markup with:

```svelte
<HudButton
   variant="sub-option"
   {active}
   testId={`player-hud-sub-option-${categoryKey}-${sub.key}`}
   {flyIn}
   onclick={() => onAction('main', sub)}
   onpointerenter={(event) => onreveal(sub, event)}
   onfocus={(event) => onreveal(sub, event)}
>
   {#if sub.img}
      <img
         src={sub.img}
         alt=""
      />
   {/if}
   <span>{sub.label ?? localize(sub.labelKey)}</span>
</HudButton>
```

Replace the `<style>` block (only the image sizing remains; the button/active styling lives in
`HudButton`):

```svelte
<style lang="scss">
   img {
      width: 20px;
      height: 20px;
      object-fit: contain;
   }
</style>
```

- [ ] **Step 2: Widen the flyout sub-option column**

In `ActionMenuFlyout.svelte`, in the `.sub-options` rule, add a `max-content` width so the column fits
the longest sub-option label (place it right after the `position: relative;` line):

```scss
   .sub-options {
      @include flex-column;
      @include flex-group-top;

      position: relative;
      // Grow to the longest sub-option label rather than clipping it.
      width: max-content;
      gap: 2px;
```

- [ ] **Step 3: Verify stylelint passes**

Run: `npm run stylelint`
Expected: PASS.

- [ ] **Step 4: Build and run the action-menu e2e specs (world must be launched)**

Run: `npm run build`
Then: `npx playwright test tests/e2e/player-hud-action-menu.spec.js tests/e2e/player-hud-action-menu-layout.spec.js`
Expected: PASS — sub-option reveal (hover/focus → sub-buttons appear), the staggered entrance, and the
`player-hud-sub-option-*` selectors all behave as before.

- [ ] **Step 5: Commit**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte
git commit -m "fix: route HUD sub-options through HudButton and fit their labels"
```

---

### Task 6: Route category buttons through `HudButton`, themed accent, and chip gutter

**Files:**
- Modify: `src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte`
- Modify: `src/ui/player-hud/PlayerHudShell.svelte` (pass `chipCorner` into the action menu)

**Interfaces:**
- Consumes: `HudButton` (Task 3), `--titan-accent-color` (Task 1).
- The flyout-offset measurement still reads `barEl.querySelector('.active')`; `HudButton` keeps the
  `active` class on its `<button>`, so the query still resolves. The category button stays a direct
  child of `.categories` (no positioning wrapper), so the measured `offsetLeft`/`offsetTop`/
  `offsetHeight` are unchanged.

- [ ] **Step 1: Pass the chip corner from the shell into the action menu**

In `PlayerHudShell.svelte`, pass the already-computed `actionMenuChipCorner` into `ActionMenuElement`:

```svelte
      <ActionMenuElement
         {actors}
         {layoutState}
         options={options.actionMenu}
         chipCorner={actionMenuChipCorner}
      />
```

- [ ] **Step 2: Accept `chipCorner`, import `HudButton`, derive the accent edge**

In `ActionMenuElement.svelte`, add the import and extend the props/derivations.

Import (below the existing `ActionMenuFlyout` import):

```javascript
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
```

Extend the typedef and `$props()` destructure to include `chipCorner`:

```javascript
   /**
    * @typedef {object} ActionMenuElementProps
    * @property {Array<Actor>} actors - All resolved actors (group actions iterate these).
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    * @property {object} options - The actionMenu options.
    * @property {string} chipCorner - The minimize-chip corner ('top-right' | 'top-left' | 'bottom-right' | 'bottom-left'), so the category bar reserves a gutter on the chip's side.
    */

   /** @type {ActionMenuElementProps} */
   const { actors, layoutState, options, chipCorner } = $props();
```

Add a derived accent edge after the existing `subButtonsSide` derivation. The accent sits on the edge
facing the flyout: in a vertical layout that is the left/right edge, in a horizontal layout the
top/bottom edge.

```javascript
   /**
    * @type {'top' | 'right' | 'bottom' | 'left'} The edge the open category's accent bar sits on,
    * facing the flyout: left/right in a vertical layout, top/bottom in a horizontal one.
    * @returns {'top' | 'right' | 'bottom' | 'left'} The accent edge.
    */
   const accentEdge = $derived.by(() => {
      if (vertical) {
         return subOptionsSide === 'before' ? 'left' : 'right';
      }
      return subOptionsSide === 'before' ? 'top' : 'bottom';
   });
```

- [ ] **Step 3: Replace the category `<button>` with `HudButton`**

In `ActionMenuElement.svelte`, replace the `{#each model …}` button with:

```svelte
      {#each model as entry (entry.key)}
         <HudButton
            variant="category"
            active={layoutState.openCategory === entry.key}
            accentEdge={layoutState.openCategory === entry.key ? accentEdge : undefined}
            testId={`player-hud-category-${entry.key}`}
            onclick={() => {
               layoutState.openCategory = layoutState.openCategory === entry.key ? null : entry.key;
            }}
         >
            {localize(entry.labelKey)}
         </HudButton>
      {/each}
```

- [ ] **Step 4: Replace the category-button styling and chip gutter**

In `ActionMenuElement.svelte`'s `<style>`, delete the now-unused selectors that styled the raw category
`button` and its `::after` accent: the entire `.categories button { … }` block, the four
`&…flyout-… .categories button.active::after` blocks, and the `button { … }` rule inside
`&.vertical .categories`. Replace the fixed chip gutters with corner-driven ones.

The `.categories` rule becomes (note: the fixed `padding-right: 22px` is removed; the gutter is applied
by corner-specific rules below):

```scss
      .categories {
         @include flex-row;
         @include flex-group-left;

         gap: 2px;
      }
```

The `&.vertical .categories` rule loses its `button { … }` child and its fixed `padding-bottom`:

```scss
      &.vertical .categories {
         @include flex-column;
         @include flex-group-top;
      }
```

Add corner-driven gutter rules (the chip is ~18px tall and clears with a 22px side gutter; values
confirmed live in Task 9):

```scss
      // Reserve a gutter on the chip's own corner so the minimize chip never overlaps the categories.
      &.chip-top-right .categories,
      &.chip-bottom-right .categories {
         padding-right: 22px;
      }

      &.chip-top-left .categories,
      &.chip-bottom-left .categories {
         padding-left: 22px;
      }

      &.vertical.chip-bottom-right .categories,
      &.vertical.chip-bottom-left .categories {
         padding-right: 0;
         padding-left: 0;
         padding-bottom: 18px;
      }
```

- [ ] **Step 5: Apply the chip-corner class to the root**

In `ActionMenuElement.svelte`, add the chip-corner class to the `.action-menu` root so the gutter rules
match. Fold the chip-corner into the single `class` expression (a second `class` attribute beside the
`class:` directives would be a duplicate-attribute error):

```svelte
<div
   class={`action-menu chip-${chipCorner}`}
   class:vertical
   class:flyout-before={subOptionsSide === 'before'}
   class:flyout-after={subOptionsSide === 'after'}
   bind:this={rootEl}
>
```

- [ ] **Step 6: Verify stylelint passes**

Run: `npm run stylelint`
Expected: PASS.

- [ ] **Step 7: Build and run the action-menu e2e specs (world must be launched)**

Run: `npm run build`
Then: `npx playwright test tests/e2e/player-hud-action-menu.spec.js tests/e2e/player-hud-action-menu-layout.spec.js`
Expected: PASS — opening a category aligns the flyout to the active button (measurement intact),
`player-hud-category-*` selectors resolve, and the active accent renders.

- [ ] **Step 8: Commit**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte src/ui/player-hud/PlayerHudShell.svelte
git commit -m "fix: themed HUD category buttons, accent token, and chip gutter"
```

---

### Task 7: Route the frame chips through `HudButton`

**Files:**
- Modify: `src/ui/player-hud/HudElementFrame.svelte`

**Interfaces:**
- Consumes: `HudButton` (Task 3). The minimize chip keeps a positioning wrapper (`.minimize-chip
  <corner>`); the restore chip needs no positioning. Both keep their `data-testid`.

- [ ] **Step 1: Import `HudButton`**

In `HudElementFrame.svelte`, add below the existing imports:

```javascript
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
```

- [ ] **Step 2: Replace the restore chip**

Replace the `<button class="restore-chip" …>…</button>` with:

```svelte
      <HudButton
         variant="restore"
         ariaLabel={localize('restoreElement')}
         testId={testId ? `${testId}-restore` : undefined}
         onclick={() => layoutState.toggleMinimized(elementKey)}
      >
         <i class={minimizeIcon}></i>
      </HudButton>
```

- [ ] **Step 3: Replace the minimize chip with a positioned wrapper around `HudButton`**

Replace the `<button class={`minimize-chip ${chipCorner}`} …>…</button>` with a positioning wrapper
holding the chip button (the wrapper carries the absolute corner placement and opacity; the button
carries the themed surface and the test id):

```svelte
      <div class={`minimize-chip ${chipCorner}`}>
         <HudButton
            variant="chip"
            ariaLabel={localize('minimizeElement')}
            testId={testId ? `${testId}-minimize` : undefined}
            onclick={() => layoutState.toggleMinimized(elementKey)}
         >
            <i class="fas fa-minus"></i>
         </HudButton>
      </div>
```

- [ ] **Step 4: Update the chip styles**

In `HudElementFrame.svelte`'s `<style>`, replace the `.minimize-chip { … }` rule (which styled a
button) with a positioning-only wrapper rule, and delete the `.restore-chip { … }` rule (its surface
now comes from `HudButton`). The `.minimize-chip` rule becomes:

```scss
      // Positioning wrapper for the minimize chip; the chip's surface comes from HudButton.
      .minimize-chip {
         position: absolute;
         z-index: 2;
         opacity: 0.8;

         &:hover {
            opacity: 1;
         }

         &.top-right {
            top: 0;
            right: 0;
         }

         &.top-left {
            top: 0;
            left: 0;
         }

         &.bottom-right {
            bottom: 0;
            right: 0;
         }

         &.bottom-left {
            bottom: 0;
            left: 0;
         }
      }
```

- [ ] **Step 5: Verify stylelint passes**

Run: `npm run stylelint`
Expected: PASS.

- [ ] **Step 6: Build and run the layout + visibility e2e specs (world must be launched)**

Run: `npm run build`
Then: `npx playwright test tests/e2e/player-hud-layout.spec.js tests/e2e/player-hud-visibility.spec.js`
Expected: PASS — minimize/restore selectors (`*-minimize`, `*-restore`) resolve and toggle minimized
state as before.

- [ ] **Step 7: Commit**

```bash
git add src/ui/player-hud/HudElementFrame.svelte
git commit -m "fix: route HUD frame chips through HudButton"
```

---

### Task 8: Route the effect row header through `HudButton` (fixes the clip)

**Files:**
- Modify: `src/ui/player-hud/elements/effects-panel/EffectsListRow.svelte`

**Interfaces:**
- Consumes: `HudButton` (Task 3). The row header uses the `ghost` variant (transparent on the panel-2
  row); content now drives its height, so the stacked name + duration no longer clips.

- [ ] **Step 1: Import `HudButton`**

In `EffectsListRow.svelte`, add below the existing imports:

```javascript
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
```

- [ ] **Step 2: Replace the row-header button**

Replace the `<button class="row-header" …>…</button>` with:

```svelte
   <!--Row header (click to expand): icon centred against the stacked name/duration column-->
   <HudButton
      variant="ghost"
      ariaLabel={`${document.data?.name}: ${localize(isExpanded ? 'collapse' : 'expand')}`}
      onclick={() => isExpanded = !isExpanded}
   >
      <img
         class="icon"
         src={document.data?.img}
         alt={document.data?.name}
      />
      <span class="text">
         <span class="name">{document.data?.name}</span>
         {#if isEffect && durationType !== 'permanent'}
            <span class="duration">
               <DurationTag
                  type={durationType}
                  remaining={durationRemaining}
               />
            </span>
         {/if}
      </span>
   </HudButton>
```

- [ ] **Step 3: Move the inner-content styles out of the `.row-header` button selector**

In `EffectsListRow.svelte`'s `<style>`, the `.row-header { … }` block styled the raw button (now
`HudButton`). The button-level properties (`background`, `border`, `cursor`, `color`, the flex mixins)
are now owned by `HudButton`'s `ghost` variant. Keep only the inner-content styling, re-parented under
`.row` so it still targets the icon/text (authored in this component's scope). Replace the
`.row-header { … }` block with:

```scss
      // The header's icon + stacked name/duration column (the button shell is HudButton's ghost variant).
      .icon {
         flex-shrink: 0;
         width: 30px;
         height: 30px;
         object-fit: contain;
      }

      .text {
         @include flex-column;
         @include flex-group-top-left;
         @include margin-left-standard;

         flex: 1;
         min-width: 0;
         gap: 2px;

         // Truncate rather than overflow the panel when the row is narrow.
         .name {
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
         }
      }
```

(Keep these nested inside the existing `.row { … }` block, replacing the `.row-header { … }` child.)

- [ ] **Step 4: Verify stylelint passes**

Run: `npm run stylelint`
Expected: PASS.

- [ ] **Step 5: Build and run the effects-panel e2e spec (world must be launched)**

Run: `npm run build`
Then: `npx playwright test tests/e2e/player-hud-effects-panel.spec.js`
Expected: PASS — `player-hud-effect-row` expands/collapses on click as before.

- [ ] **Step 6: Commit**

```bash
git add src/ui/player-hud/elements/effects-panel/EffectsListRow.svelte
git commit -m "fix: route effect row header through HudButton so its text no longer clips"
```

---

### Task 9: Full HUD e2e, lint, and live verification

**Files:** none (verification task).

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: PASS (theme contract included).

- [ ] **Step 2: Run all six player-HUD e2e specs (world must be launched)**

Run: `npm run build`
Then: `npx playwright test tests/e2e/player-hud-visibility.spec.js tests/e2e/player-hud-portrait.spec.js tests/e2e/player-hud-action-menu.spec.js tests/e2e/player-hud-action-menu-layout.spec.js tests/e2e/player-hud-effects-panel.spec.js tests/e2e/player-hud-layout.spec.js`
Expected: PASS for all.

- [ ] **Step 3: Run lint**

Run: `npm run stylelint && npm run eslint`
Expected: PASS.

- [ ] **Step 4: Live verification in Foundry (manual)**

With the HUD visible, confirm each fix against a **light** theme (e.g. Clean Neutral) and a dark theme:

1. Effect row: a long effect name with a duration tag no longer overflows the row-header bottom.
2. Action menu: open a category whose sub-options/items have long names — the flyout column widens to
   fit them; nothing clips.
3. Action-menu button text is the themed panel color and changes when the theme changes.
4. Effect description headings (h1–h6) are readable on the light theme.
5. The minimize chip clears the category buttons in the current layout/direction config. Toggle the
   action-menu layout (horizontal/vertical) and sub-option directions to confirm the gutter follows the
   chip corner; adjust the `22px`/`18px` gutter magnitudes in `ActionMenuElement.svelte` if any config
   still overlaps, then rebuild and re-check.
6. The flyout accent bar (open category, revealed sub-option) is visible and themed.

- [ ] **Step 5: Commit any gutter adjustments from Step 4**

```bash
git add src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte
git commit -m "fix: tune HUD minimize-chip gutter from live verification"
```

(Skip if no adjustment was needed.)

---

### Task 10: Documentation

**Files:**
- Modify: `docs/CLOSED_BUGS.md`
- Modify: `docs/OPEN_BUGS.md`
- Modify: `.claude/skills/titan-codebase/references/*.md` (the file describing the HUD / components / theme tokens)

- [ ] **Step 1: Record the closed bugs**

Read `docs/CLOSED_BUGS.md` and `docs/OPEN_BUGS.md` to learn the existing format and numbering. Add the
five fixed Player HUD defects to `docs/CLOSED_BUGS.md` (effect-row clip, sub-option width, themed button
text, light-mode heading color, minimize-chip overlap), following the file's format. If any of these
were already tracked in `docs/OPEN_BUGS.md`, remove them there.

- [ ] **Step 2: Log the named-palette finding as an open bug**

In `docs/OPEN_BUGS.md`, log the new finding (following the file's format): the named brand palette
`--titan-blue/green/yellow/maroon/orange/cyan` is undefined in `src/`; beyond the HUD accent (now fixed
via `accent-color`), it feeds the three chat resource-mod tag gradients in `SystemMixins.scss`
(`fast-healing-tag`, `persistent-damage-tag`, `resolve-regain-tag`, used by
`ChatMessageResourceModTag.svelte`), which therefore render invalid gradients.

- [ ] **Step 3: Update the titan-codebase skill**

In the appropriate `.claude/skills/titan-codebase/references/*.md` file, record (reflecting current
state, not a changelog): `HudButton.svelte` is the themed button primitive for the Player HUD — every
HUD button (category, sub-option, sub-button, chip, restore, ghost row-header) routes through it; it
defines all box/text properties from `--titan-button-*` tokens via `@include button` with per-variant
overrides, so Foundry core button styling cannot leak in. Note the two new theme tokens
`heading-font-color` (rich-text headings, applied via `Global.scss`) and `accent-color` (the HUD flyout
accent).

- [ ] **Step 4: Commit**

```bash
git add docs/CLOSED_BUGS.md docs/OPEN_BUGS.md .claude/skills/titan-codebase/
git commit -m "docs: close HUD styling bugs, log palette finding, update codebase skill"
```

---

## Self-Review notes

- **Spec coverage:** #1 → Task 8; #2 → Tasks 4–5; #3 → Tasks 3–8 (HudButton text from panel tokens);
  #4 → Tasks 1–2; #5 → Task 6 (+ Task 9 live tuning); `--titan-cyan` accent → Tasks 1, 5, 6; out-of-scope
  palette finding → Task 10. All spec sections map to a task.
- **Accent realization:** the spec described relocating the category accent to a sibling; this plan
  draws it as an `::after` on the `HudButton` button driven by an `accentEdge` prop instead. Same goal
  (no `:global`, no parent ancestor-CSS dependency) and it keeps the flyout offset measurement intact
  by avoiding a positioned per-category wrapper. Flagged for the user at handoff.
- **Type consistency:** `HudButton` prop names (`variant`, `active`, `accentEdge`, `ariaLabel`,
  `testId`, `flyIn`, `element`, `onclick`) are used identically across Tasks 4–8.
