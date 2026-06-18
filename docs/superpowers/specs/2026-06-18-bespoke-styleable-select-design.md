# Bespoke Styleable `Select` — Design

**Date:** 2026-06-18
**Status:** Approved design, pending implementation plan.

## Goal

Give TITAN full per-option styling control over its dropdowns — **individual icons,
background colors, and fonts per option** — which a native `<select>` cannot provide (the
option popup is drawn by the OS/Chromium, so icons are impossible and fonts/backgrounds are
unreliable inside `<option>`).

The immediate concrete requirement: **attribute and attack-type selects display an icon to the
left of each option** (in both the open list and the closed control).

## Decision summary

- Replace the native `<select>` internals of the single base component
  `src/helpers/svelte-components/input/select/Select.svelte` with a custom, fully-styleable
  listbox. Because every select funnels through this one component, the change propagates to all
  ~37 wrappers (domain selects + `Document*Select`) with no wrapper rewrites.
- **Do not** depend on the `svelte-select-runes` npm package. Instead **lift and adapt** the
  needed code from the author's own package source (`Solidor777/svelte-select-5`, branch
  `master`) — `List.svelte`, `Item.svelte`, and `Select.svelte`'s keydown navigation — then strip
  the machinery TITAN does not want (search/filter, multi-select, clear, async `loadOptions`,
  grouping) and restyle to TITAN's input mixins. No IP concern: it is the project author's code.
- **Positioning** uses floating-ui, mirroring the package. This adds **`@floating-ui/dom`** as a
  new runtime dependency (small, statically bundled — complies with the no-dynamic-import rule).
- Per-option styling is delivered by (1) an optional `icon` field on `SelectOption`, and (2)
  optional `option` / `selection` snippet props for full per-row control. **No** declarative
  `accent`/`color`/`style` data field (YAGNI — snippets cover arbitrary styling, scoped).

## Non-goals

Search / typeahead-filter input, multi-select, clearable, async option loading, and grouping.
These are package features TITAN deliberately omits. (First-letter *typeahead navigation* — jump to
the option whose label starts with the typed character — IS included, as native-`<select>` parity;
it is not a filter box.)

## Public contract (unchanged)

`Select.svelte` keeps its exact prop surface so every wrapper and `DocumentSelect`'s write-back
keep working untouched:

| Prop | Behavior (unchanged) |
|---|---|
| `options` | `(SelectOption \| string \| number)[]` |
| `value` | `$bindable` **primitive** (string/number) — written straight to the document |
| `disabled` | disables the control |
| `tooltip` | whole-control tippy tooltip |
| `onchange` | fired on commit (pure mutation, before document persist) |
| `testId` | applied to the root element |

The existing value-clamp `$effect` (if `value` is not among `options`, set it to the first option's
value and fire `onchange`) is preserved verbatim — it guarantees a valid selection, which a custom
control still requires.

### API additions

`SelectOption` typedef gains one optional field:

```js
/**
 * @template T
 * @typedef {object} SelectOption
 * @property {T} value
 * @property {string | number | TextData} [label]
 * @property {string | TooltipAction} [tooltip]
 * @property {string} [icon] - FontAwesome class string, rendered left of the label in the list row
 *                             and the closed control.
 */
```

`Select.svelte` gains two optional snippet props:

- `option(option, index)` — overrides default row rendering (icon + `<Text>` label).
- `selection(option)` — overrides the closed-control display of the selected option.

When omitted, the default renderer is used (icon + localized `<Text>` label). Snippets defined in a
wrapper retain that wrapper's scoped-style hash even when the list is portaled, so theming stays
scoped and `:global`-free.

## Component structure

Three new/changed pieces, pure Svelte 5 runes, scoped SCSS, no `:global`.

### `Select.svelte` (rewritten — the trigger + controller)
- Renders a `<button role="combobox">` showing the selected option via the default renderer or the
  `selection` snippet; reflects `disabled`; carries `testId` on the root and the whole-control
  `tooltip`.
- Owns: open/close state, the clamp `$effect`, `hoverItemIndex`, keyboard handling (adapted from the
  package's `Select.svelte` keydown), and committing a selection (`value = option.value; onchange?.()`).
- Mounts `SelectList` only while open, passing the floating action.
- ARIA: `aria-expanded`, `aria-controls`, `aria-activedescendant`; returns focus to the trigger on
  close.

### `SelectList.svelte` (new — the floating listbox)
- Adapted from the package `List.svelte`: keeps the `prefloat` hide-first-frame reveal and the
  scroll-active-row-into-view action; drops group headers, multi-select, empty-state filter text.
- `role="listbox"`; one `<div role="option" data-value={option.value}>` per option, rendered via the
  default renderer or the `option` snippet. Default row = `<i class={option.icon}>` (when present) +
  `<Text text={option.label ?? option.value}>` + per-option `tooltipAction`.
- Width matches the trigger (min-width = control width); `max-height` + `overflow-y: auto` for long
  lists (e.g. 18-entry trait/skill lists).
- `data-value` on each option row is the stable e2e/selection hook.

### `floatingDropdown` action (new — `src/helpers/svelte-actions/`)
- Wraps `@floating-ui/dom` `computePosition` with `flip`, `shift`, and `size`/`offset` middleware to
  position the list under (or, when near the viewport bottom, above) the trigger.
- Portals the list node to `document.body`. Theme `--titan-*` tokens are injected on `:root`
  (`ThemeManager` / `BuildThemeStylesheetText`), so they cascade to `document.body` — the portaled
  list is themed correctly and escapes all sheet/scroll-container clipping.
- Closes the list on outside-click, scroll, and resize. (Auto-update reposition-on-scroll is optional;
  close-on-scroll is the baseline.)

## Icon wiring (the two named selects)

`AttributeSelect.svelte` and `AttackTypeSelect.svelte` map their primitive value lists into
`{ value, icon }` `SelectOption` objects, sourcing icons from `src/system/Icons.js`:

- Attributes: `body`→`BODY_ICON`, `mind`→`MIND_ICON`, `soul`→`SOUL_ICON` (the `ICON_MAP` keys, or
  the named constants directly). The `all` / `none` synthetic options carry no icon.
- Attack types: `melee`→`MELEE_ICON`, `ranged`→`ACCURACY_ICON` (the existing codebase convention for
  ranged, e.g. `BuildActionMenuModel`, `AttackTags`).

Labels still default to `value` and localize through `<Text>` exactly as today. Because the default
renderer draws `icon` in both the list row and the closed control, icons appear in both places. The
`Document*` variants (`DocumentAttributeSelect`, `DocumentAttackTypeSelect`) wrap these base
wrappers, so they inherit the icons with no change.

Additionally, **each attribute option is colored by its own attribute color**. `AttributeSelect`
supplies an `option` snippet that renders each row inside `<span class="attribute-option {value}">`
and applies the existing `attribute-colors` mixin (per-attribute `--titan-<attr>-background` /
`--titan-<attr>-font-color`); a negative margin bleeds the fill across the `SelectList` row padding.
The closed control is already colored by the existing `AttributeInput` wrapper (it sets
`--titan-input-*`, which the trigger button inherits).

## Styling / theming

- The control and list use TITAN's existing input mixins (e.g. `@include input`) so they match other
  inputs by default; the lifted package's `--svelte-select-*` token CSS is **not** carried over —
  styling is rewritten against TITAN tokens/mixins.
- Per-option backgrounds/fonts are achieved with the `option`/`selection` snippets in the specific
  wrappers that want them (e.g. attribute coloring via existing attribute mixins), all scoped.
- `:global` remains forbidden; portaling does not require it because Svelte style scoping is
  attribute-hash based, not DOM-ancestor based.

## Behavior & accessibility parity

Re-implements what the native `<select>` gave for free: open/close on click and Enter/Space,
Up/Down/Home/End navigation, Enter/Space to commit, Esc to close, first-letter typeahead navigation,
`role`/`aria-*` wiring, and focus return to the trigger on close. No search box, clear button, or
multi-select.

## Testing

### e2e migration (the principal cost)
Every Playwright interaction that drives a native `<select>` breaks, because the control is now a
div-based combobox. Affected:

- `tests/e2e/component-probe-selects.spec.js` (~14 component probes) — rewrite all
  `locator('select')`, `locator('option')`, `selectOption(...)`, and `toHaveValue(...)` assertions to
  the new DOM: open the trigger, read `[role=option]` rows, assert `data-value` sets, click a row,
  and assert the committed value via the closed control's text / a `data-value` on the trigger.
- `tests/e2e/checkDialog.js` — rewrite `setSelectField` (currently `select.selectOption({ label })`)
  to open the control and click the option.
- Smaller touches: `tests/e2e/rules-element-crud.spec.js`, `tests/e2e/component-probe.spec.js`,
  `tests/e2e/fixtures.js`.

Add **shared e2e helpers** so the migration is centralized, not copy-pasted:
- `selectTitanOption(root, testId, value)` — open the trigger identified by `testId`, click
  `[role=option][data-value="<value>"]`.
- `readTitanSelectValue(root, testId)` — read the committed value from the closed control.

### Unit
- Preserve existing clamp / option-mapping unit coverage.
- Add coverage for open/close state and keyboard navigation where feasible under the unit harness.

Full unit + e2e suites green before merge (project rule).

## Files

**New**
- `src/helpers/svelte-components/input/select/SelectList.svelte`
- `src/helpers/svelte-actions/FloatingDropdown.js` (or `.svelte.js` if it needs runes)
- e2e helpers (`selectTitanOption`, `readTitanSelectValue`) — placed in an existing e2e helper module.

**Modified**
- `src/helpers/svelte-components/input/select/Select.svelte` (rewrite internals; extend `SelectOption`
  typedef; add `option`/`selection` snippets)
- `src/helpers/svelte-components/input/select/AttributeSelect.svelte` (map to `{ value, icon }`)
- `src/helpers/svelte-components/input/select/AttackTypeSelect.svelte` (map to `{ value, icon }`)
- `package.json` (add `@floating-ui/dom`)
- `tests/e2e/component-probe-selects.spec.js`, `tests/e2e/checkDialog.js`,
  `tests/e2e/rules-element-crud.spec.js`, `tests/e2e/component-probe.spec.js`, `tests/e2e/fixtures.js`

**Docs (required final step)**
- `.claude/skills/titan-codebase/` — reflect the new Select architecture (custom listbox, floating
  action, `SelectOption.icon`, snippet props).
- `docs/TODO.md` — log any deferred follow-ups (e.g. optional auto-reposition-on-scroll).

## Risks

- **Positioning** is the hard part; floating-ui + portal-to-body addresses clipping and edge flip.
- **e2e migration breadth** — ~14 probes plus the check-dialog helper; centralized helpers keep it
  contained.
- **Lifting package code** must be adapted to runes-mode TITAN conventions and stripped of unused
  machinery, not pasted wholesale.
