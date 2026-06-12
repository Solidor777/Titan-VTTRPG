# HUD Effects Panel + Action Menu Redesign — Design

Date: 2026-06-11
Branch: `feat/drag-reorder-cross-sheet-copy` (working tree already holds partial WIP for Part A)

Two independent pieces of the Player HUD. They share no code and can be built/reviewed
separately, but ship together.

---

## Part A — Effects HUD panel

### Problem

Effect rows overflow into each other and the panel grows unbounded. A working-tree WIP
turned each effect into its own sub-panel but removed the panel's fixed height and inner
scroll, so the panel now grows without limit instead of scrolling.

### Target behaviour

- The **outer panel** has a fixed width *and* height, both user-resizable via the
  edit-mode handle. The pinned header stays put; the effect list is a bounded scroll
  region that scrolls internally when effects exceed the panel height.
- **Each effect is its own sub-panel** (`panel-2`, padded, radius `--titan-border-radius`):
  two columns — icon left (~34px), stacked name-over-duration right. The name truncates
  with ellipsis. The sub-panel sizes to its own content (description, embedded checks,
  wrapped controls), so expanding one effect pushes its neighbours down rather than
  overlapping them.

This reconciles the WIP: **keep** the sub-panel rows, name ellipsis, and wrapped
controls; **restore** the bounded resizable height and inner scroll.

### Components

- `src/ui/player-hud/elements/effects-panel/EffectsPanelElement.svelte`
  - Restore `style:height` bound to `layoutState.effectsPanelSize.height`.
  - `.body` becomes a bounded scroll region again: `flex: 1; min-height: 0;
    overflow-y: auto;` (header remains outside `.body`, pinned).
- `src/ui/player-hud/HudElementFrame.svelte`
  - Restore height in the resize drag (`height: Math.max(120, start.height +
    (move.clientY - origin.y))`) and the `nwse-resize` cursor on the handle.
- `src/ui/player-hud/elements/effects-panel/EffectsListRow.svelte` — keep current WIP
  (sub-panel `.row`, two-column header, name ellipsis).
- `src/ui/player-hud/elements/effects-panel/EffectsDetailBody.svelte` — keep current WIP
  (wrapped controls).
- `src/ui/player-hud/TitanPlayerHud.js` — keep the WIP "retain mount while editing the
  layout" guard so the panel stays visible while it is resized.

### Acceptance

- With more effects than fit, the list scrolls inside the panel; the panel itself does
  not grow past its set height.
- Dragging the edit-mode handle resizes both width and height; the size persists.
- Expanding an effect grows only that sub-panel and shifts the ones below it; no overlap.

---

## Part B — Action menu: vertical alignment, flow setting, refined styling

### Problem

In the vertical layout the flyout of sub-options bottom-aligns with the category column
instead of with the open category button, so there is no visual link between a category
and its sub-options. There is also no control over which way the sub-options stack.

### Target behaviour

1. **Anchor the flyout to the open category (vertical layout).** The first sub-option
   lines up with the open category button's row; additional sub-options flow from there.
   The single-sub-option case lands exactly on the button.

2. **New per-user setting: vertical sub-option flow (up/down).** Orthogonal to the
   existing left/right side. Default **down**: first option on the button, rest below.
   Up: first option on the button, rest above.

3. **Refined-panels styling (both layouts).**
   - Open category keeps its `panel-3` fill plus an accent edge-bar on the side facing the
     flyout. Accent defaults to `--titan-cyan` (swappable; the theme has no dedicated
     accent token).
   - Sub-options show their icon and use roomier vertical padding (~6px).
   - The **hovered/focused** sub-option (the one already revealing its sub-buttons) gets
     the accent highlight. No permanent highlight on the first/anchored option.

### Design / implementation notes

- **Anchoring:** add a vertical counterpart to the existing horizontal `activeOffset`.
  Measure the open category button's vertical offset (and height) within the category bar.
  - Flow down: position the flyout lane so its top aligns to the button's top.
  - Flow up: position the lane so its first (bottom-most) option aligns to the button and
    earlier options stack upward (render the visible window reversed, anchor the lane's
    bottom to the button's bottom).
  - The vertical `.action-menu` container changes from `align-items: flex-end` to an
    anchored layout (e.g. the flyout lane absolutely positioned beside the category
    column on the configured `before`/`after` side, offset by the measured button
    position). The horizontal layout keeps its current `margin-left: activeOffset`
    approach unchanged.
- **Flow setting plumbing:**
  - `src/ui/player-hud/PlayerHudDefaults.js` — add `directions.vertical.subOptionsFlow:
    'down'`.
  - `src/ui/player-hud/settings/PlayerHudSettingsShell.svelte` — in the vertical branch
    (currently a single left/right control), add a second `<select>` for up/down flow,
    bound to `options.actionMenu.directions.vertical.subOptionsFlow`, with its own
    `data-testid` and `onchange={save}`.
  - New i18n keys as needed (e.g. `subOptionFlow`); reuse `expandUp` / `expandDown`.
- **Styling / hover highlight:**
  - `src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte` — accent edge-bar
    on the open category button; measure the vertical anchor offset; pass flow + offset to
    the flyout lane.
  - `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte` — apply up/down flow
    (normal vs reversed window + anchor side); the existing scroll-window fades follow the
    flow direction; pass the hovered key through so the active row is highlighted.
  - `src/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte` — show icon,
    roomier padding, accent highlight when this row is the hovered/revealed one.

### Out of scope / unchanged

- Horizontal layout positioning, the sub-buttons lane behaviour, and scroll windowing
  semantics are unchanged apart from the flow-direction reversal in vertical.
- Minimize-chip corner derivation in `PlayerHudShell.svelte` (keys off
  `directions.vertical.subOptions`) is unaffected by the new flow setting.

### Acceptance

- Vertical layout: opening a category shows its sub-options with the first aligned to that
  category's button; with one sub-option it sits exactly on the button.
- The up/down flow setting reverses the stacking direction and persists per user.
- Open category shows the accent edge-bar; hovering/focusing a sub-option highlights that
  row with the accent and reveals its sub-buttons; no row is highlighted by default.

---

## Documentation (required final step)

- Update `.claude/skills/titan-codebase/` reference files to reflect the effects-panel
  scroll/sub-panel structure and the action-menu vertical anchoring + `subOptionsFlow`
  setting.
- No new `docs/TODO.md` / `docs/OPEN_BUGS.md` entries anticipated; log any deferral or
  discovered bug at the moment it arises.
