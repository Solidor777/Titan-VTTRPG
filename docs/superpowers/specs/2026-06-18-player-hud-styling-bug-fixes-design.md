# Player HUD styling bug fixes — design

Date: 2026-06-18

Five user-reported visual defects in the Player HUD, plus one shared root cause that unifies two of
them. All fixes are SCSS/Svelte-layer; no data model, schema, or behavior changes.

## Bugs and root causes

1. **Effect row header clips its text out the bottom.** `EffectsListRow.svelte`'s row header is a raw
   `<button>` that only partially overrides Foundry core button styling. Core's `min-height` /
   `line-height` force a box shorter than the stacked icon + name + duration-tag content, which then
   overflows the bottom.

2. **Action-menu sub-options don't widen to their labels.** Sub-option buttons are
   `width: 100%; white-space: nowrap` inside a flyout column with no intrinsic width, so long option /
   item names spill past the button instead of widening the column
   (`ActionMenuFlyout.svelte` `.sub-options`, `ActionMenuSubButtons.svelte` `.sub-buttons`).

3. **Action-menu button text ignores the theme.** Every HUD button is a raw `<button>` carrying
   `@include panel-2/3` (which sets a paired, readable `--titan-panel-x-color`) and then overriding it
   with `color: inherit`. Because the HUD layer renders outside any `.titan` themed scope, `inherit`
   resolves to Foundry core's bright ambient text rather than the themed panel color, so the text
   neither matches nor tracks the theme.

4. **Rich-text headings stay bright on light themes.** Heading elements (`h1`–`h6`) inside effect
   descriptions (`EffectsDetailBody.svelte` → `RichText.svelte`) have no color rule. On sheets they
   inherit `.titan`'s themed color and read fine; in the un-themed HUD they fall back to core's bright
   heading color and become unreadable on light themes.

5. **Minimize chip overlaps the categories.** The categories bar reserves a fixed gutter
   (`padding-right: 22px` / `padding-bottom: 18px`) for the minimize chip, but that gutter does not
   track the chip's actual computed corner (`actionMenuChipCorner`) across every layout / direction
   permutation, so in some configurations the chip lands over the category buttons.

Bugs **1 and 3 share a root cause**: raw `<button>` elements let Foundry core styling leak in (#1 the
box model, #3 the text color via `color: inherit`). The fix is a single themed button component whose
every property is defined from our tokens, leaving nothing for Foundry to fill in.

## Fix design

### `HudButton.svelte` — a parameterized, fully token-defined button (fixes #1, #3)

New shared component at `src/helpers/svelte-components/button/HudButton.svelte`. It renders a single
`<button>` styled via the existing `@include button` mixin (`ButtonMixins.scss`), which already
defines **every** box and text property from `--titan-button-*` tokens — so Foundry core styling
cannot leak. Each HUD variant is produced by **overriding the `--titan-button-*` tokens**, not by
resetting or by ad-hoc property soup.

**Props**

- `variant` — `'category' | 'sub-option' | 'sub-button' | 'chip'`. Selects the panel surface, padding,
  and font size by overriding tokens internally.
- `active` — applies the open/hover/revealed state (panel-3 surface) and sets the `active` class on the
  `<button>` so existing measurement (`barEl.querySelector('.active')`) and tests keep working.
- `children` — snippet carrying the inner content (icon, stacked name/duration, image + label).
  Because the snippet is authored in the **parent**, the parent continues to style those inner elements
  in its own scope; only the `<button>` shell belongs to `HudButton`. This sidesteps the project's
  `:global` ban.
- Passthrough: `onclick`, `disabled`, `type` (default `'button'`), `aria-label`, `testId`
  (→ `data-testid`), `...rest` (forwards `onpointerenter` / `onfocus`), bindable `element` (for the
  action-menu offset measurement), and `flyIn` (applied as `in:fly={flyIn}` inside, for the sub-option
  cascade entrance).

**Per-variant token overrides** (representative; final values verified live):

- Common to all: `--titan-button-height: auto`, `--titan-button-min-height: 0`,
  `--titan-button-line-height: normal`, `--titan-button-border-width: 0`,
  `--titan-button-font-size: var(--titan-font-size-small)`. The mixin centres content; variants that
  need left alignment override `justify-content` / `text-align` in scoped style.
- `category`: surface `--titan-panel-2-background` / font `--titan-panel-2-color`; `active` → panel-3.
- `sub-option`: panel-2 / panel-2-color; `active` → panel-3 plus the existing inset accent.
- `sub-button`: panel-3 / panel-3-color.
- `chip`: panel-2 / panel-2-color, compact padding, reduced opacity (matching the current chip).

Hover tokens (`--titan-button-hover-*`) are overridden to the variant's own surface so the form-button
hover swap is inert; the action menu expresses state through `active`, not `:hover`.

**Consumers updated** to route through `HudButton` (each keeps its current `data-testid` and `active`
semantics):

- `ActionMenuElement.svelte` — category buttons.
- `ActionMenuSubOption.svelte` — sub-option row (keeps `flyIn`, `onpointerenter`/`onfocus`, `active`).
- `ActionMenuSubButtons.svelte` — sub-buttons.
- `HudElementFrame.svelte` — minimize and restore chips. The resize handle stays a plain styled element
  (a drag affordance, not a text button).

**Category accent edge-bar relocation.** The accent bar is currently a parent `::after` on
`button.active`, positioned by `.action-menu` ancestor classes (`vertical` / `flyout-before` /
`flyout-after`). With the button moving into `HudButton`, that parent selector would no longer match,
and `:global` is banned. The accent bar becomes a **sibling element rendered by
`ActionMenuElement` next to the active category `HudButton`**, positioned by the same ancestor-class
logic, which stays in `ActionMenuElement`'s own scope. The sub-option's inset accent stays inside the
`sub-option` variant (no ancestor dependency).

### Sub-option width (fixes #2)

Give the flyout sub-option column and the sub-button lane `width: max-content` so each grows to its
longest label; the buttons keep `width: 100%` to fill the resolved column width. Unbounded growth, per
decision — the column always fits the option / item names.

### New theme tokens (fixes #4 and the HUD accent)

Two standalone text/accent colors are added to the theme contract. Both go in the `application` group
of `ThemeTokenContract.js`; `THEME_COLOR_TOKENS`, `THEME_TOKENS`, validation (`ValidateThemeData.js`),
and the editor (`THEME_TOKEN_GROUPS`) all derive from the contract, so they propagate automatically.
Neither has a single paired fill, so neither is added to `THEME_TOKEN_PAIRS`. All four built-in themes
(`HeritageDark`, `HeritageLight`, `Macchiato`, `CleanNeutralLight`) gain a value for each; the
`ThemeContract` unit test enforces per-theme completeness against the contract.

- **`heading-font-color` (fixes #4).** Colors rich-text headings. `Global.scss` (a plain global
  stylesheet — the `:global` ban applies only to Svelte component `<style>` blocks) gains:
  `.rich-text :is(h1, h2, h3, h4, h5, h6) { color: var(--titan-heading-font-color); }`. The
  `.rich-text` class is present on both HUD and sheet rich text, so one rule covers both; scoping to
  `.rich-text` avoids restyling Foundry core headings.

- **`accent-color` (fixes the undefined `--titan-cyan` HUD accent).** The flyout accent currently
  references `--titan-cyan`, which is defined nowhere in `src/`, so the accent resolves to nothing. The
  redesign intended a swappable accent but never gave it a token. Replace the two HUD accent references
  — the sub-option's inset accent (`ActionMenuSubOption.svelte`) and the category accent edge-bar (now a
  sibling element in `ActionMenuElement.svelte`, per the relocation above) — with
  `var(--titan-accent-color)`. The accent now resolves and tracks the active theme.

### Minimize-chip gutter (fixes #5)

Reconcile the categories-bar reserved gutter with the chip's computed corner. The gutter is applied on
the side / corner the chip actually occupies (derived from `actionMenuChipCorner`) and sized to the
chip's footprint, so the chip clears the buttons in every layout / direction permutation. Exact padding
side and magnitude verified live against the current configuration.

## Out of scope (logged, not fixed here)

- The named brand palette `--titan-blue`, `--titan-green`, `--titan-yellow`, `--titan-maroon`,
  `--titan-orange`, and `--titan-cyan` is **defined nowhere in `src/`**. Beyond the HUD accent (fixed
  above via `accent-color`), these feed the three chat resource-mod tag gradients in `SystemMixins.scss`
  (`fast-healing-tag`, `persistent-damage-tag`, `resolve-regain-tag`, consumed by
  `ChatMessageResourceModTag.svelte`), so those gradients currently render invalid. This is a separate
  chat-surface defect; it will be logged to `docs/OPEN_BUGS.md` and fixed outside this batch.

## Testing

- Existing player-HUD e2e specs must stay green; they select by the `data-testid`s and `.active` class
  that `HudButton` preserves. Add/extend assertions only where a fix is directly observable
  (e.g. heading color token applied; sub-option column width tracks label).
- `ThemeContract` / `ThemeHelpers` unit tests validate the two new tokens (`heading-font-color`,
  `accent-color`) across the contract and all themes.
- Live verification in Foundry for the inherently visual fixes (#1 row height, #2 column growth, #5
  chip clearance, #4 heading readability on a light theme), since pixel overflow and chip overlap are
  not reliably asserted headlessly.

## Documentation (required final step)

- Move all five reported bugs to `docs/CLOSED_BUGS.md` on completion; log the undefined named-palette /
  chat-tag-gradient finding to `docs/OPEN_BUGS.md`.
- Update the `titan-codebase` skill: record `HudButton.svelte` as the themed button primitive for the
  HUD (mixin + token-override pattern) and the new `heading-font-color` and `accent-color` theme tokens.
