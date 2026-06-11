# Player HUD bug-fix batch — design

Nine post-ship Player HUD defects/refinements found in live use. All decisions below are settled with
the user; this batch fixes them together because items 2–5 share one subsystem (the action-menu
direction/chip logic) and items 1/9 share the defaults file.

## Fixes

### 1. Portrait default position too far left
The default portrait anchors at `dx: 500` from the left edge (`PlayerHudDefaults.js`), roughly twice
the intended offset. Change to `dx: 250`. Affects fresh installs and explicit layout resets only;
persisted layouts are untouched.

### 2. Minimize chip overlaps the category buttons
The chip corner is already correctly placed on the stable (non-expanding) side via
`actionMenuChipCorner` (`PlayerHudShell.svelte`). The defect is that the action-menu content fills the
frame edge-to-edge, so the chip sits on top of the corner category button. Reserve a gutter on the
chip's edge so the buttons clear it: pass `chipCorner` into `ActionMenuElement`, and reserve padding on
the matching edge of `.action-menu` (bottom for vertical layouts, right for horizontal — sized to the
chip). Corner logic itself is unchanged.

### 3. Expand direction is ignored (the core change)
`resolveCascadeDirection` (`HudGeometry.js`) silently flips the sub-option and sub-button lanes away
from the configured side whenever that side lacks room. Because the default menu sits in a corner, the
preferred side never has room, so the setting appears dead.

**Decision: the configured direction is authoritative — remove the auto-flip.** `subOptionsSide` and
`subButtonsSide` in `ActionMenuElement.svelte` map directly from the stored preference with no
space-based flip. Existing overflow handling stays: sub-options already scroll via `windowSize`, and the
sub-button lane already clamps vertically via `laneTop` (these are alignment, not direction, and remain).
Off-screen horizontal placement is the user's responsibility (edit mode lets them position freely).

`resolveCascadeDirection` and the measurement plumbing that fed *only* it (`barBox`, the `flyoutWidth`/
`flyoutHeight` bindings, and the re-measure `$effect`) are removed where they become dead. `activeOffset`
(horizontal flyout-lane alignment) is preserved — it reads `.active` `offsetLeft`, not `barBox`. Remove
`resolveCascadeDirection`'s unit tests if the function is deleted.

### 4. Sub-button direction in vertical layout follows sub-options
In a vertical layout the sub-button lane should always expand the same way the sub-options do, and the
separate control is meaningless. `subButtonsSide` in vertical derives from `subOptionsSide`; the vertical
sub-button direction `<select>` is hidden in `PlayerHudSettingsShell.svelte`. The stored
`directions.vertical.subButtons` field is kept (harmless) but ignored in vertical.

### 5. Friendlier setting labels
Rename only the two user-facing strings in `lang/en.json`: `subOptionDirection` → "Category expansion",
`subButtonDirection` → "Category button". Localization keys and internal vocabulary are unchanged.

### 6. E2E coverage for filtering and sub-button gates
Add tests (in the action-menu e2e spec) for two config-gated behaviors that currently lack direct
coverage:
- A content filter narrows its category (e.g. `weaponsWithActions` on → only weapons with actions show;
  off → the rest appear). Each absence assertion is a presence→absence transition on the same subject.
- Unchecking a sub-button gate removes that sub-button from every revealed flyout lane.

### 7. Portrait resource max matches the character sheet
`PortraitBars.svelte` renders the max as a plain `.max` chip span. The character sheet uses
`ModifiableStatValueLabel` with the mod breakdown + tooltips (`CharacterSheetResource.svelte`). Replace
the span with `ModifiableStatValueLabel`, passing the same props
(`abilityMod`/`effectMod`/`equipmentMod`/`staticMod`/`baseValue`/`baseTooltip`/`value`) sourced from
`resource[x].mod.*`, `.maxBase`, and `.max`. The current-value input is unchanged.

### 8. Slide-in transitions for action-menu options
Sub-option rows slide in when a category opens — **cascade, staggered**, along the expand direction, with
no out-transition. Apply `in:fly` to the `{#each visible}` rows in `ActionMenuFlyout.svelte` with a
per-index `delay`; axis/sign derive from `vertical` + `subOptionsSide` (passed in). The
`{#key openCategory.key}` remount already fires the in-transition on open.

### 9. Effects list-panel row: stable header + two-line layout + wider default
- **Header stays fixed on expand.** `.row.expanded` currently adds `panel-2` + padding to the whole row,
  shifting/enlarging the header. Apply the expanded panel background/padding to the detail section only;
  the header keeps fixed geometry.
- **Two-line header.** Restructure `.row-header` from `[icon][name][duration]` to
  `[icon][name / duration stacked]`: the icon sits left, vertically centered against a two-line text
  column (name top, duration bottom).
- **Wider default panel.** Effects-panel default width `260 → 300` in `PlayerHudDefaults.js` (and the
  `HudLayoutState` field initializer, for consistency). Fresh/reset only.

## Non-goals / invariants
- No change to action-menu *content* (categories, model building, roll/apply wiring).
- Direction change is behavioral only — the settings schema/shape is unchanged (`directions.vertical.
  subButtons` persists, just ignored in vertical).
- Default changes never disturb persisted layouts.
- `:global` selectors remain forbidden; transitions and new styles stay component-scoped.

## Verification
- `npm run build` clean; unit suite green (including any `resolveCascadeDirection` test removal).
- Targeted e2e where the world is available: `player-hud-action-menu`, `player-hud-action-menu-layout`,
  `player-hud-effects-panel`, `player-hud-portrait`; full suite gated on the user-launched world.
- Manual: direction settings honored in all four layout/side combinations; chip clears the buttons;
  portrait offset and max styling correct; effects row header stable on expand.
