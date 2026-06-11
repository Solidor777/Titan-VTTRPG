# Player HUD — Design

**Date:** 2026-06-11
**Status:** Approved by user (brainstorm session with visual mockups under
`.superpowers/brainstorm/201-1781165079/content/`)

## Summary

A native, theme-aware player HUD for the canvas scene, replacing the existing Effect HUD
(`src/ui/effect-hud/` is deleted; OPEN_BUGS #1 closes with it). Three elements — **portrait**,
**action menu**, **effects panel** — each individually repositionable, toggleable, minimizable, and
style-selectable per user. One controller, one full-viewport pass-through layer, one actor-resolution
ladder. Inspired by Stylish Action HUD (portrait card, edit-mode layout) and Token Action HUD
(category/action cascade), built pure Svelte 5 on the TITAN theme system.

## Non-goals

- No per-actor GM-curated rosters (Stylish Action HUD's party display) — resolution is selection-driven.
- No TAH-style pluggable ActionHandler/RollHandler indirection — the HUD calls `CharacterDataModel`
  methods directly.
- No custom user-defined categories or drag-and-drop action layout editing.
- No changes to check/chat mechanics; every action maps to an existing engine method.

## 1. Scope & visibility

- Shown only over the canvas scene (hidden when no scene is viewed).
- **Actor resolution** extends the existing ladder (`ResolveHudActor.js` semantics):
  - GM: all selected character actors (Players **and** NPCs), in selection order. No fallback.
  - Player: all selected owned characters; if none selected, fall through the existing single-actor
    ladder (selected assigned → selected owned → assigned-with-token-on-scene → first owned token →
    assigned).
  - The first resolved actor is the **primary**.
- **Portrait** and **effects panel** render only when exactly one character resolves.
- **Action menu** renders for one or many. Group mode (2+ resolved) shows only Skills, Resistances,
  and Utility.
- When nothing resolves, no element renders.
- Per-element client setting **combat only**: element hidden unless an active combat has started
  (`game.combat?.started`).
- New client setting **show Foundry hotbar**, default **off** (hotbar hidden by default); toggling
  shows/hides `ui.hotbar` live.

## 2. Portrait element (default: bottom-left)

- Per-user **style** setting, three styles from the mockups:
  1. **Panel card** (default) — square portrait, name plate overlay, bars stacked beneath, icon row foot.
  2. **Round token** — circular portrait with stamina/resolve ring arcs, wounds bar below; bar editing
     falls back to a click popover (arcs are not inline-editable).
  3. **Wide strip** — portrait left; name, bars, and icon row right; minimal height.
- Contents (all styles): portrait image, character name, three **editable resource bars**
  (Stamina / Resolve / Wounds): click the value to type a number (sheet-style input), bar fill is
  reactive.
- **Utility icon row** (icon buttons with tooltips): spend resolve (`spendResolve`), toggle
  inspiration (Players only, `toggleInspiration`), short rest (`shortRest`), long rest (`longRest`),
  reset combat effects (`removeCombatEffects`). These act on the single displayed character.
- Minimize chip in the corner (§5).

## 3. Action menu (default: bottom-right, vertical layout)

### Geometry — cascading columns

- **Vertical layout** (default): categories stack as a column. The active category's sub-options open
  as a **second column** beside it (left/right per user setting). The hovered/focused sub-option's
  sub-buttons open as a **third column** beside that (continuing the cascade; side per setting).
- **Horizontal layout**: categories in a row. Sub-options open as a **column** above/below the active
  category (per setting). Sub-buttons open as a **column** to the left/right of the sub-option (per
  setting).
- **No-overlap rule:** the three cascade levels occupy strictly disjoint lanes — a level never covers
  a previous level. When the configured direction would push a level off-screen or over another
  level, the cascade **flips direction** for that level rather than overlapping or clipping.
- Long sub-option lists clip to a windowed height/width (configurable visible count) with
  mouse-wheel scrolling and overflow arrows.
- **Interaction:** click a category to open (one open at a time); click-away or Escape closes; click
  a sub-option to run its main action; sub-buttons reveal on hover **and** keyboard focus.

### Categories

A category with zero sub-options (after filters) is hidden. Every category and every sub-button
*type* is individually disableable in settings. ◆ = available in group mode; group actions run for
**all** resolved characters.

| Category | Sub-options | Main action (click) | Sub-buttons |
|---|---|---|---|
| Skills ◆ | the 18 skills | `rollAttributeCheck` with the skill's default attribute, all resolved | — |
| Resistances ◆ | the 3 resistances | `rollResistanceCheck`, all resolved | — |
| Weapons | weapon items; filter "has attacks or checks" (default on) | equipped → attack with first attack; unequipped → equip; equipped with no attacks → roll first check; else open sheet | one per attack, one per check, toggle equipped, send to chat, open sheet |
| Inventory | non-weapon items; filter "has checks" (default on) | equippable (armor/shield/equipment) and unequipped → equip; else roll first check; else open sheet | one per check, toggle equipped, +1/−1 quantity (commodities only), send to chat, open sheet |
| Abilities | ability items; filter "has checks" (default on) | roll first check, else open sheet | one per check, send to chat, open sheet |
| Spells | spell items | roll casting check | one per check, send to chat, open sheet |
| Effects | active effects; filter "has checks" (default on) | roll first check, else open sheet | one per check, duration −/+, remove effect, send to chat, open sheet |
| Utility ◆ | toggle inspiration, short rest, long rest, reset combat effects, apply damage, apply healing, apply rend, apply repairs | run for all resolved; the four **apply** actions open an amount-confirmation dialog first, then call `applyDamage` / `applyHealing` / `applyRend` / `applyRepairs` | — |

- Toggle inspiration appears only when at least one resolved character is a Player.
- Equipped state, quantities, and durations shown on sub-options update reactively.

## 4. Effects panel (default: top-right, against the sidebar edge)

- Per-user **style** setting, two styles from the mockups:
  1. **Sectioned list panel** (default) — Conditions and Effects sections; rows show icon, name,
     duration tag; a row expands in place to description, embedded checks, and quick controls.
  2. **Icon tray** — compact icon grid with duration badges; clicking an icon opens a floating
     detail card (description, checks, quick controls) anchored to the icon.
- Quick controls per effect: duration −/+, send to chat, remove, open sheet. Conditions are simple
  entries with remove only.
- **Resizable** (drag handle in edit mode; size persisted per user) and **scrollable** when content
  exceeds the panel size.
- Single character only; hides in group mode.
- Reuses `EmbeddedDocumentProvider`, `DurationTag`, the shared check components, and the
  delete-request path (`requestEffectDeletion`) as today.

## 5. Layout system

- One fixed full-viewport layer appended inside `#interface`, `pointer-events: none`; only element
  surfaces set `pointer-events: auto`. The canvas is never click-blocked outside element bounds.
- **Canvas-bound positions.** Each element's position persists per user as
  `{ anchorX: 'left'|'right', anchorY: 'top'|'bottom', dx, dy }` measured from the edges of the
  **canvas rect** (viewport minus the sidebar's current width). The rect recomputes on sidebar
  expand/collapse (`collapseSidebar` hook) and window resize; all elements re-clamp into it. A
  right-anchored element therefore tracks the sidebar edge: an expanding sidebar pushes it left, a
  collapsing sidebar pulls it right. Elements can never overlap the sidebar.
- Anchors re-derive from the nearest edges on drag end (nearest horizontal edge → `anchorX`, nearest
  vertical edge → `anchorY`).
- **Edit mode** (toggled from the settings app and a registered keybinding): elements show outlines
  and drag handles, the effects panel shows a resize handle, drag snaps to a small grid; positions
  and size save on exit. Outside edit mode nothing is draggable.
- **Minimize chips.** Each element has a corner chip: minimize collapses the element to a small icon
  chip in place; clicking restores. State persists per element per user.

## 6. Settings

All client scope. A dedicated Svelte settings application (a `TitanDialog`-family app), opened from
a Foundry settings-menu entry and from a gear control on the HUD in edit mode. Foundry's flat
settings list holds only the master enable and the menu launcher.

- Master: enable player HUD.
- Hotbar: show Foundry hotbar (default off).
- Per element: enabled, combat only, style (portrait: panel card / round token / wide strip;
  effects: list panel / icon tray).
- Action menu: layout (vertical/horizontal), sub-option direction (left/right or above/below),
  sub-button side (left/right), visible sub-option window size, per-category toggles, per-sub-button
  -type toggles, the four content filters.
- **Reset layout** (positions, sizes, minimized states) and **Reset all to defaults** buttons.
- Hidden client values (not in the form): per-element positions, effects-panel size, minimized
  states.
- The old `enableEffectHud` setting is removed.

## 7. Architecture

`src/ui/player-hud/`:

- `TitanPlayerHud.js` — controller singleton, generalizing the `TitanEffectHud` pattern: builds the
  layer, wires hooks (`controlToken`, `canvasReady`, `updateUser`, `collapseSidebar`, `updateCombat`,
  `deleteCombat`, window `resize`), resolves actors, remounts the shell only when the primary actor
  changes, tears down cleanly.
- `ResolveHudActors.js` — extended ladder returning `{ actors, primary }` (pure, unit-tested);
  supersedes `ResolveHudActor.js`.
- `HudLayoutState.svelte.js` — rune state: canvas rect, per-element positions/anchors, effects-panel
  size, edit mode, minimized flags, open category. Persists via the client settings.
- `PlayerHudShell.svelte` — sets `document`/`sheetDocument` context from the primary's
  `ReactiveDocument` bridge; renders the three elements absolutely positioned from layout state.
- `elements/portrait/`, `elements/action-menu/`, `elements/effects-panel/` — element subtrees; the
  action menu derives category/sub-option/sub-button models with `$derived` reads off the reactive
  actor; group actions iterate the resolved actor list calling `CharacterDataModel` methods.
- `settings/` — the settings application (JS class + Svelte form).

Styling uses theme tokens and mixins exclusively (`panel-*`, spacing, font mixins); no `:global`;
no dynamic imports. The amount-confirmation dialog for apply damage/healing/rend/repairs is a
`TitanDialog`-based confirm with a number input, one shared component parameterized per action.

## 8. Migration & cleanup

- Delete `src/ui/effect-hud/` and its mount/registration; remove `EffectHudEnabled.js` and the
  `enableEffectHud` registration.
- Replace existing effect-hud e2e specs with the new player-HUD suites.
- Hide the hotbar on ready per the setting.

## 9. Testing

Unit (vitest): resolver ladder including group returns and NPC/GM cases; anchor/clamp/re-anchor
math including sidebar push/pull and resize; category model builders (filters, main-action
precedence, empty-category hiding, group-mode category set, commodity/equippable detection);
cascade flip logic.

E2E (full coverage — every surface and action path):

- Visibility matrix: GM vs player, selection states, ladder fallbacks, NPC selection, group mode,
  combat-only per element, no-scene, master disable, per-element disable.
- Portrait: all three styles render; bar inline edit persists to the actor; every utility icon
  (resolve, inspiration incl. NPC absence, short/long rest, reset combat effects).
- Action menu: both layouts; all four direction settings; cascade open/close (click-away, Escape);
  **no-overlap including edge flip**; scroll windowing; every category's main action; every
  sub-button type (attacks, checks, equip toggle, commodity ±1, duration −/+, remove, send to chat,
  open sheet); filters on/off; per-category and per-sub-button disables; group-mode rolls hitting
  all selected; the four apply dialogs end-to-end (amount entered → actor state changes).
- Effects panel: both styles; expand/detail; all quick controls; resize persistence; scrolling;
  group-mode hiding.
- Layout: edit-mode drag + persistence across reload; minimize/restore persistence; sidebar
  expand/collapse push/pull; window-resize clamping; reset layout; reset all.
- Hotbar hidden by default; setting shows it.

## 10. Documentation updates (required final step)

- `docs/OPEN_BUGS.md` #1 → `docs/CLOSED_BUGS.md` (resolved by replacement).
- `docs/TODO.md` #26: note the Effect Tray/HUD pass is superseded for the HUD by this spec.
- Update `.claude/skills/titan-codebase/` references (new `src/ui/player-hud/` subsystem, deleted
  effect-hud, new settings).
