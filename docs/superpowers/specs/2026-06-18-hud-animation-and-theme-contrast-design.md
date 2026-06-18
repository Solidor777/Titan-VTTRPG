# HUD animation polish + theme contrast — design

Date: 2026-06-18

Four issues, two areas: action-menu animation/interaction (#1, #2) and theme readability (#3, #4).
All are SCSS/Svelte-layer plus theme-token additions; no data model or schema changes.

## 1. Sub-buttons swoosh in when their sub-option is revealed

**Now:** the sub-button lane (`ActionMenuFlyout.svelte`, `{#if hovered && hovered.subButtons.length > 0}`)
appears instantly.

**Fix:** give the lane the same directional `in:fly` treatment as the flyout. The lane sits beside the
sub-option on `subButtonsSide` (a horizontal side in every layout), so the swoosh slides along x,
starting offset toward the sub-option so it appears to emerge from it: `before` (lane left) →
positive x (slides left), `after` (lane right) → negative x (slides right). New constants in
`ActionMenuFlyout` (`SUB_BUTTON_SWOOSH_DISTANCE` ≈ 24px, `SUB_BUTTON_SWOOSH_DURATION` ≈ 180ms) feed a
derived `subButtonFly`; apply `in:fly={subButtonFly}` to `.sub-buttons-lane`.

## 2. A category always opens with its sub-buttons closed

**Root cause:** the flyout swooshes in *under the cursor*. When a sub-option appears beneath a
stationary pointer (clicking the side of a category that its flyout opens toward), the sub-option's
`onpointerenter` fires and reveals its sub-buttons. Clicking the opposite side leaves the cursor away
from the flyout, so nothing reveals — hence the inconsistency.

**Fix:** in `ActionMenuFlyout`, gate `reveal` on a real pointer movement. Add `let armed = $state(false)`;
the `.sub-options` element (which remounts per open category via the parent `{#key}`) starts unarmed.
An `onpointermove` handler on `.sub-options` sets `armed = true`. `reveal` returns early when not armed.
A freshly opened category therefore shows no sub-buttons until the pointer actually moves; the
`pointerenter` that fires from the flyout mounting under a stationary cursor is ignored. (Edge: the
sub-option already under the cursor reveals once the pointer moves onto it again — acceptable, and it
matches the "open closed" requirement.)

## 3. Headers and text use TITAN colors, not Foundry's

**Root cause:** Foundry core paints headings — and assorted text — with `var(--color-text-primary)`,
which follows Foundry's color scheme and mismatches the TITAN theme (light text on a TITAN light
theme). The previous `heading-font-color` token was wired only to `.rich-text`, so TITAN's own headings
(e.g. the theme-editor `<h3>` section titles) were never covered, and the rule could lose specificity
to core on sheets. Additionally, several TITAN apps lack the base `titan` class, so even a `.titan` rule
would not reach them.

**Fix, three parts:**

### 3a. Per-level header tokens

- `ThemeTokenContract.js`: remove `heading-font-color`; add a new `headers` group with
  `header-1-font-color` … `header-6-font-color`. The contract derivations (`THEME_COLOR_TOKENS`,
  `THEME_TOKENS`, `THEME_TOKEN_GROUPS`) and consumers (`ValidateThemeData`, the editor) pick them up
  automatically. They are standalone text colors → not added to `THEME_TOKEN_PAIRS`.
- All four built-in themes: remove `heading-font-color`; add the six `header-N-font-color` tokens,
  each defaulting to that theme's existing `app-font-color` value (legible out of the box, independently
  themeable per level). The `ThemeContract` unit test enforces per-theme completeness.
- `lang/en.json`: add `themeGroup.headers` (the editor renders one section per group). `prettifyTokenName`
  already turns `header-1-font-color` into a readable label.

### 3b. Apply TITAN colors across `.titan` surfaces (and the HUD)

In `Global.scss`:

- Within `.titan`, redefine Foundry's text variables to our body color so core-painted *body* text in any
  TITAN surface follows the theme:
  `.titan { --color-text-primary: var(--titan-app-font-color); --color-text-secondary: var(--titan-app-font-color); --color-text-emphatic: var(--titan-app-font-color); }`
- Per-level heading color, covering both `.titan` surfaces (sheets, chat, theme editor) and the
  non-`.titan` HUD rich text, one rule per level:
  `.titan h1, .rich-text h1 { color: var(--titan-header-1-font-color); }` … through `h6`.
- **Specificity:** this rule must beat core's heading rule (core uses `var(--color-text-primary)` on
  headings under an app/body-qualified selector, ≈ specificity 0-2-2). `.titan h1` (0-1-1) is not
  enough on sheets, so qualify the selector to win — escalate as verified live (e.g. `body.game .titan h1`
  to tie-and-win on source order, or a doubled class). The chosen selector is confirmed against the live
  theme editor and a sheet on a light theme.

### 3c. Every TITAN app and chat message carries `titan`

Audit every TITAN `ApplicationV2`/`DialogV2` subclass and the chat render path; add `'titan'` to the
`classes` array wherever it is missing. Known gaps: `AddCustomTraitDialog` (`['titan-add-custom-item-trait-dialog']`)
and `EditCustomTraitDialog` (`['titan-edit-custom-trait-dialog']`). The implementation enumerates all
`classes:` declarations under `src/` and the `TitanChatMessage` render path to find the rest.

## 4. Light-theme panels are distinguishable from the background

**Now:** both light themes collapse panels into the background — `HeritageLight` `panel-2 #f2f2f6` ≈
`app-background #f4f4f6`; `CleanNeutralLight` `panel-3 #ffffff` == `app-background #ffffff`.

**Fix:** retune `HeritageLight` and `CleanNeutralLight` so `app-background → panel-1 → panel-2 → panel-3`
form a clearly-stepped progression, each panel a distinct (progressively darker) raised surface on the
light ground. Representative target ramps (final values tuned live for even visual steps and adequate
text contrast against the dark `panel-N-color`):

- `HeritageLight`: app-background `#fbfbfc`, panel-1 `#f0f1f4`, panel-2 `#e6e8ec`, panel-3 `#dadde2`.
- `CleanNeutralLight`: app-background `#ffffff`, panel-1 `#eef0f3`, panel-2 `#e3e6ea`, panel-3 `#d7dbe1`.

Each panel keeps its existing dark `panel-N-color`, which stays well above the contrast floor on these
grays. This also makes the HUD action-menu buttons (panel-2/panel-3 surfaces) read as distinct controls
on light themes.

## Testing

- `ThemeContract` / `ThemeHelpers` unit tests validate the six new tokens across the contract and all
  themes (and confirm `heading-font-color` is gone).
- The six player-HUD e2e specs guard the action menu (sub-button reveal, category open/close) — they
  must stay green after #1/#2.
- Live verification (visual, not headless): #1 sub-button swoosh direction; #2 a category always opens
  with sub-buttons closed regardless of click position; #3 header + body text readable on both light
  themes in the theme editor, a sheet, chat, and the HUD; #4 panels visibly separated from the
  background on both light themes.

## Documentation (required final step)

- Move the four issues to `docs/CLOSED_BUGS.md` (#3 supersedes the partial CLOSED_BUGS #25 fix — note the
  per-level-token replacement).
- Update the `titan-codebase` skill: the per-level header tokens, the `.titan` text-variable override,
  the "all TITAN apps/chat carry `titan`" invariant, and the light-theme panel ramp.
