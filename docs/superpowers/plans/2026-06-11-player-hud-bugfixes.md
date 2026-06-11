# Player HUD bug-fix batch — plan

Spec: `docs/superpowers/specs/2026-06-11-player-hud-bugfixes-design.md`.
Branch: `player-hud-bugfixes`. Executed mainline.

## Task 1 — defaults (bugs 1, 9-width)
`PlayerHudDefaults.js`: portrait `dx: 500 → 250`; `effectsPanelSize.width: 260 → 300`. Update the
`HudLayoutState.svelte.js` `effectsPanelSize` field initializer width to `300` for consistency.

## Task 2 — direction authoritative (bugs 3, 4)
`ActionMenuElement.svelte`: `subOptionsSide` maps directly from the configured preference (no
`resolveCascadeDirection`). `subButtonsSide`: horizontal maps from `directions.horizontal.subButtons`;
vertical follows `subOptionsSide`. Remove the now-dead `barBox`, `flyoutWidth`/`flyoutHeight` bindings,
and the re-measure `$effect`, keeping `activeOffset` (horizontal lane alignment). Delete
`resolveCascadeDirection` from `HudGeometry.js` and its unit test once unreferenced.

## Task 3 — settings UI + labels (bugs 4, 5)
`PlayerHudSettingsShell.svelte`: hide the vertical sub-button direction `<select>` (vertical branch).
`lang/en.json`: `subOptionDirection` → "Category expansion", `subButtonDirection` → "Category button".

## Task 4 — minimize-chip gutter (bug 2)
`PlayerHudShell.svelte`: pass `chipCorner={actionMenuChipCorner}` into `ActionMenuElement`.
`ActionMenuElement.svelte`: accept `chipCorner`, reserve padding on the chip's edge (bottom for vertical,
right for horizontal) sized to clear the chip. Corner logic unchanged.

## Task 5 — slide-in transitions (bug 8)
`ActionMenuElement.svelte` passes `vertical` + `subOptionsSide` to `ActionMenuFlyout.svelte`; the
`{#each visible}` rows get `in:fly` with per-index `delay` and axis/sign from `vertical` + side. No
out-transition.

## Task 6 — portrait max styling (bug 7)
`PortraitBars.svelte`: replace the `.max` span with `ModifiableStatValueLabel`, props mirrored from
`CharacterSheetResource.svelte` (`mod.*`, `maxBase`, `max`). Keep the value input. Verify the richer
label fits the compact bar; adjust `.value` styling if needed.

## Task 7 — effects list row (bug 9)
`EffectsListRow.svelte`: move the expanded `panel-2`/padding to the detail section so the header geometry
is stable; restructure `.row-header` to `[icon][name/duration column]` with the icon vertically centered.

## Task 8 — e2e (bug 6)
Add to the action-menu e2e spec: a content-filter narrows its category (presence→absence transition); an
unchecked sub-button gate removes that sub-button from the flyout. Reuse the existing player-hud harness.

## Task 9 — verify
`npm run build`; unit suite (confirm the `resolveCascadeDirection` test removal); targeted e2e
(`player-hud-action-menu`, `-action-menu-layout`, `-effects-panel`, `-portrait`) if the world is up.

## Task 10 — docs + skill
Log the fixed bugs to `docs/CLOSED_BUGS.md` (history); record any deferral to `docs/TODO.md`;
`titan-codebase` skill self-update (direction now authoritative; chip gutter; portrait max label);
`graphify update .`; final branch review; merge + push per session convention.
