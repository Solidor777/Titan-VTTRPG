# Player HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: On Fable-class models use `mainline-plan-execution`
> (per `~/.claude/CLAUDE.md`) — tasks run mainline with an inline compliance check each, plus ONE
> dispatched fresh-context review of the full branch at the end. On other models fall back to
> superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three-element player HUD (portrait, cascading action menu, effects panel) from
`docs/superpowers/specs/2026-06-11-player-hud-design.md`, replacing `src/ui/effect-hud/`.

**Architecture:** One `TitanPlayerHud` controller singleton owns a full-viewport pass-through layer
and remounts a single Svelte shell when the resolved actor set changes. Pure modules
(`ResolveHudActors`, `HudGeometry`, `BuildActionMenuModel`) carry all decision logic and are
unit-tested first; Svelte components stay thin. Positions anchor to the canvas rect (viewport minus
sidebar) so sidebar push/pull falls out of rect recomputation.

**Tech Stack:** Svelte 5 runes mounted into raw DOM (no ApplicationV2 for the HUD itself;
ApplicationV2 only for the settings app), Foundry v14 hooks, vitest, Playwright.

**Branch:** `feature/player-hud` off `main`.

**Working rules for every task** (from `.claude/CLAUDE.md`, restated so a fresh engineer can't miss
them): 120-char wrap; multi-line `{}` always; typed JSDoc comments on every variable/function; no
`:global` styles; SCSS mixins are auto-injected (`vite.shared.mjs` prepends `Root.scss` — never
`@use` them manually in components); `~/` is the `src/` alias; localize via
`localize('key')` → `LOCAL.<key>.text` in `lang/en.json`; `testId` props forward `data-testid` to
the native element (no wrapper divs). Run `npx eslint <files>` on touched files before each commit.
**Never stage anything under `packs/`.**

---

## File structure

```
src/ui/player-hud/
  TitanPlayerHud.js                controller singleton (layer, hooks, resolution, mount, hotbar)
  ResolveHudActors.js              pure actor-resolution ladder → { actors, primary }
  HudGeometry.js                   pure rect/anchor/clamp/cascade-direction math
  HudLayoutState.svelte.js         rune state: rect, positions, sizes, minimized, edit mode, combat
  PlayerHudDefaults.js             default options + default layout factories
  PlayerHudShell.svelte            context provider + element visibility gating + edit toolbar
  HudElementFrame.svelte           shared element wrapper: positioning, drag, resize, minimize chip
  HudEditToolbar.svelte            edit-mode toolbar: Done / Reset layout / Settings
  elements/portrait/
    PortraitElement.svelte         style dispatcher
    PortraitPanelCard.svelte       style: vertical panel card (default)
    PortraitRoundToken.svelte      style: round token with ring bars + bars popover
    PortraitWideStrip.svelte       style: wide horizontal strip
    PortraitBars.svelte            shared editable Stamina/Resolve/Wounds bars
    PortraitUtilityRow.svelte      shared utility icon row
  elements/action-menu/
    ActionMenuElement.svelte       category bar (vertical/horizontal) + open/close behavior
    ActionMenuFlyout.svelte        sub-option window (scroll, flip) + hovered sub-buttons column
    ActionMenuSubOption.svelte     one sub-option row/button
    ActionMenuSubButtons.svelte    the sub-button column for the hovered sub-option
    BuildActionMenuModel.js        pure category/sub-option/sub-button model builder
    HudAmountDialog.js             TitanDialog subclass for apply damage/healing/rend/repairs
    HudAmountDialogShell.svelte    amount input + confirm
  elements/effects-panel/
    EffectsPanelElement.svelte     style dispatcher + scroll body sized from layout state
    EffectsListPanel.svelte        style: sectioned list (default)
    EffectsListRow.svelte          list row (adapted from EffectHudRow + duration ± + open sheet)
    EffectsIconTray.svelte         style: icon grid with duration badges
    EffectsDetailPopout.svelte     floating detail card for the tray style
  settings/
    PlayerHudSettingsApplication.js  ApplicationV2 (ThemeEditorApplication pattern)
    PlayerHudSettingsShell.svelte    grouped form, live-writes options, reset buttons

src/helpers/Settings/
  EnablePlayerHud.js               getter
  ShowFoundryHotbar.js             getter
  PlayerHudOptions.js              getter merged over defaults
  PlayerHudLayout.js               getter merged over defaults

tests/unit/
  ResolveHudActors.test.js         (replaces ResolveHudActor.test.js in Task 14)
  HudGeometry.test.js
  HudLayoutState.test.js
  BuildActionMenuModel.test.js

tests/e2e/
  player-hud-visibility.spec.js
  player-hud-portrait.spec.js
  player-hud-action-menu.spec.js
  player-hud-action-menu-layout.spec.js
  player-hud-effects-panel.spec.js
  player-hud-layout.spec.js

Modified: src/system/SystemSettings.js, src/hooks/OnceReady.js, lang/en.json,
tests/e2e/world.js (helper refresh swap), docs/*, .claude/skills/titan-codebase/*.
Deleted (Task 14): src/ui/effect-hud/ (all 7 files), src/helpers/Settings/EffectHudEnabled.js,
tests/unit/ResolveHudActor.test.js, tests/e2e/effect-hud.spec.js.
```

Settings model (4 registered keys, all `scope: 'client'`):

- `enablePlayerHud` — Boolean, `config: true`, default `true`.
- `showFoundryHotbar` — Boolean, `config: true`, default `false`.
- `playerHudOptions` — Object, `config: false`, default `{}`; read merged over
  `createDefaultHudOptions()`. Owned by the settings app.
- `playerHudLayout` — Object, `config: false`, default `{}`; read merged over
  `createDefaultHudLayout()`. Owned by edit mode (positions, effects-panel size, minimized flags).

---

### Task 1: Branch, defaults module, settings registration, lang keys

**Files:**
- Create: `src/ui/player-hud/PlayerHudDefaults.js`
- Create: `src/helpers/Settings/EnablePlayerHud.js`, `src/helpers/Settings/ShowFoundryHotbar.js`,
  `src/helpers/Settings/PlayerHudOptions.js`, `src/helpers/Settings/PlayerHudLayout.js`
- Modify: `src/system/SystemSettings.js` (next to the `enableEffectHud` block at :40-48)
- Modify: `lang/en.json`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feature/player-hud main
```

- [ ] **Step 2: Write `src/ui/player-hud/PlayerHudDefaults.js`**

```javascript
/** @type {Array<string>} The HUD element keys, in render order. */
export const HUD_ELEMENT_KEYS = ['portrait', 'actionMenu', 'effectsPanel'];

/**
 * Creates the default per-user HUD options.
 * @returns {object} A fresh defaults object (safe to mutate).
 */
export function createDefaultHudOptions() {
   return {
      portrait: {
         combatOnly: false,
         enabled: true,
         style: 'panelCard',
      },
      actionMenu: {
         categories: {
            abilities: true,
            effects: true,
            inventory: true,
            resistances: true,
            skills: true,
            spells: true,
            utility: true,
            weapons: true,
         },
         combatOnly: false,
         directions: {
            horizontal: {
               subButtons: 'right',
               subOptions: 'up',
            },
            vertical: {
               subButtons: 'left',
               subOptions: 'left',
            },
         },
         enabled: true,
         filters: {
            abilitiesWithChecks: true,
            effectsWithChecks: true,
            inventoryWithChecks: true,
            weaponsWithActions: true,
         },
         layout: 'vertical',
         subButtons: {
            attacks: true,
            checks: true,
            duration: true,
            equipped: true,
            openSheet: true,
            quantity: true,
            remove: true,
            sendToChat: true,
         },
         windowSize: 8,
      },
      effectsPanel: {
         combatOnly: false,
         enabled: true,
         style: 'list',
      },
   };
}

/**
 * Creates the default per-user HUD layout (positions are canvas-rect anchored).
 * @returns {object} A fresh layout object (safe to mutate).
 */
export function createDefaultHudLayout() {
   return {
      effectsPanelSize: {
         height: 320,
         width: 260,
      },
      minimized: {
         actionMenu: false,
         effectsPanel: false,
         portrait: false,
      },
      positions: {
         actionMenu: {
            anchorX: 'right',
            anchorY: 'bottom',
            dx: 16,
            dy: 16,
         },
         effectsPanel: {
            anchorX: 'right',
            anchorY: 'top',
            dx: 16,
            dy: 16,
         },
         portrait: {
            anchorX: 'left',
            anchorY: 'bottom',
            dx: 16,
            dy: 16,
         },
      },
   };
}
```

- [ ] **Step 3: Write the four setting getters**

`src/helpers/Settings/EnablePlayerHud.js`:

```javascript
import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Reads whether the Player HUD is enabled.
 * @returns {boolean} True if the HUD should be shown.
 */
export default function enablePlayerHud() {
   return getSetting('enablePlayerHud');
}
```

`src/helpers/Settings/ShowFoundryHotbar.js`:

```javascript
import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Reads whether the core Foundry hotbar should be visible.
 * @returns {boolean} True if the hotbar should be shown.
 */
export default function showFoundryHotbar() {
   return getSetting('showFoundryHotbar');
}
```

`src/helpers/Settings/PlayerHudOptions.js`:

```javascript
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import { createDefaultHudOptions } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Reads the stored Player HUD options merged over the defaults.
 * @returns {object} The effective HUD options.
 */
export default function playerHudOptions() {
   return foundry.utils.mergeObject(
      createDefaultHudOptions(),
      getSetting('playerHudOptions') ?? {},
      { inplace: false },
   );
}
```

`src/helpers/Settings/PlayerHudLayout.js`:

```javascript
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import { createDefaultHudLayout } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Reads the stored Player HUD layout merged over the defaults.
 * @returns {object} The effective HUD layout.
 */
export default function playerHudLayout() {
   return foundry.utils.mergeObject(
      createDefaultHudLayout(),
      getSetting('playerHudLayout') ?? {},
      { inplace: false },
   );
}
```

- [ ] **Step 4: Register the settings in `src/system/SystemSettings.js`**

Insert directly below the `enableEffectHud` registration (the menu + keybinding land in Task 16):

```javascript
   game.settings.register('titan', 'enablePlayerHud', {
      config: true,
      default: true,
      hint: 'SETTINGS.enablePlayerHud.hint',
      name: 'SETTINGS.enablePlayerHud.label',
      scope: 'client',
      type: Boolean,
      onChange: () => game.titan?.playerHud?.refresh(),
   });

   game.settings.register('titan', 'showFoundryHotbar', {
      config: true,
      default: false,
      hint: 'SETTINGS.showFoundryHotbar.hint',
      name: 'SETTINGS.showFoundryHotbar.label',
      scope: 'client',
      type: Boolean,
      onChange: () => game.titan?.playerHud?.applyHotbarVisibility(),
   });

   game.settings.register('titan', 'playerHudOptions', {
      config: false,
      default: {},
      scope: 'client',
      type: Object,
      onChange: () => game.titan?.playerHud?.refresh({ force: true }),
   });

   game.settings.register('titan', 'playerHudLayout', {
      config: false,
      default: {},
      scope: 'client',
      type: Object,
   });
```

- [ ] **Step 5: Add lang keys to `lang/en.json`**

Add the `SETTINGS.*` pairs, and each `LOCAL.*` key below ONLY if it does not already exist
(several do — check each):

```json
"SETTINGS.enablePlayerHud.label": "Enable Player HUD",
"SETTINGS.enablePlayerHud.hint": "Shows the on-canvas player HUD (portrait, action menu, and effects panel).",
"SETTINGS.showFoundryHotbar.label": "Show Foundry Hotbar",
"SETTINGS.showFoundryHotbar.hint": "Shows the core macro hotbar. The TITAN player HUD replaces it by default.",

"LOCAL.playerHud.text": "Player HUD",
"LOCAL.skills.text": "Skills",
"LOCAL.resistances.text": "Resistances",
"LOCAL.weapons.text": "Weapons",
"LOCAL.inventory.text": "Inventory",
"LOCAL.abilities.text": "Abilities",
"LOCAL.spells.text": "Spells",
"LOCAL.effects.text": "Effects",
"LOCAL.utility.text": "Utility",
"LOCAL.applyDamage.text": "Apply Damage",
"LOCAL.applyHealing.text": "Apply Healing",
"LOCAL.applyRend.text": "Apply Rend",
"LOCAL.applyRepairs.text": "Apply Repairs",
"LOCAL.amount.text": "Amount",
"LOCAL.equip.text": "Equip",
"LOCAL.unequip.text": "Unequip",
"LOCAL.increaseQuantity.text": "Increase Quantity",
"LOCAL.decreaseQuantity.text": "Decrease Quantity",
"LOCAL.increaseDuration.text": "Increase Duration",
"LOCAL.decreaseDuration.text": "Decrease Duration",
"LOCAL.openSheet.text": "Open Sheet",
"LOCAL.rollCastingCheck.text": "Roll Casting Check",
"LOCAL.minimizeElement.text": "Minimize",
"LOCAL.restoreElement.text": "Restore",
"LOCAL.editLayout.text": "Edit Layout",
"LOCAL.exitEditLayout.text": "Done",
"LOCAL.resetLayout.text": "Reset Layout",
"LOCAL.resetAllDefaults.text": "Reset All to Defaults",
"LOCAL.playerHudSettings.text": "Player HUD Settings"
```

- [ ] **Step 6: Lint and commit**

```bash
npx eslint src/ui/player-hud/PlayerHudDefaults.js src/helpers/Settings/EnablePlayerHud.js src/helpers/Settings/ShowFoundryHotbar.js src/helpers/Settings/PlayerHudOptions.js src/helpers/Settings/PlayerHudLayout.js src/system/SystemSettings.js
git add src/ui/player-hud/PlayerHudDefaults.js src/helpers/Settings/ src/system/SystemSettings.js lang/en.json
git commit -m "feat: player HUD settings foundation (defaults, registration, lang keys)"
```

---

### Task 2: ResolveHudActors (TDD)

The multi-actor ladder. GM: all selected characters, no fallback. Player: all selected owned
characters; if none, the existing single-actor ladder. `primary` = first entry.

**Files:**
- Create: `tests/unit/ResolveHudActors.test.js`
- Create: `src/ui/player-hud/ResolveHudActors.js`

- [ ] **Step 1: Write the failing tests**

`tests/unit/ResolveHudActors.test.js` (style mirrors `tests/unit/ResolveHudActor.test.js`):

```javascript
import { describe, it, expect } from 'vitest';
import resolveHudActors from '~/ui/player-hud/ResolveHudActors.js';

/**
 * Builds a minimal actor stub.
 * @param {string} id - The actor id.
 * @param {boolean} [isOwner] - Whether the current user owns the actor.
 * @returns {object} The actor stub.
 */
function actor(id, isOwner = true) {
   return { id, isOwner };
}

describe('resolveHudActors', () => {
   it('returns all selected characters for a GM, in selection order', () => {
      const a = actor('a');
      const b = actor('b');
      const result = resolveHudActors({ isGM: true, selected: [a, b], owned: [], assigned: null });
      expect(result.actors).toEqual([a, b]);
      expect(result.primary).toBe(a);
   });

   it('returns empty for a GM with no selection (no fallback)', () => {
      const result = resolveHudActors({ isGM: true, selected: [], owned: [actor('a')], assigned: actor('b') });
      expect(result.actors).toEqual([]);
      expect(result.primary).toBe(null);
   });

   it('returns all selected owned characters for a player', () => {
      const mine = actor('mine');
      const theirs = actor('theirs', false);
      const mine2 = actor('mine2');
      const result = resolveHudActors({ isGM: false, selected: [theirs, mine, mine2], owned: [], assigned: null });
      expect(result.actors).toEqual([mine, mine2]);
      expect(result.primary).toBe(mine);
   });

   it('puts the assigned character first when it is among the player selection', () => {
      const assigned = actor('assigned');
      const other = actor('other');
      const result = resolveHudActors({ isGM: false, selected: [other, assigned], owned: [], assigned });
      expect(result.actors).toEqual([assigned, other]);
      expect(result.primary).toBe(assigned);
   });

   it('falls back to the assigned character with an owned token on scene', () => {
      const assigned = actor('assigned');
      const result = resolveHudActors({ isGM: false, selected: [], owned: [actor('x'), assigned], assigned });
      expect(result.actors).toEqual([assigned]);
   });

   it('falls back to the first owned token when the assigned character has none', () => {
      const first = actor('first');
      const result = resolveHudActors({ isGM: false, selected: [], owned: [first, actor('b')], assigned: null });
      expect(result.actors).toEqual([first]);
   });

   it('falls back to the assigned character even with no token on scene', () => {
      const assigned = actor('assigned');
      const result = resolveHudActors({ isGM: false, selected: [], owned: [], assigned });
      expect(result.actors).toEqual([assigned]);
   });

   it('returns empty when nothing resolves', () => {
      const result = resolveHudActors({ isGM: false, selected: [], owned: [], assigned: null });
      expect(result.actors).toEqual([]);
      expect(result.primary).toBe(null);
   });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/ResolveHudActors.test.js`
Expected: FAIL — cannot resolve `~/ui/player-hud/ResolveHudActors.js`.

- [ ] **Step 3: Write `src/ui/player-hud/ResolveHudActors.js`**

```javascript
/**
 * Resolves which character actors the Player HUD should display.
 * GMs get all selected characters with no fallback. Players get all selected owned characters
 * (assigned character first when present); with no selection, the single-actor precedence ladder
 * applies: assigned-with-owned-token-on-scene, then first owned token, then the assigned character
 * even with no token.
 * @param {object} params - Resolution inputs.
 * @param {boolean} params.isGM - Whether the current user is a GM.
 * @param {Array<Actor>} params.selected - Character actors of selected tokens, in selection order.
 * @param {Array<Actor>} params.owned - Character actors the user owns on the scene, in placeable order.
 * @param {Actor | null} params.assigned - The user's assigned character, or null.
 * @returns {{actors: Array<Actor>, primary: Actor | null}} The resolved actors and the primary.
 */
export default function resolveHudActors({ isGM, selected, owned, assigned }) {
   /**
    * Wraps an actor list as the resolution result.
    * @param {Array<Actor>} actors - The resolved actors.
    * @returns {{actors: Array<Actor>, primary: Actor | null}} The result shape.
    */
   const result = (actors) => {
      return { actors, primary: actors[0] ?? null };
   };

   // GMs track the selection only.
   if (isGM) {
      return result(selected);
   }

   // Players: all selected owned characters, with the assigned character promoted to primary.
   const selectedOwned = selected.filter((actor) => actor.isOwner);
   if (selectedOwned.length > 0) {
      const assignedIdx = selectedOwned.findIndex((actor) => actor.id === assigned?.id);
      if (assignedIdx > 0) {
         selectedOwned.unshift(selectedOwned.splice(assignedIdx, 1)[0]);
      }
      return result(selectedOwned);
   }

   // No selection: the assigned character, when the user owns a token of it on the scene.
   if (assigned && owned.some((actor) => actor.id === assigned.id)) {
      return result([assigned]);
   }

   // No selection: any owned token.
   if (owned.length > 0) {
      return result([owned[0]]);
   }

   // No selection: the assigned character, even with no token.
   return result(assigned ? [assigned] : []);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/ResolveHudActors.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/ResolveHudActors.test.js src/ui/player-hud/ResolveHudActors.js
git commit -m "feat: player HUD multi-actor resolution ladder"
```

---

### Task 3: HudGeometry (TDD)

Pure math: canvas rect, anchored-position resolution, clamping, anchor derivation, and cascade
direction (the no-overlap edge flip).

**Files:**
- Create: `tests/unit/HudGeometry.test.js`
- Create: `src/ui/player-hud/HudGeometry.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect } from 'vitest';
import {
   clampPoint,
   computeCanvasRect,
   deriveAnchors,
   resolveCascadeDirection,
   resolvePosition,
} from '~/ui/player-hud/HudGeometry.js';

/** @type {object} A 1000x800 canvas rect with a 300px sidebar already subtracted. */
const RECT = { left: 0, top: 0, width: 1000, height: 800 };

describe('computeCanvasRect', () => {
   it('subtracts the sidebar width from the viewport', () => {
      expect(computeCanvasRect({ viewportWidth: 1300, viewportHeight: 800, sidebarWidth: 300 }))
         .toEqual({ left: 0, top: 0, width: 1000, height: 800 });
   });
});

describe('resolvePosition', () => {
   it('resolves a left/bottom anchored position', () => {
      const position = { anchorX: 'left', anchorY: 'bottom', dx: 16, dy: 16 };
      expect(resolvePosition(position, { width: 100, height: 50 }, RECT)).toEqual({ x: 16, y: 734 });
   });

   it('resolves a right/top anchored position against the rect edge', () => {
      const position = { anchorX: 'right', anchorY: 'top', dx: 16, dy: 16 };
      expect(resolvePosition(position, { width: 100, height: 50 }, RECT)).toEqual({ x: 884, y: 16 });
   });

   it('clamps into the rect when the offset overflows (sidebar push)', () => {
      const position = { anchorX: 'right', anchorY: 'top', dx: -50, dy: 16 };
      expect(resolvePosition(position, { width: 100, height: 50 }, RECT).x).toBe(900);
   });
});

describe('clampPoint', () => {
   it('clamps a point so the element stays fully inside the rect', () => {
      expect(clampPoint({ x: 980, y: -20 }, { width: 100, height: 50 }, RECT)).toEqual({ x: 900, y: 0 });
   });
});

describe('deriveAnchors', () => {
   it('anchors to the nearest edges with non-negative offsets', () => {
      const anchors = deriveAnchors({ x: 850, y: 30 }, { width: 100, height: 50 }, RECT);
      expect(anchors).toEqual({ anchorX: 'right', anchorY: 'top', dx: 50, dy: 30 });
   });

   it('anchors left/bottom when the element center sits in that quadrant', () => {
      const anchors = deriveAnchors({ x: 20, y: 700 }, { width: 100, height: 50 }, RECT);
      expect(anchors).toEqual({ anchorX: 'left', anchorY: 'bottom', dx: 20, dy: 50 });
   });
});

describe('resolveCascadeDirection', () => {
   it('keeps the preferred direction when it fits', () => {
      expect(resolveCascadeDirection({ preferred: 'before', spaceBefore: 200, spaceAfter: 50, required: 150 }))
         .toBe('before');
   });

   it('flips when the preferred side cannot fit but the other can', () => {
      expect(resolveCascadeDirection({ preferred: 'before', spaceBefore: 100, spaceAfter: 300, required: 150 }))
         .toBe('after');
   });

   it('keeps the preferred direction when neither side fits', () => {
      expect(resolveCascadeDirection({ preferred: 'after', spaceBefore: 100, spaceAfter: 100, required: 150 }))
         .toBe('after');
   });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/HudGeometry.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/ui/player-hud/HudGeometry.js`**

```javascript
/**
 * Computes the canvas-area rect the HUD may occupy (the viewport minus the sidebar).
 * @param {object} params - Measurement inputs.
 * @param {number} params.viewportWidth - The window inner width.
 * @param {number} params.viewportHeight - The window inner height.
 * @param {number} params.sidebarWidth - The sidebar's current rendered width.
 * @returns {{left: number, top: number, width: number, height: number}} The usable rect.
 */
export function computeCanvasRect({ viewportWidth, viewportHeight, sidebarWidth }) {
   return {
      left: 0,
      top: 0,
      width: Math.max(0, viewportWidth - sidebarWidth),
      height: viewportHeight,
   };
}

/**
 * Clamps a top-left point so an element of the given size stays fully inside the rect.
 * @param {{x: number, y: number}} point - The candidate top-left point.
 * @param {{width: number, height: number}} size - The element size.
 * @param {object} rect - The canvas rect.
 * @returns {{x: number, y: number}} The clamped point.
 */
export function clampPoint(point, size, rect) {
   return {
      x: Math.min(Math.max(point.x, rect.left), Math.max(rect.left, rect.left + rect.width - size.width)),
      y: Math.min(Math.max(point.y, rect.top), Math.max(rect.top, rect.top + rect.height - size.height)),
   };
}

/**
 * Resolves an anchored position to clamped viewport coordinates.
 * @param {{anchorX: string, anchorY: string, dx: number, dy: number}} position - The stored anchors.
 * @param {{width: number, height: number}} size - The element size.
 * @param {object} rect - The canvas rect.
 * @returns {{x: number, y: number}} The resolved top-left point.
 */
export function resolvePosition(position, size, rect) {
   /** @type {number} The unclamped x coordinate. */
   const x = position.anchorX === 'left'
      ? rect.left + position.dx
      : rect.left + rect.width - position.dx - size.width;

   /** @type {number} The unclamped y coordinate. */
   const y = position.anchorY === 'top'
      ? rect.top + position.dy
      : rect.top + rect.height - position.dy - size.height;

   return clampPoint({ x, y }, size, rect);
}

/**
 * Derives edge anchors from a resolved point, snapping to the nearest horizontal and vertical edge.
 * @param {{x: number, y: number}} point - The element's top-left point.
 * @param {{width: number, height: number}} size - The element size.
 * @param {object} rect - The canvas rect.
 * @returns {{anchorX: string, anchorY: string, dx: number, dy: number}} The derived anchors.
 */
export function deriveAnchors(point, size, rect) {
   /** @type {number} The element center x, relative to the rect. */
   const centerX = point.x - rect.left + (size.width / 2);

   /** @type {number} The element center y, relative to the rect. */
   const centerY = point.y - rect.top + (size.height / 2);

   /** @type {string} The nearest horizontal edge. */
   const anchorX = centerX <= rect.width / 2 ? 'left' : 'right';

   /** @type {string} The nearest vertical edge. */
   const anchorY = centerY <= rect.height / 2 ? 'top' : 'bottom';

   return {
      anchorX,
      anchorY,
      dx: Math.max(0, anchorX === 'left' ? point.x - rect.left : rect.left + rect.width - point.x - size.width),
      dy: Math.max(0, anchorY === 'top' ? point.y - rect.top : rect.top + rect.height - point.y - size.height),
   };
}

/**
 * Picks the expansion side for a cascade level so levels never overlap: the preferred side wins
 * when it fits; otherwise flip when (and only when) the opposite side fits.
 * @param {object} params - Available space inputs.
 * @param {string} params.preferred - The configured side: 'before' (left/up) or 'after' (right/down).
 * @param {number} params.spaceBefore - Free pixels on the 'before' side.
 * @param {number} params.spaceAfter - Free pixels on the 'after' side.
 * @param {number} params.required - Pixels the level needs.
 * @returns {string} The side to expand toward: 'before' or 'after'.
 */
export function resolveCascadeDirection({ preferred, spaceBefore, spaceAfter, required }) {
   /** @type {number} Free pixels on the preferred side. */
   const preferredSpace = preferred === 'before' ? spaceBefore : spaceAfter;

   /** @type {number} Free pixels on the opposite side. */
   const otherSpace = preferred === 'before' ? spaceAfter : spaceBefore;

   if (preferredSpace >= required || otherSpace < required) {
      return preferred;
   }

   return preferred === 'before' ? 'after' : 'before';
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/HudGeometry.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/HudGeometry.test.js src/ui/player-hud/HudGeometry.js
git commit -m "feat: player HUD geometry math (canvas rect, anchors, cascade flip)"
```

### Task 4: HudLayoutState (TDD)

Rune state with injected persistence so unit tests pass plain objects (no `game.settings`).

**Files:**
- Create: `tests/unit/HudLayoutState.test.js`
- Create: `src/ui/player-hud/HudLayoutState.svelte.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect, vi } from 'vitest';
import HudLayoutState from '~/ui/player-hud/HudLayoutState.svelte.js';
import { createDefaultHudLayout } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Builds a state instance over a default layout with a spy saver.
 * @returns {{state: HudLayoutState, onSave: Function}} The state and its save spy.
 */
function build() {
   const onSave = vi.fn();
   return { state: new HudLayoutState({ layout: createDefaultHudLayout(), onSave }), onSave };
}

describe('HudLayoutState', () => {
   it('loads positions, size, and minimized flags from the layout', () => {
      const { state } = build();
      expect(state.positions.portrait.anchorX).toBe('left');
      expect(state.effectsPanelSize.width).toBe(260);
      expect(state.minimized.actionMenu).toBe(false);
   });

   it('persists a snapshot on persist()', () => {
      const { state, onSave } = build();
      state.positions.portrait = { anchorX: 'right', anchorY: 'top', dx: 1, dy: 2 };
      state.persist();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
         positions: expect.objectContaining({
            portrait: { anchorX: 'right', anchorY: 'top', dx: 1, dy: 2 },
         }),
      }));
   });

   it('toggles and persists minimized state', () => {
      const { state, onSave } = build();
      state.toggleMinimized('portrait');
      expect(state.minimized.portrait).toBe(true);
      expect(onSave).toHaveBeenCalled();
   });

   it('resets to defaults and persists', () => {
      const { state, onSave } = build();
      state.positions.portrait.dx = 400;
      state.minimized.portrait = true;
      state.reset();
      expect(state.positions.portrait.dx).toBe(16);
      expect(state.minimized.portrait).toBe(false);
      expect(onSave).toHaveBeenCalled();
   });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/HudLayoutState.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/ui/player-hud/HudLayoutState.svelte.js`**

```javascript
import { createDefaultHudLayout } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Shared Player HUD layout/UI state, preserved across shell remounts. Persistence is injected so
 * the class stays settings-agnostic (and unit-testable).
 * @class HudLayoutState
 */
export default class HudLayoutState {
   /** @type {{left: number, top: number, width: number, height: number}} The usable canvas rect. */
   rect = $state({ left: 0, top: 0, width: 0, height: 0 });

   /** @type {object} Per-element anchored positions, keyed by element key. */
   positions = $state({});

   /** @type {{width: number, height: number}} The effects panel's user-set size. */
   effectsPanelSize = $state({ width: 260, height: 320 });

   /** @type {object} Per-element minimized flags, keyed by element key. */
   minimized = $state({});

   /** @type {boolean} Whether layout-edit mode is active. */
   editMode = $state(false);

   /** @type {boolean} Whether an active combat encounter has started. */
   combatActive = $state(false);

   /** @type {string | null} The open action-menu category key, or null when closed. */
   openCategory = $state(null);

   /** @type {Function} Receives a plain layout snapshot to persist. */
   #onSave;

   /**
    * Builds the state from a stored layout.
    * @param {object} params - Construction inputs.
    * @param {object} params.layout - The effective stored layout (already merged over defaults).
    * @param {Function} params.onSave - Called with a plain layout snapshot to persist.
    */
   constructor({ layout, onSave }) {
      this.#onSave = onSave;
      this.#load(layout);
   }

   /**
    * Loads layout fields into the rune state.
    * @param {object} layout - The layout to load.
    * @returns {void}
    */
   #load(layout) {
      this.positions = layout.positions;
      this.effectsPanelSize = layout.effectsPanelSize;
      this.minimized = layout.minimized;
   }

   /**
    * Persists the current layout via the injected saver.
    * @returns {void}
    */
   persist() {
      this.#onSave($state.snapshot({
         effectsPanelSize: this.effectsPanelSize,
         minimized: this.minimized,
         positions: this.positions,
      }));
   }

   /**
    * Toggles an element's minimized state and persists.
    * @param {string} elementKey - The element key.
    * @returns {void}
    */
   toggleMinimized(elementKey) {
      this.minimized[elementKey] = !this.minimized[elementKey];
      this.persist();
   }

   /**
    * Restores the default layout and persists.
    * @returns {void}
    */
   reset() {
      this.#load(createDefaultHudLayout());
      this.persist();
   }
}
```

NOTE: `$state.snapshot` of nested `$state` is the documented way to get plain JSON (see svelte-5
skill, runes reference). If `vitest` chokes on the `.svelte.js` rune file, confirm
`vitest.config.mjs` already processes `.svelte.js` via the Svelte plugin (it does for
`ReactiveDocument.svelte.js` tests — mirror that setup, change nothing).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/HudLayoutState.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/HudLayoutState.test.js src/ui/player-hud/HudLayoutState.svelte.js
git commit -m "feat: player HUD layout state with injected persistence"
```

---

### Task 5: Controller, shell, element frame

The visible skeleton: layer, hooks, resolution, hotbar control, the shared element frame with
positioning + drag + minimize, and the edit toolbar. After this task the HUD exists but has no
elements; the portrait (Task 6) makes it visible.

**Files:**
- Create: `src/ui/player-hud/TitanPlayerHud.js`
- Create: `src/ui/player-hud/PlayerHudShell.svelte`
- Create: `src/ui/player-hud/HudElementFrame.svelte`
- Create: `src/ui/player-hud/HudEditToolbar.svelte`
- Modify: `src/hooks/OnceReady.js` (below the effect-hud lines at :40-42 — the effect HUD stays
  alive until Task 14)

- [ ] **Step 1: Write `src/ui/player-hud/TitanPlayerHud.js`**

```javascript
import { mount, unmount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import PlayerHudShell from '~/ui/player-hud/PlayerHudShell.svelte';
import HudLayoutState from '~/ui/player-hud/HudLayoutState.svelte.js';
import resolveHudActors from '~/ui/player-hud/ResolveHudActors.js';
import { computeCanvasRect } from '~/ui/player-hud/HudGeometry.js';
import enablePlayerHud from '~/helpers/Settings/EnablePlayerHud.js';
import showFoundryHotbar from '~/helpers/Settings/ShowFoundryHotbar.js';
import playerHudOptions from '~/helpers/Settings/PlayerHudOptions.js';
import playerHudLayout from '~/helpers/Settings/PlayerHudLayout.js';

/**
 * Singleton controller for the Player HUD. Owns the full-viewport pass-through layer, wires the
 * reactivity hooks, resolves the displayed actors, controls the core hotbar's visibility, and
 * mounts/unmounts the Svelte tree.
 * @class TitanPlayerHud
 */
export default class TitanPlayerHud {
   /** @type {HTMLElement | undefined} The full-viewport layer appended to the UI. */
   #element;

   /** @type {object | undefined} The active Svelte mount handle. */
   #handle;

   /** @type {ReactiveDocument | undefined} Bridge around the current primary actor. */
   #bridge;

   /** @type {string | undefined} Identity key of the currently-mounted actor set. */
   #mountKey;

   /** @type {HudLayoutState | undefined} Shared layout state, preserved across remounts. */
   #layoutState;

   /** @type {number | undefined} The pending sidebar re-measure timer id. */
   #sidebarTimer;

   /**
    * Initializes the HUD: builds the layer, wires hooks, applies hotbar visibility, renders once.
    * @returns {void}
    */
   init() {
      // Guard against double-initialization so hooks and the layer are never duplicated.
      if (this.#element) {
         return;
      }

      this.#layoutState = new HudLayoutState({
         layout: playerHudLayout(),
         onSave: (layout) => game.settings.set('titan', 'playerHudLayout', layout),
      });

      // The layer itself never captures pointer events; element frames opt back in.
      this.#element = window.document.createElement('div');
      this.#element.id = 'titan-player-hud';
      this.#element.style.cssText = [
         'position: fixed',
         'inset: 0',
         'z-index: 60',
         'pointer-events: none',
      ].join(';');
      (window.document.getElementById('interface') ?? window.document.body).appendChild(this.#element);

      Hooks.on('controlToken', () => this.refresh());
      Hooks.on('canvasReady', () => {
         this.#measureRect();
         this.refresh();
      });
      Hooks.on('updateUser', (user) => {
         if (user.id === game.user.id) {
            this.refresh();
         }
      });
      Hooks.on('collapseSidebar', () => this.#onSidebarToggle());
      Hooks.on('combatStart', () => this.#updateCombatActive());
      Hooks.on('updateCombat', () => this.#updateCombatActive());
      Hooks.on('deleteCombat', () => this.#updateCombatActive());
      Hooks.on('renderHotbar', () => this.applyHotbarVisibility());
      window.addEventListener('resize', () => this.#measureRect());

      this.#measureRect();
      this.#updateCombatActive();
      this.applyHotbarVisibility();
      this.refresh();
   }

   /**
    * Shows or hides the core macro hotbar per the user setting.
    * @returns {void}
    */
   applyHotbarVisibility() {
      /** @type {HTMLElement | undefined} The hotbar's root element. */
      const hotbar = ui.hotbar?.element;
      if (hotbar) {
         hotbar.style.display = showFoundryHotbar() ? '' : 'none';
      }
   }

   /**
    * Toggles layout-edit mode.
    * @returns {void}
    */
   toggleEditMode() {
      if (this.#layoutState) {
         this.#layoutState.editMode = !this.#layoutState.editMode;
      }
   }

   /**
    * Resolves the actors the HUD should display for the current user.
    * @returns {{actors: Array<Actor>, primary: Actor | null}} The resolved actors.
    */
   resolveActors() {
      /**
       * Tests whether a value is a TITAN character actor.
       * @param {Actor | null | undefined} actor - The actor to test.
       * @returns {boolean} Whether the actor is a TITAN character actor.
       */
      const isCharacter = (actor) => actor?.system?.isCharacter === true;

      /** @type {Array<Actor>} Character actors of selected tokens, in selection order. */
      const selected = Array.from(canvas?.tokens?.controlled ?? [])
         .map((token) => token.actor)
         .filter(isCharacter);

      /** @type {Array<Actor>} Character actors the user owns on the scene. */
      const owned = Array.from(canvas?.tokens?.placeables ?? [])
         .map((token) => token.actor)
         .filter((actor) => isCharacter(actor) && actor.isOwner);

      /** @type {Actor | null} The user's assigned character, if it is a character actor. */
      const assigned = isCharacter(game.user.character) ? game.user.character : null;

      return resolveHudActors({ isGM: game.user.isGM, selected, owned, assigned });
   }

   /**
    * Reconciles the mounted HUD with the enable setting and the resolved actor set.
    * @param {object} [options] - Refresh options.
    * @param {boolean} [options.force] - Remounts even when the actor set is unchanged
    *                                    (used when stored options change).
    * @returns {void}
    */
   refresh({ force = false } = {}) {
      if (!enablePlayerHud() || !canvas?.scene) {
         this.#unmount();
         return;
      }

      const { actors, primary } = this.resolveActors();

      /** @type {string} Identity of the resolved set; membership changes force a remount. */
      const mountKey = actors.map((actor) => actor.id).join('|');
      if (!force && mountKey === (this.#mountKey ?? '')) {
         return;
      }
      this.#mountActors(actors, primary, mountKey);
   }

   /**
    * Mounts the shell for the resolved actors, tearing down any previous mount first.
    * @param {Array<Actor>} actors - The resolved actors.
    * @param {Actor | null} primary - The primary actor.
    * @param {string} mountKey - The identity key of the actor set.
    * @returns {void}
    */
   #mountActors(actors, primary, mountKey) {
      this.#unmount();
      if (!primary) {
         return;
      }

      this.#bridge = new ReactiveDocument(primary);
      this.#mountKey = mountKey;
      this.#handle = mount(PlayerHudShell, {
         target: this.#element,
         props: {
            documentStore: this.#bridge,
            actors: actors,
            layoutState: this.#layoutState,
            options: playerHudOptions(),
         },
      });
   }

   /**
    * Unmounts the current HUD tree, if any.
    * @returns {void}
    */
   #unmount() {
      if (this.#handle) {
         unmount(this.#handle);
         this.#handle = undefined;
      }
      this.#bridge = undefined;
      this.#mountKey = undefined;
   }

   /**
    * Measures the usable canvas rect from the viewport and the sidebar's rendered width.
    * @returns {void}
    */
   #measureRect() {
      /** @type {number} The sidebar's current rendered width, 0 when absent. */
      const sidebarWidth = ui.sidebar?.element?.getBoundingClientRect()?.width ?? 0;

      if (this.#layoutState) {
         this.#layoutState.rect = computeCanvasRect({
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            sidebarWidth: sidebarWidth,
         });
      }
   }

   /**
    * Re-measures the rect when the sidebar toggles; measures again after the collapse animation
    * settles so edge-anchored elements land on the final edge.
    * @returns {void}
    */
   #onSidebarToggle() {
      this.#measureRect();
      window.clearTimeout(this.#sidebarTimer);
      this.#sidebarTimer = window.setTimeout(() => this.#measureRect(), 400);
   }

   /**
    * Mirrors the active combat's started state into the layout state.
    * @returns {void}
    */
   #updateCombatActive() {
      if (this.#layoutState) {
         this.#layoutState.combatActive = game.combat?.started === true;
      }
   }
}
```

- [ ] **Step 2: Write `src/ui/player-hud/PlayerHudShell.svelte`**

The portrait/effects imports land in Tasks 6/14; until then the shell renders only the edit
toolbar — that is expected and compiles.

```svelte
<script>
   import { setContext } from 'svelte';
   import HudEditToolbar from '~/ui/player-hud/HudEditToolbar.svelte';

   /**
    * @typedef {object} PlayerHudShellProps
    * @property {object} documentStore - Reactive bridge around the primary actor.
    * @property {Array<Actor>} actors - All resolved actors (group actions iterate these).
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    * @property {object} options - The effective Player HUD options snapshot.
    */

   /** @type {PlayerHudShellProps} */
   const { documentStore, actors, layoutState, options } = $props();

   // The primary actor bridge anchors all single-character reads; embedded providers chain off it.
   // The capture is intentional: the controller remounts the shell when the actor set changes.
   // svelte-ignore state_referenced_locally
   setContext('document', documentStore);
   // svelte-ignore state_referenced_locally
   setContext('sheetDocument', documentStore);

   /** @type {boolean} Whether exactly one character resolved (portrait/effects requirement). */
   const single = actors.length === 1;

   /**
    * Computes whether an element is visible under its enable + combat-only settings.
    * @param {string} elementKey - The element key.
    * @returns {boolean} Whether the element should render.
    */
   function elementVisible(elementKey) {
      /** @type {object} The element's options. */
      const elementOptions = options[elementKey];
      return elementOptions.enabled && (!elementOptions.combatOnly || layoutState.combatActive);
   }

   /** @type {boolean} Portrait visibility (single character only). */
   const portraitVisible = $derived(single && elementVisible('portrait'));

   /** @type {boolean} Action menu visibility (single or group). */
   const actionMenuVisible = $derived(elementVisible('actionMenu'));

   /** @type {boolean} Effects panel visibility (single character only). */
   const effectsPanelVisible = $derived(single && elementVisible('effectsPanel'));
</script>

{#if portraitVisible}
   <!--Portrait element mounts here in Task 6.-->
{/if}

{#if actionMenuVisible}
   <!--Action menu element mounts here in Task 11.-->
{/if}

{#if effectsPanelVisible}
   <!--Effects panel element mounts here in Task 14.-->
{/if}

{#if layoutState.editMode}
   <HudEditToolbar {layoutState}/>
{/if}
```

(The three placeholder comments are scaffolding removed by the named later tasks — each later task
replaces its comment with the real element markup; nothing ships with them because the elements are
required for any e2e to pass.)

- [ ] **Step 3: Write `src/ui/player-hud/HudElementFrame.svelte`**

```svelte
<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { clampPoint, deriveAnchors, resolvePosition } from '~/ui/player-hud/HudGeometry.js';

   /**
    * @typedef {object} HudElementFrameProps
    * @property {string} elementKey - The layout key for this element.
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    * @property {string} minimizeIcon - Font Awesome classes for the minimized chip icon.
    * @property {boolean} [resizable] - Whether edit mode offers a resize handle (effects panel).
    * @property {string} [testId] - data-testid for the frame root.
    * @property {Snippet} children - The element content.
    */

   /** @type {HudElementFrameProps} */
   const { elementKey, layoutState, minimizeIcon, resizable = false, testId, children } = $props();

   /** @type {number} The frame's measured width. */
   let width = $state(0);

   /** @type {number} The frame's measured height. */
   let height = $state(0);

   /** @type {{x: number, y: number} | null} Live position override while dragging. */
   let dragPoint = $state(null);

   /** @type {boolean} Whether this element is minimized. */
   const minimized = $derived(layoutState.minimized[elementKey] === true);

   /** @type {{x: number, y: number}} The resolved (or drag-overridden) top-left point. */
   const point = $derived(
      dragPoint ?? resolvePosition(
         layoutState.positions[elementKey],
         { width, height },
         layoutState.rect,
      ),
   );

   /**
    * Starts an edit-mode drag, tracking the pointer until release.
    * @param {PointerEvent} event - The initiating pointer event.
    * @returns {void}
    */
   function onDragStart(event) {
      if (!layoutState.editMode) {
         return;
      }
      event.preventDefault();

      /** @type {{x: number, y: number}} The pointer offset inside the element. */
      const grab = { x: event.clientX - point.x, y: event.clientY - point.y };

      /**
       * Tracks pointer movement, clamping the element into the canvas rect.
       * @param {PointerEvent} move - The move event.
       * @returns {void}
       */
      const onMove = (move) => {
         /** @type {number} The edit-mode drag snap grid, in pixels. */
         const snap = 8;

         dragPoint = clampPoint(
            {
               x: Math.round((move.clientX - grab.x) / snap) * snap,
               y: Math.round((move.clientY - grab.y) / snap) * snap,
            },
            { width, height },
            layoutState.rect,
         );
      };

      /**
       * Commits the drag: derives fresh anchors from the drop point and persists.
       * @returns {void}
       */
      const onUp = () => {
         window.removeEventListener('pointermove', onMove);
         window.removeEventListener('pointerup', onUp);
         if (dragPoint) {
            layoutState.positions[elementKey] = deriveAnchors(dragPoint, { width, height }, layoutState.rect);
            layoutState.persist();
            dragPoint = null;
         }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
   }

   /**
    * Starts an edit-mode resize drag (effects panel only).
    * @param {PointerEvent} event - The initiating pointer event.
    * @returns {void}
    */
   function onResizeStart(event) {
      event.preventDefault();
      event.stopPropagation();

      /** @type {{width: number, height: number}} The size at drag start. */
      const start = { width: layoutState.effectsPanelSize.width, height: layoutState.effectsPanelSize.height };

      /** @type {{x: number, y: number}} The pointer at drag start. */
      const origin = { x: event.clientX, y: event.clientY };

      /**
       * Tracks pointer movement into a clamped size.
       * @param {PointerEvent} move - The move event.
       * @returns {void}
       */
      const onMove = (move) => {
         layoutState.effectsPanelSize = {
            width: Math.max(180, start.width + (move.clientX - origin.x)),
            height: Math.max(120, start.height + (move.clientY - origin.y)),
         };
      };

      /**
       * Commits the resize.
       * @returns {void}
       */
      const onUp = () => {
         window.removeEventListener('pointermove', onMove);
         window.removeEventListener('pointerup', onUp);
         layoutState.persist();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
   }
</script>

<div
   class="hud-element"
   class:edit-mode={layoutState.editMode}
   style:left={`${point.x}px`}
   style:top={`${point.y}px`}
   bind:clientWidth={width}
   bind:clientHeight={height}
   data-testid={testId}
   onpointerdown={onDragStart}
>
   {#if minimized}
      <button
         class="restore-chip"
         type="button"
         aria-label={localize('restoreElement')}
         data-testid={testId ? `${testId}-restore` : undefined}
         onclick={() => layoutState.toggleMinimized(elementKey)}
      >
         <i class={minimizeIcon}></i>
      </button>
   {:else}
      <button
         class="minimize-chip"
         type="button"
         aria-label={localize('minimizeElement')}
         data-testid={testId ? `${testId}-minimize` : undefined}
         onclick={() => layoutState.toggleMinimized(elementKey)}
      >
         <i class="fas fa-minus"></i>
      </button>
      {@render children()}
      {#if resizable && layoutState.editMode}
         <div
            class="resize-handle"
            data-testid={testId ? `${testId}-resize` : undefined}
            onpointerdown={onResizeStart}
         ></div>
      {/if}
   {/if}
</div>

<style lang="scss">
   .hud-element {
      position: absolute;
      pointer-events: auto;

      &.edit-mode {
         cursor: move;
         outline: 2px dashed var(--titan-panel-3-background);
         outline-offset: 2px;
      }

      .minimize-chip {
         @include font-size-small;

         position: absolute;
         top: 0;
         right: 0;
         z-index: 1;
         background: none;
         border: none;
         color: inherit;
         cursor: pointer;
         opacity: 0.6;

         &:hover {
            opacity: 1;
         }
      }

      .restore-chip {
         @include panel-2;
         @include padding-standard;

         border: none;
         border-radius: var(--titan-border-radius);
         color: inherit;
         cursor: pointer;
      }

      .resize-handle {
         position: absolute;
         right: 0;
         bottom: 0;
         width: 14px;
         height: 14px;
         cursor: nwse-resize;
         background: linear-gradient(135deg, transparent 50%, var(--titan-panel-3-background) 50%);
      }
   }
</style>
```

- [ ] **Step 4: Write `src/ui/player-hud/HudEditToolbar.svelte`**

```svelte
<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} HudEditToolbarProps
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    */

   /** @type {HudEditToolbarProps} */
   const { layoutState } = $props();
</script>

<div
   class="edit-toolbar"
   data-testid="player-hud-edit-toolbar"
>
   <button
      type="button"
      data-testid="player-hud-edit-done"
      onclick={() => layoutState.editMode = false}
   >
      {localize('exitEditLayout')}
   </button>
   <button
      type="button"
      data-testid="player-hud-edit-reset"
      onclick={() => layoutState.reset()}
   >
      {localize('resetLayout')}
   </button>
   <button
      type="button"
      data-testid="player-hud-edit-settings"
      onclick={() => game.titan?.playerHudSettings?.render(true)}
   >
      <i class="fas fa-gear"></i>
      {localize('playerHudSettings')}
   </button>
</div>

<style lang="scss">
   .edit-toolbar {
      @include panel-1;
      @include padding-standard;
      @include flex-row;
      @include flex-group-center;

      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      gap: var(--titan-spacing-standard);
      pointer-events: auto;
      border-radius: var(--titan-border-radius);

      button {
         @include panel-2;
         @include padding-standard;

         border: none;
         border-radius: var(--titan-border-radius);
         color: inherit;
         cursor: pointer;
      }
   }
</style>
```

(`game.titan.playerHudSettings` is created in Task 16; until then the gear button is a no-op via
the optional chain.)

- [ ] **Step 5: Wire `src/hooks/OnceReady.js`**

Below the effect-hud lines (`game.titan.effectHud = new TitanEffectHud(); ... .init();`):

```javascript
game.titan.playerHud = new TitanPlayerHud();
game.titan.playerHud.init();
```

with the matching import at the top: `import TitanPlayerHud from '~/ui/player-hud/TitanPlayerHud.js';`

- [ ] **Step 6: Build, lint, run unit tests**

Run: `npm run build && npx eslint src/ui/player-hud/ src/hooks/OnceReady.js && npx vitest run`
Expected: build clean; lint clean; all unit tests pass.
NEVER run `npm run build` while an e2e run is in flight.

- [ ] **Step 7: Commit**

```bash
git add src/ui/player-hud/ src/hooks/OnceReady.js
git commit -m "feat: player HUD controller, layer, element frame, and edit toolbar"
```

### Task 6: Portrait element (three styles, bars, utility row)

**Files:**
- Create: `src/ui/player-hud/elements/portrait/PortraitElement.svelte`
- Create: `src/ui/player-hud/elements/portrait/PortraitPanelCard.svelte`
- Create: `src/ui/player-hud/elements/portrait/PortraitRoundToken.svelte`
- Create: `src/ui/player-hud/elements/portrait/PortraitWideStrip.svelte`
- Create: `src/ui/player-hud/elements/portrait/PortraitBars.svelte`
- Create: `src/ui/player-hud/elements/portrait/PortraitUtilityRow.svelte`
- Modify: `src/ui/player-hud/PlayerHudShell.svelte` (replace the portrait placeholder comment)

- [ ] **Step 1: Write `PortraitBars.svelte`** (shared by all three styles)

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');

   /** @type {Array<string>} The displayed resources, in order. */
   const resources = ['stamina', 'resolve', 'wounds'];
</script>

<div class="bars">
   {#each resources as resource (resource)}
      {@const value = document.data.system.resource[resource].value}
      {@const max = document.data.system.resource[resource].max}
      <div
         class={`bar ${resource}`}
         data-testid={`player-hud-bar-${resource}`}
      >
         <div
            class="fill"
            style:width={`${max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0}%`}
         ></div>
         <span class="label">{localize(resource)}</span>
         <span class="value">
            <DocumentIntegerInput
               bind:value={document.data.system.resource[resource].value}
               testId={`player-hud-bar-${resource}-input`}
            />
            / {max}
         </span>
      </div>
   {/each}
</div>

<style lang="scss">
   .bars {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      gap: var(--titan-spacing-standard);

      .bar {
         @include font-size-small;
         @include panel-3;

         position: relative;
         width: 100%;
         height: 20px;
         border-radius: var(--titan-border-radius);
         overflow: hidden;

         .fill {
            position: absolute;
            inset: 0 auto 0 0;
            border-radius: var(--titan-border-radius);
         }

         &.stamina .fill {
            background: var(--titan-stamina-color, #3f7d4f);
         }

         &.resolve .fill {
            background: var(--titan-resolve-color, #7d6a3f);
         }

         &.wounds .fill {
            background: var(--titan-wounds-color, #7d3f3f);
         }

         .label,
         .value {
            @include flex-row;
            @include flex-group-center;

            position: relative;
            padding: 0 var(--titan-spacing-standard);
         }

         .label {
            float: left;
         }

         .value {
            float: right;
         }
      }
   }
</style>
```

NOTE: check `Variables.scss` for existing stamina/resolve/wounds color tokens (the sheet's resource
bars use some) and use those token names instead of the fallback literals if present — the sheet's
`CharacterSheetResource.svelte` shows the canonical pattern; mirror its `max` path
(`system.resource[r].max` vs a derived total — copy exactly what the sheet reads).

- [ ] **Step 2: Write `PortraitUtilityRow.svelte`**

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { SPEND_RESOLVE_ICON, SHORT_REST_ICON, LONG_REST_ICON } from '~/system/Icons.js';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');

   /** @type {boolean} Whether the actor is a Player (inspiration is Player-only). */
   const isPlayer = $derived(document.data.type === 'player');
</script>

<div class="utility-row">
   <IconButton
      icon={SPEND_RESOLVE_ICON}
      label={localize('spendResolve')}
      tooltip={'spendResolve'}
      testId="player-hud-spend-resolve"
      onclick={() => document.data.system.spendResolve(1)}
   />
   {#if isPlayer}
      <IconButton
         icon={'fas fa-sun'}
         label={localize('toggleInspiration')}
         tooltip={'toggleInspiration'}
         testId="player-hud-toggle-inspiration"
         onclick={() => document.data.system.toggleInspiration()}
      />
   {/if}
   <IconButton
      icon={SHORT_REST_ICON}
      label={localize('shortRest')}
      tooltip={'shortRest'}
      testId="player-hud-short-rest"
      onclick={() => document.data.system.shortRest({})}
   />
   <IconButton
      icon={LONG_REST_ICON}
      label={localize('longRest')}
      tooltip={'longRest'}
      testId="player-hud-long-rest"
      onclick={() => document.data.system.longRest({})}
   />
   <IconButton
      icon={'fas fa-rotate-left'}
      label={localize('removeCombatEffects')}
      tooltip={'removeCombatEffects'}
      testId="player-hud-remove-combat-effects"
      onclick={() => document.data.system.removeCombatEffects({})}
   />
</div>

<style lang="scss">
   .utility-row {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      gap: var(--titan-spacing-standard);
   }
</style>
```

NOTES: (a) confirm `IconButton`'s prop names against `src/helpers/svelte-components/button/IconButton.svelte`
(the effect-hud row uses `icon`/`label`/`tooltip`/`onclick`; keep `testId` only if the primitive
forwards it — if not, add forwarding per the testId rule). (b) Check `Icons.js` for existing
inspiration / remove-combat-effects icons and existing `LOCAL.toggleInspiration` /
`LOCAL.removeCombatEffects` / `LOCAL.spendResolve` / `LOCAL.shortRest` / `LOCAL.longRest` keys —
the sheet has buttons for all five; reuse its exact keys and icons rather than the literals above.
(c) Verify `spendResolve(1)` against the sheet's spend-resolve button call site and mirror its
arguments exactly.

- [ ] **Step 3: Write the three style components**

`PortraitPanelCard.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import PortraitBars from '~/ui/player-hud/elements/portrait/PortraitBars.svelte';
   import PortraitUtilityRow from '~/ui/player-hud/elements/portrait/PortraitUtilityRow.svelte';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');
</script>

<div class="panel-card">
   <div class="portrait">
      <img
         src={document.data.img}
         alt={document.data.name}
      />
      <span class="name">{document.data.name}</span>
   </div>
   <PortraitBars/>
   <PortraitUtilityRow/>
</div>

<style lang="scss">
   .panel-card {
      @include panel-1;
      @include padding-standard;
      @include flex-column;
      @include flex-group-top;

      width: 180px;
      gap: var(--titan-spacing-standard);
      border-radius: var(--titan-border-radius);

      .portrait {
         position: relative;
         width: 100%;

         img {
            display: block;
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            border-radius: var(--titan-border-radius);
         }

         .name {
            @include font-size-small;

            position: absolute;
            inset: auto 0 0 0;
            padding: 2px 0;
            text-align: center;
            background: color-mix(in srgb, var(--titan-panel-1-background) 75%, transparent);
            border-radius: 0 0 var(--titan-border-radius) var(--titan-border-radius);
         }
      }
   }
</style>
```

`PortraitWideStrip.svelte` — same imports/context; markup is portrait image (84px square) left,
column (name, `<PortraitBars/>`, `<PortraitUtilityRow/>`) right, root class `wide-strip` with
`@include panel-1; @include padding-standard; @include flex-row;` width 300px, gap standard.
Complete file follows the panel-card pattern exactly with that layout swap.

`PortraitRoundToken.svelte` — circular portrait with stamina (outer) and resolve (inner) rings via
`conic-gradient`, wounds bar + name + utility row below, and a click-to-toggle bars popover (rings
are not inline-editable):

```svelte
<script>
   import { getContext } from 'svelte';
   import PortraitBars from '~/ui/player-hud/elements/portrait/PortraitBars.svelte';
   import PortraitUtilityRow from '~/ui/player-hud/elements/portrait/PortraitUtilityRow.svelte';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');

   /** @type {boolean} Whether the editable-bars popover is open. */
   let barsOpen = $state(false);

   /**
    * Computes a resource's fill percentage.
    * @param {string} resource - The resource key.
    * @returns {number} The 0-100 fill percentage.
    */
   function pct(resource) {
      /** @type {number} The resource maximum. */
      const max = document.data.system.resource[resource].max;
      return max > 0
         ? Math.min(100, Math.max(0, (document.data.system.resource[resource].value / max) * 100))
         : 0;
   }
</script>

<div class="round-token">
   <button
      class="rings"
      type="button"
      aria-label={document.data.name}
      data-testid="player-hud-round-portrait"
      onclick={() => barsOpen = !barsOpen}
   >
      <div
         class="ring stamina"
         style:background={`conic-gradient(var(--titan-stamina-color, #3f7d4f) 0 ${pct('stamina')}%, var(--titan-panel-3-background) ${pct('stamina')}% 100%)`}
      ></div>
      <div
         class="ring resolve"
         style:background={`conic-gradient(var(--titan-resolve-color, #7d6a3f) 0 ${pct('resolve')}%, var(--titan-panel-3-background) ${pct('resolve')}% 100%)`}
      ></div>
      <img
         src={document.data.img}
         alt={document.data.name}
      />
   </button>
   <span class="name">{document.data.name}</span>
   {#if barsOpen}
      <div
         class="bars-popover"
         data-testid="player-hud-bars-popover"
      >
         <PortraitBars/>
      </div>
   {/if}
   <PortraitUtilityRow/>
</div>

<style lang="scss">
   .round-token {
      @include flex-column;
      @include flex-group-top;

      width: 150px;
      gap: var(--titan-spacing-standard);

      .rings {
         position: relative;
         width: 110px;
         height: 110px;
         padding: 0;
         background: none;
         border: none;
         cursor: pointer;

         .ring {
            position: absolute;
            border-radius: 50%;
         }

         .ring.stamina {
            inset: 0;
         }

         .ring.resolve {
            inset: 6px;
         }

         img {
            position: absolute;
            inset: 12px;
            width: calc(100% - 24px);
            height: calc(100% - 24px);
            object-fit: cover;
            border-radius: 50%;
         }
      }

      .name {
         @include font-size-small;
      }

      .bars-popover {
         @include panel-2;
         @include padding-standard;

         width: 100%;
         border-radius: var(--titan-border-radius);
      }
   }
</style>
```

- [ ] **Step 4: Write the dispatcher and mount it in the shell**

`PortraitElement.svelte`:

```svelte
<script>
   import PortraitPanelCard from '~/ui/player-hud/elements/portrait/PortraitPanelCard.svelte';
   import PortraitRoundToken from '~/ui/player-hud/elements/portrait/PortraitRoundToken.svelte';
   import PortraitWideStrip from '~/ui/player-hud/elements/portrait/PortraitWideStrip.svelte';

   /**
    * @typedef {object} PortraitElementProps
    * @property {object} options - The portrait element options.
    */

   /** @type {PortraitElementProps} */
   const { options } = $props();

   /** @type {object} Style key → component map. */
   const styles = {
      panelCard: PortraitPanelCard,
      roundToken: PortraitRoundToken,
      wideStrip: PortraitWideStrip,
   };

   /** @type {Component} The active style component. */
   const Style = $derived(styles[options.style] ?? PortraitPanelCard);
</script>

<Style/>
```

In `PlayerHudShell.svelte`, replace the portrait placeholder comment:

```svelte
{#if portraitVisible}
   <HudElementFrame
      elementKey="portrait"
      {layoutState}
      minimizeIcon="fas fa-user"
      testId="player-hud-portrait"
   >
      <PortraitElement options={options.portrait}/>
   </HudElementFrame>
{/if}
```

with imports for `HudElementFrame` and `PortraitElement` added to the shell script block.

- [ ] **Step 5: Build, lint, manual smoke**

Run: `npm run build && npx eslint src/ui/player-hud/`
Expected: clean. Then (world running, NOT during an e2e run) select a character token and confirm
the portrait renders bottom-left with editable bars and the five icons (four on an NPC).

- [ ] **Step 6: Commit**

```bash
git add src/ui/player-hud/
git commit -m "feat: player HUD portrait element with three styles, editable bars, utility row"
```

---

### Task 7: Visibility e2e

**Files:**
- Create: `tests/e2e/player-hud-visibility.spec.js`
- Modify: `tests/e2e/world.js` — in `controlFixtureActorToken`, add `game.titan.playerHud?.refresh();`
  beside the existing `game.titan.effectHud.refresh();` line, and add a `releaseOthers = true`
  option threaded into `tokenDoc.object.control({ releaseOthers })` so specs can multi-select.

Spec scaffold (identical boot pattern to `tests/e2e/effect-hud.spec.js:12-34`: shared `page`,
`login`, `clearChat`, `attachPageErrors`, `closeAllApps` in `afterEach`). Shared local helper:

```javascript
/**
 * Creates a character actor with optional items/effects and a controlled token on the active scene.
 * @param {Page} page - The Playwright page.
 * @param {object} params - Seed parameters.
 * @returns {Promise<string>} The created actor's id.
 */
async function seedControlledActor(page, { name, type = 'player', releaseOthers = true }) {
   await page.evaluate(async ({ name, type }) => {
      if (!game.actors.getName(name)) {
         await Actor.create({ name, type });
      }
   }, { name, type });
   await controlFixtureActorToken(page, { actorName: name, releaseOthers });
   return page.evaluate((name) => game.actors.getName(name).id, name);
}
```

- [ ] **Step 1: Write the tests** — full code for the first two; the rest follow the identical
  pattern with the listed setup/assertion (selectors are the Task 5/6 testIds; `HUD` root selector
  is `#titan-player-hud`):

```javascript
test('GM sees the portrait for a single selected character', async () => {
   await seedControlledActor(page, { name: 'HUD Vis Player' });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toBeVisible();
});

test('GM with no selection shows no HUD elements', async () => {
   await page.evaluate(() => {
      canvas.tokens.releaseAll();
      game.titan.playerHud.refresh();
   });
   await expect(page.locator('[data-testid="player-hud-portrait"]')).toHaveCount(0);
});
```

Remaining tests (presence→absence transitions per the e2e house rule — establish the visible state
first in every absence test):

1. `NPC selection shows the portrait` — seed `type: 'npc'`, expect portrait visible and
   `player-hud-toggle-inspiration` count 0.
2. `group selection hides portrait and effects panel` — seed two actors, control both
   (`releaseOthers: false` on the second), expect portrait count 0. (Action-menu group assertions
   land in Task 12's spec.)
3. `master disable unmounts the HUD` — portrait visible → `game.settings.set('titan',
   'enablePlayerHud', false)` → count 0 → re-enable, visible again.
4. `per-element disable hides only that element` — set `playerHudOptions` to
   `{ portrait: { enabled: false } }` → portrait count 0; reset to `{}` afterward.
5. `combat-only hides the portrait outside combat and shows it in combat` — set
   `playerHudOptions` `{ portrait: { combatOnly: true } }`; portrait count 0; then seed a combat
   with `seedCombatEncounter` (`tests/shared/combat.js`), re-control the fixture token, expect
   visible; teardown combat (`teardownCombatEncounter`), expect count 0; reset options.
6. `no viewed scene hides the HUD` — portrait visible first; deactivate the active scene via
   `game.scenes.active.update({ active: false })` and poll portrait count 0 (the `canvasReady`
   refresh fires on teardown — if the canvas keeps the scene viewed, call
   `game.titan.playerHud.refresh()` explicitly after); reactivate the scene and re-control the
   token, visible again.
7. `player ladder fallback` — log a second context in as `'E2E Player 1'` via `withClients`
   (`tests/e2e/multiClient.js`) with a player-owned actor (grant OWNER in seeding) and NO selection;
   expect the portrait visible on the player client. One `withClients` test only — multi-client
   boots are expensive.

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/player-hud-visibility.spec.js`
Expected: all pass. (World must be launched; e2e is world-launch-gated.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/player-hud-visibility.spec.js tests/e2e/world.js
git commit -m "test: player HUD visibility e2e matrix"
```

---

### Task 8: Portrait e2e

**Files:**
- Create: `tests/e2e/player-hud-portrait.spec.js` (same scaffold + `seedControlledActor` helper)

- [ ] **Step 1: Write the tests** — full code for the bar-edit test; the rest enumerated:

```javascript
test('editing the stamina bar persists to the actor', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Portrait Player' });
   const input = page.locator('[data-testid="player-hud-bar-stamina-input"]');
   await input.fill('7');
   await input.press('Enter');
   await expect.poll(
      () => page.evaluate((id) => game.actors.get(id).system.resource.stamina.value, actorId),
      { message: 'stamina persists from the HUD bar' },
   ).toBe(7);
});
```

1. `all three styles render` — for each of `panelCard`/`roundToken`/`wideStrip`: set
   `playerHudOptions` `{ portrait: { style } }`, expect `player-hud-portrait` visible (and for
   `roundToken`, click `player-hud-round-portrait` → `player-hud-bars-popover` visible). Reset.
2. `spend resolve decrements resolve by 1` — seed resolve to a known value via
   `actor.update({ system: { resource: { resolve: { value: 3 } } } })`, click
   `player-hud-spend-resolve`, poll resolve === 2.
3. `short rest / long rest / remove combat effects buttons execute` — click each; poll the cheapest
   observable engine outcome (short rest: stamina restored toward max from a damaged value; long
   rest: same plus resolve; remove combat effects: a seeded `turnStart`-duration effect is removed).
4. `inspiration toggles for players and is absent for NPCs` — player: click
   `player-hud-toggle-inspiration`, poll `system.inspiration` flips; NPC: selector count 0.
5. `minimize chip collapses and restores` — click `player-hud-portrait-minimize`, expect
   `player-hud-portrait-restore` visible and bars count 0; click restore, bars visible again.

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/player-hud-portrait.spec.js`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/player-hud-portrait.spec.js
git commit -m "test: player HUD portrait e2e (styles, bars, utility actions, minimize)"
```

### Task 9: BuildActionMenuModel (TDD)

The pure category/sub-option/sub-button builder. It returns localization KEYS (components
localize) and action closures over the passed actors, so unit tests assert structure and invoke
closures against mocks.

**Files:**
- Create: `tests/unit/BuildActionMenuModel.test.js`
- Create: `src/ui/player-hud/elements/action-menu/BuildActionMenuModel.js`

**Model shape** (the single contract Tasks 11-13 build against):

```javascript
// buildActionMenuModel({ actors, primary, options }) → Array<Category>
// Category:  { key, labelKey, subOptions: Array<SubOption> }      (empty subOptions ⇒ omitted)
// SubOption: { key, labelKey?, label?, img?, mainAction: Function, subButtons: Array<SubButton> }
//            (labelKey for static entries like skills; label for document names)
// SubButton: { key, labelKey?, label?, icon, action: Function }
```

- [ ] **Step 1: Write the failing tests** — mock actor factory + the core cases:

```javascript
import { describe, it, expect, vi } from 'vitest';
import buildActionMenuModel from '~/ui/player-hud/elements/action-menu/BuildActionMenuModel.js';
import { createDefaultHudOptions } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Builds a mock character actor with spied engine methods.
 * @param {object} [overrides] - Field overrides (type, items, effects, equipped).
 * @returns {object} The mock actor.
 */
function mockActor(overrides = {}) {
   return {
      id: overrides.id ?? 'a1',
      type: overrides.type ?? 'player',
      items: overrides.items ?? [],
      effects: overrides.effects ?? [],
      system: {
         equipped: overrides.equipped ?? { armor: null, shield: null },
         requestAttributeCheck: vi.fn(),
         requestResistanceCheck: vi.fn(),
         requestAttackCheck: vi.fn(),
         requestItemCheck: vi.fn(),
         requestCastingCheck: vi.fn(),
         toggleEquipped: vi.fn(),
         spendResolve: vi.fn(),
         shortRest: vi.fn(),
         longRest: vi.fn(),
         removeCombatEffects: vi.fn(),
         toggleInspiration: vi.fn(),
         requestEffectDeletion: vi.fn(),
      },
   };
}

/**
 * Builds a mock item.
 * @param {object} fields - Item fields (id, type, name, system pieces).
 * @returns {object} The mock item.
 */
function mockItem(fields) {
   return {
      id: fields.id,
      type: fields.type,
      name: fields.name ?? fields.id,
      img: 'icons/svg/item-bag.svg',
      sendToChat: vi.fn(),
      sheet: { render: vi.fn() },
      update: vi.fn(),
      system: {
         attack: fields.attack ?? [],
         check: fields.check ?? [],
         equipped: fields.equipped ?? false,
         quantity: fields.quantity,
         ...fields.system,
      },
   };
}

/**
 * Finds a category by key.
 * @param {Array<object>} model - The built model.
 * @param {string} key - The category key.
 * @returns {object | undefined} The category.
 */
function category(model, key) {
   return model.find((entry) => entry.key === key);
}

describe('buildActionMenuModel', () => {
   it('always offers 18 skills, 3 resistances, and utility for a single character', () => {
      const model = buildActionMenuModel({ actors: [mockActor()], primary: mockActor(), options: createDefaultHudOptions().actionMenu });
      expect(category(model, 'skills').subOptions).toHaveLength(18);
      expect(category(model, 'resistances').subOptions).toHaveLength(3);
      expect(category(model, 'utility').subOptions.map((s) => s.key)).toEqual([
         'toggleInspiration', 'shortRest', 'longRest', 'removeCombatEffects',
         'applyDamage', 'applyHealing', 'applyRend', 'applyRepairs',
      ]);
   });

   it('limits group mode (2+ actors) to skills, resistances, and utility', () => {
      const actors = [mockActor({ id: 'a' }), mockActor({ id: 'b' })];
      const model = buildActionMenuModel({ actors, primary: actors[0], options: createDefaultHudOptions().actionMenu });
      expect(model.map((entry) => entry.key)).toEqual(['skills', 'resistances', 'utility']);
   });

   it('rolls a skill for every actor with the default attribute', () => {
      const actors = [mockActor({ id: 'a' }), mockActor({ id: 'b' })];
      const model = buildActionMenuModel({ actors, primary: actors[0], options: createDefaultHudOptions().actionMenu });
      category(model, 'skills').subOptions.find((s) => s.key === 'athletics').mainAction();
      for (const actor of actors) {
         expect(actor.system.requestAttributeCheck)
            .toHaveBeenCalledWith({ attribute: 'default', skill: 'athletics' });
      }
   });

   it('omits inspiration from utility when no actor is a player', () => {
      const npc = mockActor({ type: 'npc' });
      const model = buildActionMenuModel({ actors: [npc], primary: npc, options: createDefaultHudOptions().actionMenu });
      expect(category(model, 'utility').subOptions.some((s) => s.key === 'toggleInspiration')).toBe(false);
   });

   it('weapon main action: equipped with attacks attacks first; unequipped equips', () => {
      const equipped = mockItem({ id: 'w1', type: 'weapon', equipped: true, attack: [{ label: 'Slash' }] });
      const unequipped = mockItem({ id: 'w2', type: 'weapon', equipped: false, attack: [{ label: 'Stab' }] });
      const actor = mockActor({ items: [equipped, unequipped] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      const weapons = category(model, 'weapons').subOptions;
      weapons.find((s) => s.key === 'w1').mainAction();
      expect(actor.system.requestAttackCheck).toHaveBeenCalledWith({ itemId: 'w1', attackIdx: 0 });
      weapons.find((s) => s.key === 'w2').mainAction();
      expect(actor.system.toggleEquipped).toHaveBeenCalledWith('w2');
   });

   it('weapon main action: equipped without attacks rolls the first check, else opens the sheet', () => {
      const checker = mockItem({ id: 'w3', type: 'weapon', equipped: true, check: [{ label: 'Parry' }] });
      const bare = mockItem({ id: 'w4', type: 'weapon', equipped: true });
      const actor = mockActor({ items: [checker, bare] });
      const options = createDefaultHudOptions().actionMenu;
      options.filters.weaponsWithActions = false;
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options });
      const weapons = category(model, 'weapons').subOptions;
      weapons.find((s) => s.key === 'w3').mainAction();
      expect(actor.system.requestItemCheck).toHaveBeenCalledWith({ itemId: 'w3', checkIdx: 0 });
      weapons.find((s) => s.key === 'w4').mainAction();
      expect(bare.sheet.render).toHaveBeenCalledWith(true);
   });

   it('weapons filter hides weapons without attacks or checks; disabling it shows them', () => {
      const bare = mockItem({ id: 'w5', type: 'weapon' });
      const actor = mockActor({ items: [bare] });
      const options = createDefaultHudOptions().actionMenu;
      expect(buildActionMenuModel({ actors: [actor], primary: actor, options })
         .some((entry) => entry.key === 'weapons')).toBe(false);
      options.filters.weaponsWithActions = false;
      expect(category(buildActionMenuModel({ actors: [actor], primary: actor, options }), 'weapons')
         .subOptions).toHaveLength(1);
   });

   it('inventory main action: unequipped equippable equips; commodity rolls first check; else sheet', () => {
      const armor = mockItem({ id: 'i1', type: 'armor', check: [{ label: 'X' }] });
      const commodity = mockItem({ id: 'i2', type: 'commodity', quantity: 2, check: [{ label: 'Y' }] });
      const plain = mockItem({ id: 'i3', type: 'equipment', equipped: true });
      const actor = mockActor({ items: [armor, commodity, plain] });
      const options = createDefaultHudOptions().actionMenu;
      options.filters.inventoryWithChecks = false;
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options });
      const inventory = category(model, 'inventory').subOptions;
      inventory.find((s) => s.key === 'i1').mainAction();
      expect(actor.system.toggleEquipped).toHaveBeenCalledWith('i1');
      inventory.find((s) => s.key === 'i2').mainAction();
      expect(actor.system.requestItemCheck).toHaveBeenCalledWith({ itemId: 'i2', checkIdx: 0 });
      inventory.find((s) => s.key === 'i3').mainAction();
      expect(plain.sheet.render).toHaveBeenCalledWith(true);
   });

   it('commodity sub-buttons adjust quantity and floor at zero', () => {
      const commodity = mockItem({ id: 'i4', type: 'commodity', quantity: 0, check: [{ label: 'Y' }] });
      const actor = mockActor({ items: [commodity] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      const sub = category(model, 'inventory').subOptions.find((s) => s.key === 'i4');
      sub.subButtons.find((b) => b.key === 'quantity-increase').action();
      expect(commodity.update).toHaveBeenCalledWith({ system: { quantity: 1 } });
      sub.subButtons.find((b) => b.key === 'quantity-decrease').action();
      expect(commodity.update).toHaveBeenCalledWith({ system: { quantity: 0 } });
   });

   it('spell main action requests the casting check', () => {
      const spell = mockItem({ id: 's1', type: 'spell' });
      const actor = mockActor({ items: [spell] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      category(model, 'spells').subOptions[0].mainAction();
      expect(actor.system.requestCastingCheck).toHaveBeenCalledWith({ itemId: 's1' });
   });

   it('effect sub-options roll via itemRollData and offer duration/remove sub-buttons', () => {
      const effect = {
         id: 'e1',
         type: 'effect',
         name: 'Burning',
         img: 'x.svg',
         getRollData: vi.fn(() => ({ rolled: true })),
         sendToChat: vi.fn(),
         sheet: { render: vi.fn() },
         update: vi.fn(),
         system: { check: [{ label: 'C' }], duration: { type: 'turnStart', remaining: 2 } },
      };
      const actor = mockActor({ effects: [effect] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      const sub = category(model, 'effects').subOptions[0];
      sub.mainAction();
      expect(actor.system.requestItemCheck).toHaveBeenCalledWith({ itemRollData: { rolled: true }, checkIdx: 0 });
      sub.subButtons.find((b) => b.key === 'duration-increase').action();
      expect(effect.update).toHaveBeenCalledWith({ system: { duration: { remaining: 3 } } });
      sub.subButtons.find((b) => b.key === 'remove').action();
      expect(actor.system.requestEffectDeletion).toHaveBeenCalledWith('e1');
   });

   it('per-category and per-sub-button-type disables prune the model', () => {
      const weapon = mockItem({ id: 'w6', type: 'weapon', equipped: true, attack: [{ label: 'A' }] });
      const actor = mockActor({ items: [weapon] });
      const options = createDefaultHudOptions().actionMenu;
      options.categories.skills = false;
      options.subButtons.sendToChat = false;
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options });
      expect(model.some((entry) => entry.key === 'skills')).toBe(false);
      const sub = category(model, 'weapons').subOptions[0];
      expect(sub.subButtons.some((b) => b.key === 'send-to-chat')).toBe(false);
   });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/BuildActionMenuModel.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `BuildActionMenuModel.js`**

Implementation contract (write it to satisfy every test above — the tests ARE the precedence
spec). Skeleton with all decision logic spelled out:

```javascript
import { getIcon } from '~/system/Icons.js';

/** @type {Array<string>} The 18 skill keys, matching the character schema. */
export const HUD_SKILLS = [
   'arcana', 'athletics', 'deception', 'dexterity', 'diplomacy', 'engineering',
   'intimidation', 'investigation', 'lore', 'medicine', 'meleeWeapons', 'metaphysics',
   'nature', 'perception', 'performance', 'rangedWeapons', 'stealth', 'subterfuge',
];

/** @type {Array<string>} The resistance keys. */
export const HUD_RESISTANCES = ['reflexes', 'resilience', 'willpower'];

/** @type {Array<string>} Item types equipped via the character's toggleEquipped path. */
const EQUIPPABLE_TYPES = ['armor', 'shield', 'equipment'];

/**
 * Tests whether an item is currently equipped for the given actor (armor/shield equip by id on
 * the character; weapons/equipment carry their own flag).
 * @param {object} actor - The owning actor.
 * @param {object} item - The item.
 * @returns {boolean} Whether the item is equipped.
 */
function isEquipped(actor, item) {
   if (item.type === 'armor') {
      return actor.system.equipped.armor === item.id;
   }
   if (item.type === 'shield') {
      return actor.system.equipped.shield === item.id;
   }
   return item.system.equipped === true;
}

/**
 * Builds the action-menu model for the resolved actors.
 * @param {object} params - Build inputs.
 * @param {Array<object>} params.actors - All resolved actors (group actions iterate these).
 * @param {object | null} params.primary - The primary actor (single-character categories read it).
 * @param {object} params.options - The actionMenu options (categories/subButtons/filters/...).
 * @returns {Array<object>} The category model; empty categories are omitted.
 */
export default function buildActionMenuModel({ actors, primary, options }) { /* ... */ }
```

Body requirements (each maps 1:1 to a test):
- `skills`: sub-options from `HUD_SKILLS`; `labelKey: skill`; `mainAction` calls
  `actor.system.requestAttributeCheck({ attribute: 'default', skill })` for EVERY actor. No sub-buttons.
- `resistances`: from `HUD_RESISTANCES`; `requestResistanceCheck({ resistance })` per actor.
- `weapons` (single only): items where `type === 'weapon'`, filtered to
  `attack.length > 0 || check.length > 0` when `options.filters.weaponsWithActions`. Main action
  precedence exactly: equipped && attacks → `requestAttackCheck({ itemId, attackIdx: 0 })`;
  !equipped → `toggleEquipped(id)`; checks → `requestItemCheck({ itemId, checkIdx: 0 })`; else
  `item.sheet.render(true)`. Sub-buttons in order: one per attack (`key: attack-${idx}`, gated
  `subButtons.attacks`, icon `getIcon('attack') ?? 'fas fa-sword'` — reuse the sheet's
  MELEE/ACCURACY icons from `Icons.js`), one per check (`key: check-${idx}`, gated
  `subButtons.checks`), `equipped` toggle (labelKey `equip`/`unequip`), `send-to-chat`
  (`item.sendToChat()`), `open-sheet` (`item.sheet.render(true)`), each gated by its
  `options.subButtons.*` flag.
- `inventory` (single only): items where type ≠ weapon/spell/ability (i.e. armor, shield,
  equipment, commodity), filter `check.length > 0` when `inventoryWithChecks`. Main:
  equippable && !equipped → toggle; `check.length` → first check; else sheet. Sub-buttons: checks,
  equipped (equippable types only), `quantity-increase`/`quantity-decrease` (commodity only, gated
  `subButtons.quantity`, `item.update({ system: { quantity: Math.max(0, quantity ± 1) } })`),
  send-to-chat, open-sheet.
- `abilities` (single only): `type === 'ability'`, filter `abilitiesWithChecks`. Main: first check
  else sheet. Sub-buttons: checks, send-to-chat, open-sheet.
- `spells` (single only): `type === 'spell'`, no filter. Main:
  `requestCastingCheck({ itemId })`. Sub-buttons: checks, send-to-chat, open-sheet.
- `effects` (single only): `primary.effects` (all subtypes), filter
  `system.check?.length > 0` when `effectsWithChecks`. Main: checks →
  `requestItemCheck({ itemRollData: effect.getRollData(), checkIdx: 0 })` else
  `effect.sheet.render(true)`. Sub-buttons: checks (same itemRollData call per idx),
  `duration-increase`/`duration-decrease` ('effect'-subtype only, gated `subButtons.duration`,
  `effect.update({ system: { duration: { remaining: Math.max(0, remaining ± 1) } } })`),
  `remove` (`primary.system.requestEffectDeletion(effect.id)`, gated `subButtons.remove`),
  send-to-chat ('effect' subtype only), open-sheet.
- `utility`: `toggleInspiration` only when `actors.some((a) => a.type === 'player')` (runs
  `toggleInspiration()` on player-type actors only); `shortRest`/`longRest`/`removeCombatEffects`
  call the method with `{}` for every actor; `applyDamage`/`applyHealing`/`applyRend`/`applyRepairs`
  have `mainAction` set by the COMPONENT (Task 11) to open `HudAmountDialog` — the builder emits
  them as `{ key, labelKey, amountPrompt: true }` and no closure.
- Category gating: skip when `options.categories[key] === false`; skip when `subOptions` is empty;
  group mode (actors.length > 1) emits only skills/resistances/utility.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/BuildActionMenuModel.test.js`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/BuildActionMenuModel.test.js src/ui/player-hud/elements/action-menu/BuildActionMenuModel.js
git commit -m "feat: player HUD action-menu model builder"
```

---

### Task 10: HudAmountDialog

**Files:**
- Create: `src/ui/player-hud/elements/action-menu/HudAmountDialog.js`
- Create: `src/ui/player-hud/elements/action-menu/HudAmountDialogShell.svelte`

- [ ] **Step 1: Write the dialog class** (mirror `ConfirmationDialog.js` over the `TitanDialog`
  base — copy its structure exactly, constructor shape from `src/helpers/dialogs/Dialog.js`):

```javascript
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import HudAmountDialogShell from '~/ui/player-hud/elements/action-menu/HudAmountDialogShell.svelte';

/**
 * Amount-confirmation dialog for the HUD's apply damage / healing / rend / repairs actions.
 * @param {string} titleKey - Localization key for the dialog title and confirm button.
 * @param {Function} onConfirm - Receives the entered amount when confirmed.
 * @class HudAmountDialog
 * @extends TitanDialog
 */
export default class HudAmountDialog extends TitanDialog {
   /**
    * Builds the dialog.
    * @param {string} titleKey - Localization key for the title/confirm label.
    * @param {Function} onConfirm - Receives the entered integer amount.
    */
   constructor(titleKey, onConfirm) {
      super({
         title: localize(titleKey),
         content: {
            class: HudAmountDialogShell,
            props: {
               confirmLabel: localize(titleKey),
               onConfirm: onConfirm,
            },
         },
         id: `titan-hud-amount-dialog-${foundry.utils.randomID()}`,
      });
   }
}
```

(Verify the `TitanDialog` constructor options against `src/helpers/dialogs/Dialog.js` and
`ConfirmationDialog.js` before writing — match whatever those two actually do, including how the
shell closes the application via the `'application'` context.)

- [ ] **Step 2: Write the shell**

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} HudAmountDialogShellProps
    * @property {string} confirmLabel - The confirm button label.
    * @property {Function} onConfirm - Receives the entered amount.
    */

   /** @type {HudAmountDialogShellProps} */
   const { confirmLabel, onConfirm } = $props();

   /** @type {TitanDialog} The owning dialog application. */
   const application = getContext('application');

   /** @type {number} The entered amount. */
   let amount = $state(1);

   /**
    * Confirms the amount and closes the dialog.
    * @returns {void}
    */
   function confirm() {
      onConfirm(Math.max(0, Math.floor(amount)));
      application.close();
   }
</script>

<div class="amount-dialog">
   <label>
      {localize('amount')}
      <input
         type="number"
         min="0"
         bind:value={amount}
         data-testid="hud-amount-input"
         onkeydown={(event) => {
            if (event.key === 'Enter') {
               confirm();
            }
         }}
      />
   </label>
   <button
      type="button"
      data-testid="hud-amount-confirm"
      onclick={confirm}
   >
      {confirmLabel}
   </button>
</div>

<style lang="scss">
   .amount-dialog {
      @include flex-column;
      @include flex-group-top;
      @include padding-standard;

      gap: var(--titan-spacing-standard);

      label {
         @include flex-row;
         @include flex-group-center;

         gap: var(--titan-spacing-standard);
      }

      input {
         width: 80px;
      }

      button {
         @include panel-2;
         @include padding-standard;

         border: none;
         border-radius: var(--titan-border-radius);
         color: inherit;
         cursor: pointer;
      }
   }
</style>
```

- [ ] **Step 3: Lint and commit**

```bash
npx eslint src/ui/player-hud/elements/action-menu/
git add src/ui/player-hud/elements/action-menu/
git commit -m "feat: player HUD amount-confirmation dialog"
```

---

### Task 11: Action menu components

**Files:**
- Create: `src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte`
- Create: `src/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte`
- Create: `src/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte`
- Create: `src/ui/player-hud/elements/action-menu/ActionMenuSubButtons.svelte`
- Modify: `src/ui/player-hud/PlayerHudShell.svelte` (replace the action-menu placeholder)

Behavioral contract (all from the spec — implement exactly):

- `ActionMenuElement` renders the category bar (`flex-column` for `layout: 'vertical'`, `flex-row`
  for horizontal) from `$derived(buildActionMenuModel({ actors, primary: document.data, options }))`
  where `document` is the `'document'` context (live reads keep the model reactive for the single
  character) and `actors` is a prop. Category buttons:
  `data-testid="player-hud-category-${key}"`; click toggles `layoutState.openCategory`.
- The four amount utilities (`amountPrompt: true`) get their `mainAction` here:
  `new HudAmountDialog(sub.labelKey, (amount) => { for (const actor of actors) { actor.system[METHOD[sub.key]](amount, {}); } }).render(true);`
  with `METHOD = { applyDamage: 'applyDamage', applyHealing: 'applyHealing', applyRend: 'applyRend', applyRepairs: 'applyRepairs' }`.
- `ActionMenuFlyout` renders the open category's sub-options as a strictly separate lane beside
  (vertical) / above-below (horizontal) the category bar. Direction = configured preference run
  through `resolveCascadeDirection` with measured sizes (`bind:clientWidth/Height` on the bar and
  the flyout) against `layoutState.rect` — never overlapping the bar lane. Position via absolute
  offsets from the category bar's box.
- Windowing: at most `options.windowSize` sub-options visible; `let windowStart = $state(0)`;
  `onwheel` (passive: false, `preventDefault()`) steps `windowStart` ±1 clamped to
  `[0, subOptions.length - windowSize]`; ▲/▼ indicator rows render when scrolled/scrollable
  (`data-testid="player-hud-flyout-up"` / `-down`).
- `ActionMenuSubOption`: button with `img`/icon + label (`localize(labelKey)` or `label`);
  `data-testid="player-hud-sub-option-${categoryKey}-${subKey}"`; click → `mainAction()`; close the
  menu after main actions (set `layoutState.openCategory = null`) EXCEPT equip/quantity/duration
  toggles, which keep it open (spot the difference by sub-button-origin: main actions close, see
  next bullet for sub-buttons).
- `ActionMenuSubButtons`: a column beside the hovered/focused sub-option (side = configured
  sub-button direction through `resolveCascadeDirection`, third lane, never covering the
  sub-option lane). Reveal on `onpointerenter`/`onfocusin` of the sub-option row, tracked as
  `hoveredSubOption` state in the flyout; each button `data-testid="player-hud-sub-button-${subKey}-${buttonKey}"`.
  Mutating quick buttons (equip, quantity, duration, remove) do NOT close the menu; navigation
  buttons (open sheet) and roll/chat buttons close it.
- Click-away + Escape: `<svelte:window onpointerdowncapture={...} onkeydown={...}/>` in
  `ActionMenuElement` — close `openCategory` when the press is outside the element root
  (`bind:this` + `contains`) or the key is Escape.
- The whole element renders inside `HudElementFrame` (`elementKey="actionMenu"`,
  `minimizeIcon="fas fa-bars"`, `testId="player-hud-action-menu"`) in the shell, passing
  `{actors}` and `options.actionMenu`.

- [ ] **Step 1: Implement the four components per the contract** (follow the established component
  style: typed props typedef, `$derived` model, scoped SCSS with mixins; category/sub-option/
  sub-button buttons reuse the `panel-2`/`panel-3` + `border-radius` pattern from
  `HudEditToolbar.svelte`).

- [ ] **Step 2: Replace the shell placeholder**

```svelte
{#if actionMenuVisible}
   <HudElementFrame
      elementKey="actionMenu"
      {layoutState}
      minimizeIcon="fas fa-bars"
      testId="player-hud-action-menu"
   >
      <ActionMenuElement
         {actors}
         {layoutState}
         options={options.actionMenu}
      />
   </HudElementFrame>
{/if}
```

- [ ] **Step 3: Build, lint, manual smoke**

Run: `npm run build && npx eslint src/ui/player-hud/`
Expected: clean. Smoke (world running): seed a character with a weapon; open Weapons; cascade
columns never overlap; wheel scrolls long skill lists; Escape closes.

- [ ] **Step 4: Commit**

```bash
git add src/ui/player-hud/
git commit -m "feat: player HUD cascading action menu"
```

### Task 12: Action menu e2e — content and actions

**Files:**
- Create: `tests/e2e/player-hud-action-menu.spec.js` (standard scaffold + `seedControlledActor`;
  plus an item/effect seeding helper):

```javascript
/**
 * Adds items/effects to a seeded actor.
 * @param {Page} page - The Playwright page.
 * @param {string} actorId - The actor id.
 * @param {object} docs - { items?: Array<object>, effects?: Array<object> } create payloads.
 * @returns {Promise<void>}
 */
async function seedDocuments(page, actorId, docs) {
   await page.evaluate(async ({ actorId, docs }) => {
      const actor = game.actors.get(actorId);
      if (docs.items?.length) {
         await actor.createEmbeddedDocuments('Item', docs.items);
      }
      if (docs.effects?.length) {
         await actor.createEmbeddedDocuments('ActiveEffect', docs.effects);
      }
   }, { actorId, docs });
}
```

- [ ] **Step 1: Write the tests** — full code for the weapon main-action test; the rest enumerated
  with exact selectors/assertions:

```javascript
test('equipped weapon main action rolls the first attack to chat', async () => {
   const actorId = await seedControlledActor(page, { name: 'HUD Menu Player' });
   await seedDocuments(page, actorId, { items: [{
      name: 'HUD Longsword',
      type: 'weapon',
      system: { equipped: true },
   }] });
   await page.locator('[data-testid="player-hud-category-weapons"]').click();
   const subOption = page.locator('[data-testid^="player-hud-sub-option-weapons-"]').first();
   await subOption.click();
   await expect.poll(
      () => page.evaluate(() => game.messages.contents.at(-1)?.type),
      { message: 'an attack check chat message', timeout: 10000 },
   ).toBe('attackCheck');
});
```

(Confirm the exact subtype string against the attack-check ChatMessage subtype registered in
`system.json` `documentTypes` — use whatever the existing check e2e suites assert, see
`tests/e2e/checkDialog.js:155-181`.) If the user's `getCheckOptions`-style setting opens a dialog
before rolling, set it off for the suite the way the existing check specs do.

1. `categories with no sub-options are hidden` — fresh actor with no items: expect
   `player-hud-category-weapons` count 0 and `player-hud-category-skills` visible.
2. `unequipped weapon main action equips` — weapon `equipped: false` (+ an attack so the filter
   keeps it); click sub-option; poll `item.system.equipped === true`.
3. `weapon sub-buttons` — hover the sub-option (`subOption.hover()`); assert the sub-button column
   shows attack/check/equip/chat/sheet buttons; click `*-send-to-chat` → poll newest message type is
   the weapon item-card subtype; click `*-open-sheet` → poll an AppV2 instance for the item exists
   via `foundry.applications.instances` (the AppV2 detection rule).
4. `skill roll for a group hits every actor` — seed two actors, control both, open Skills, click
   athletics; poll TWO new check messages (count delta 2).
5. `resistance roll rolls for all selected` — same shape, Resistances → reflexes.
6. `apply damage dialog applies to all selected` — group of two with known stamina; Utility →
   `player-hud-sub-option-utility-applyDamage`; fill `hud-amount-input` with 3; click
   `hud-amount-confirm`; poll both actors' stamina dropped by 3.
7. `spell main action rolls a casting check` — seed spell; Spells → click; poll castingCheck
   message subtype.
8. `ability/effect first-check main actions` — ability with one check → itemCheck message; effect
   with one check (`type: 'effect'`, `system.check` seeded the way the effect-sheet e2e seeds them —
   copy its payload) → itemCheck message.
9. `effect duration and remove sub-buttons` — effect with `duration.remaining: 2`: hover its
   sub-option; click `*-duration-increase` → poll remaining 3; click `*-remove` → poll effect gone
   (presence→absence on the same effect id).
10. `commodity quantity sub-buttons` — commodity quantity 2 → increase → 3 → decrease → 2.
11. `filters` — weapon with no attacks/checks hidden by default; set `playerHudOptions`
    `{ actionMenu: { filters: { weaponsWithActions: false } } }` → visible. Reset.
12. `Escape and click-away close the cascade` — open category; press Escape → flyout count 0;
    open again; click the canvas (`page.mouse.click(400, 300)`) → flyout count 0.

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/player-hud-action-menu.spec.js`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/player-hud-action-menu.spec.js
git commit -m "test: player HUD action menu content and action e2e"
```

---

### Task 13: Action menu e2e — layout, directions, flip, scroll, disables

**Files:**
- Create: `tests/e2e/player-hud-action-menu-layout.spec.js`

A local helper writes menu options:

```javascript
/**
 * Patches the action-menu options.
 * @param {Page} page - The Playwright page.
 * @param {object} patch - The actionMenu options patch.
 * @returns {Promise<void>}
 */
async function setMenuOptions(page, patch) {
   await page.evaluate(async (patch) => {
      const current = game.settings.get('titan', 'playerHudOptions') ?? {};
      await game.settings.set('titan', 'playerHudOptions',
         foundry.utils.mergeObject(current, { actionMenu: patch }, { inplace: false }));
   }, patch);
}
```

- [ ] **Step 1: Write the tests** (enumerated; geometry assertions compare
  `boundingBox()` rects):

1. `vertical layout stacks categories in a column; horizontal in a row` — compare two category
   buttons' boxes: vertical ⇒ same x, increasing y; after `setMenuOptions({ layout: 'horizontal' })`
   ⇒ same y, increasing x.
2. `sub-options expand to the configured side and lanes never overlap` — vertical + `subOptions:
   'left'`: flyout box right edge ≤ category bar box left edge (strictly disjoint). Same check for
   `'right'`, and for horizontal with `'up'`/`'down'` on the y axis.
3. `sub-buttons form a third disjoint lane` — hover a weapon sub-option; sub-button column box
   disjoint from BOTH the sub-option lane and category lane.
4. `cascade flips at the screen edge instead of overlapping` — drag-free version: set the
   action-menu position near the LEFT edge via
   `game.settings.set('titan', 'playerHudLayout', { positions: { actionMenu: { anchorX: 'left', anchorY: 'bottom', dx: 8, dy: 16 } } })`
   + `game.titan.playerHud.refresh({ force: true })`; with `subOptions: 'left'` configured, expect
   the flyout to open to the RIGHT (flyout box left edge ≥ bar box right edge). Reset layout after.
5. `long lists window and wheel-scroll` — set `windowSize: 5`; open Skills (18): expect 5 visible
   sub-options + `player-hud-flyout-down` indicator; `locator.hover()` + `page.mouse.wheel(0, 120)`
   → first visible sub-option changes and `player-hud-flyout-up` appears.
6. `per-category disable removes the category` — `setMenuOptions({ categories: { skills: false } })`
   → `player-hud-category-skills` count 0 (after presence first). Reset.
7. `per-sub-button-type disable removes those buttons` — disable `sendToChat`; hover a weapon
   sub-option; `*-send-to-chat` count 0 while `*-open-sheet` remains. Reset.
8. `group mode shows only the three group categories` — two actors controlled: exactly
   skills/resistances/utility category buttons exist.

`afterAll`: reset `playerHudOptions` and `playerHudLayout` to `{}`.

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/player-hud-action-menu-layout.spec.js`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/player-hud-action-menu-layout.spec.js
git commit -m "test: player HUD action menu layout/cascade e2e"
```

---

### Task 14: Effects panel + effect-hud deletion

**Files:**
- Create: `src/ui/player-hud/elements/effects-panel/EffectsPanelElement.svelte`
- Create: `src/ui/player-hud/elements/effects-panel/EffectsListPanel.svelte`
- Create: `src/ui/player-hud/elements/effects-panel/EffectsListRow.svelte`
- Create: `src/ui/player-hud/elements/effects-panel/EffectsIconTray.svelte`
- Create: `src/ui/player-hud/elements/effects-panel/EffectsDetailPopout.svelte`
- Modify: `src/ui/player-hud/PlayerHudShell.svelte` (replace the effects placeholder)
- Delete: `src/ui/effect-hud/` (all 7 files), `src/helpers/Settings/EffectHudEnabled.js`,
  `tests/unit/ResolveHudActor.test.js`, `tests/e2e/effect-hud.spec.js`
- Modify: `src/hooks/OnceReady.js` (remove effect-hud lines + import),
  `src/system/SystemSettings.js` (remove the `enableEffectHud` block), `lang/en.json` (remove its
  SETTINGS keys), `tests/e2e/world.js` (remove the `game.titan.effectHud.refresh()` line — keep the
  `playerHud` refresh added in Task 7)

Component contract:

- `EffectsPanelElement` (props: `options`, `layoutState`): header row (actor name from the
  `'document'` context, uppercase, `font-size-small`), then the style component inside a scroll
  body: `style:width`/`style:height` from `layoutState.effectsPanelSize`, `overflow-y: auto`.
  Root `@include panel-1; @include padding-standard;` + border-radius. Conditions =
  `document.data.effects.filter((e) => e.type === 'condition')`, effects = `type === 'effect'`;
  whole element renders `{#if conditions.length + effects.length > 0}` (the shell already gates on
  single selection).
- `EffectsListPanel` — the sectioned list: CONDITIONS / EFFECTS section titles (reuse the section
  title styling from the old `EffectHudSection.svelte`), rows via `EmbeddedDocumentProvider`
  exactly like the old HUD.
- `EffectsListRow` — start from the old `EffectHudRow.svelte` (icon + name + `DurationTag`, click
  to expand description + `CharacterSheetEffectChecks` + controls) and add to the controls row:
  duration −/+ `IconButton`s (`DECREMENT_ICON`/`INCREMENT_ICON`, effect subtype only, same update
  call as the menu builder) and an open-sheet `IconButton` (`document.doc.sheet.render(true)`).
  Keep send-to-chat + the owner-gated delete exactly as the old row had them. Root padding/spacing:
  the old row's `panel-2` expanded treatment, with `@include margin-top-standard` BETWEEN rows
  (this is the smoosh fix — verify visually).
  testIds: row `player-hud-effect-row`, controls `player-hud-effect-{chat|delete|sheet|duration-up|duration-down}`.
- `EffectsIconTray` — `display: grid; grid-template-columns: repeat(auto-fill, 34px)` of icon
  buttons (`img` + duration badge `{remaining}` for non-permanent effect subtypes),
  testId `player-hud-effect-icon`; click sets `selectedEffectId` state and records the icon's
  `getBoundingClientRect()`.
- `EffectsDetailPopout` — fixed-position card (`position: fixed`, panel-2, width 240px) at the
  recorded rect, `clampPoint`-ed into `layoutState.rect`; contents = the SAME expanded body as
  `EffectsListRow` (description, checks, controls) via `EmbeddedDocumentProvider` around the
  selected effect; closes on outside pointerdown/Escape (same svelte:window pattern as the menu).
  testId `player-hud-effect-popout`.
- Shell mount: `HudElementFrame` with `elementKey="effectsPanel"`, `resizable={true}`,
  `minimizeIcon="fas fa-sparkles"`, `testId="player-hud-effects-panel"`.

- [ ] **Step 1: Implement the five components per the contract.**
- [ ] **Step 2: Replace the shell placeholder** (same pattern as Tasks 6/11).
- [ ] **Step 3: Delete the old effect HUD** — remove the listed files and references. Then sweep:

Run: `grep -rn "effect-hud\|effectHud\|enableEffectHud" src/ tests/ lang/`
Expected: zero hits.

- [ ] **Step 4: Build, lint, full unit run**

Run: `npm run build && npx eslint src/ tests/ && npx vitest run`
Expected: clean; unit count drops by the deleted `ResolveHudActor` tests and gains the new suites.

- [ ] **Step 5: Commit**

```bash
git add -A -- src tests lang docs
git commit -m "feat: player HUD effects panel (list + icon tray); remove the legacy effect HUD"
```

(`git add -A` scoped to those directories only — never `packs/`.)

---

### Task 15: Effects panel e2e

**Files:**
- Create: `tests/e2e/player-hud-effects-panel.spec.js` (standard scaffold + both helpers; seed
  effects with the same payloads the old `effect-hud.spec.js` used — copy them before deleting in
  Task 14, or retrieve from git history `git show HEAD~1:tests/e2e/effect-hud.spec.js`)

- [ ] **Step 1: Write the tests** (enumerated):

1. `panel renders sections for conditions and effects` — seed one condition
   (`actor.toggleStatusEffect('stunned')`) + one effect; expect `player-hud-effects-panel` visible
   with 2 `player-hud-effect-row`s (list style default).
2. `row expands to description and controls` — click a row; expect description text + the control
   testIds visible.
3. `duration −/+ update the effect` — effect seeded `remaining: 2`; click `*-duration-up` → poll 3;
   `*-duration-down` → poll 2.
4. `send to chat creates the effect card` — click `*-chat`; poll newest message type `'effect'`.
5. `remove deletes the effect` — presence→absence on the row for that effect id.
6. `open sheet opens the effect's AppV2 sheet` — click `*-sheet`; poll
   `foundry.applications.instances` for the effect sheet.
7. `icon tray style + detail popout` — set `playerHudOptions` `{ effectsPanel: { style: 'tray' } }`;
   expect `player-hud-effect-icon` count ≥ 1; click one → `player-hud-effect-popout` visible;
   Escape closes it. Reset.
8. `panel scrolls beyond its size` — seed 12 effects; assert the scroll body's `scrollHeight >
   clientHeight` via evaluate.
9. `resize persists` — enable edit mode (`game.titan.playerHud.toggleEditMode()` via evaluate);
   drag `player-hud-effects-panel-resize` with `page.mouse` (+60, +40); exit edit mode; read
   `game.settings.get('titan', 'playerHudLayout').effectsPanelSize` — poll width grew ~60. Reset
   layout.
10. `group selection hides the panel` — presence first, control a second actor with
    `releaseOthers: false`, expect panel count 0.

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/player-hud-effects-panel.spec.js`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/player-hud-effects-panel.spec.js
git commit -m "test: player HUD effects panel e2e"
```

---

### Task 16: Settings application, menu entry, keybinding

**Files:**
- Create: `src/ui/player-hud/settings/PlayerHudSettingsApplication.js` — mirror
  `src/theme/editor/ThemeEditorApplication.js` exactly (ApplicationV2 + `_replaceHTML` mount +
  `_onClose` unmount), `DEFAULT_OPTIONS` with `id: 'titan-player-hud-settings'`,
  `position: { width: 520, height: 680 }` (the AppV2 auto-height collapse gotcha — height is
  REQUIRED), window title `SETTINGS.playerHudSettings.label`.
- Create: `src/ui/player-hud/settings/PlayerHudSettingsShell.svelte`
- Modify: `src/system/SystemSettings.js` — `registerMenu` (mirror the themeEditor block):

```javascript
   game.settings.registerMenu('titan', 'playerHudSettings', {
      hint: 'SETTINGS.playerHudSettings.hint',
      icon: 'fas fa-gauge-high',
      label: 'SETTINGS.playerHudSettings.button',
      name: 'SETTINGS.playerHudSettings.label',
      restricted: false,
      type: PlayerHudSettingsApplication,
   });
```

  plus the keybinding (registered in the same init-time function):

```javascript
   game.keybindings.register('titan', 'togglePlayerHudEditMode', {
      editable: [{ key: 'KeyH', modifiers: ['Shift'] }],
      hint: 'SETTINGS.togglePlayerHudEditMode.hint',
      name: 'SETTINGS.togglePlayerHudEditMode.label',
      onDown: () => {
         game.titan?.playerHud?.toggleEditMode();
         return true;
      },
   });
```

  (Keybindings must be registered during `init` — confirm the SystemSettings register function runs
  there; if `game.keybindings` rejects registration after init, move this block to the init hook
  next to where SystemSettings is invoked.)
- Modify: `src/hooks/OnceReady.js` — expose a shared instance for the edit toolbar's gear button:
  `game.titan.playerHudSettings = new PlayerHudSettingsApplication();`
- Modify: `lang/en.json` — add `SETTINGS.playerHudSettings.button` ("Configure Player HUD") and the
  `SETTINGS.togglePlayerHudEditMode.*` pair.

Shell contract (`PlayerHudSettingsShell.svelte`): a local `$state` copy of `playerHudOptions()`;
every control writes through

```javascript
/**
 * Persists the edited options.
 * @returns {Promise<void>}
 */
async function save() {
   await game.settings.set('titan', 'playerHudOptions', $state.snapshot(options));
}
```

on `onchange`. Groups, in order: General (enable checkbox bound straight to the
`enablePlayerHud` setting; Show Foundry Hotbar likewise; **Edit Layout** button →
`game.titan.playerHud.toggleEditMode(); application.close();`), Portrait (enabled / combat-only /
style select), Action Menu (enabled / combat-only / layout select / both direction selects for the
active layout / window size number / per-category checkboxes / per-sub-button checkboxes / filter
checkboxes), Effects Panel (enabled / combat-only / style select), Danger zone (**Reset Layout** →
`game.titan.playerHud` layout-state `reset()` — expose it as a `resetLayout()` controller method
delegating to `#layoutState.reset()`; **Reset All to Defaults** → set `playerHudOptions` `{}`,
`showFoundryHotbar` false, `enablePlayerHud` true, then `resetLayout()`). Inputs use the shared
form primitives from `~/helpers/svelte-components/` (selects/checkboxes — match what
`ThemeEditorShell` uses). testIds: `player-hud-settings-${group}-${field}` kebab-case, reset
buttons `player-hud-settings-reset-layout` / `player-hud-settings-reset-all`.

- [ ] **Step 1: Implement the application + shell per the contract; add registrations.**
- [ ] **Step 2: Build, lint; manual smoke** — open from Foundry settings; toggle a category off and
  watch the HUD update live (the options `onChange` forces a remount); Shift+H toggles edit mode.
- [ ] **Step 3: Commit**

```bash
git add src/ui/player-hud/settings/ src/system/SystemSettings.js src/hooks/OnceReady.js lang/en.json
git commit -m "feat: player HUD settings application, menu entry, and edit-mode keybinding"
```

---

### Task 17: Layout e2e (edit mode, drag, sidebar, resize, reset, hotbar)

**Files:**
- Create: `tests/e2e/player-hud-layout.spec.js`

- [ ] **Step 1: Write the tests** — full code for the drag test; the rest enumerated:

```javascript
test('edit-mode drag moves the portrait and persists anchors', async () => {
   await seedControlledActor(page, { name: 'HUD Layout Player' });
   await page.evaluate(() => game.titan.playerHud.toggleEditMode());
   const frame = page.locator('[data-testid="player-hud-portrait"]');
   const box = await frame.boundingBox();
   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
   await page.mouse.down();
   await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 80, { steps: 8 });
   await page.mouse.up();
   await page.evaluate(() => game.titan.playerHud.toggleEditMode());
   const stored = await page.evaluate(() => game.settings.get('titan', 'playerHudLayout').positions.portrait);
   expect(stored.dx).toBeGreaterThan(100);
   const after = await frame.boundingBox();
   expect(Math.abs(after.x - (box.x + 120))).toBeLessThanOrEqual(8);
});
```

1. `outside edit mode nothing drags` — same gesture without edit mode; box unchanged; stored layout
   unchanged.
2. `drag persists across reload` — after the drag test's move, `page.reload()` + `login(page)` +
   re-control the token; portrait box ≈ the dragged position. Reset layout after.
3. `minimize persists across remounts` — minimize portrait; release + re-control the token (forces
   remount); restore chip still shown; restore.
4. `sidebar collapse pulls right-anchored elements; expand pushes them` — read the action menu's
   box; `await page.evaluate(() => ui.sidebar.collapse())`; poll box.x grows by ≈ the sidebar width
   delta; `ui.sidebar.expand()`; poll it returns. (Wait via `expect.poll` on `boundingBox().x` —
   the controller re-measures 400ms after the toggle.)
5. `window resize clamps elements into the rect` — `page.setViewportSize({ width: 900, height: 600 })`;
   poll every element's box fits inside `[0, 900 - sidebarWidth] × [0, 600]`; restore viewport.
6. `edit toolbar reset restores default positions` — drag portrait, click
   `player-hud-edit-reset`, expect portrait back at its default-resolved box.
7. `keybinding toggles edit mode` — `page.keyboard.press('Shift+KeyH')`; expect
   `player-hud-edit-toolbar` visible; press again, count 0. (If the press doesn't reach Foundry's
   keybinding layer because focus sits in an input, click the canvas first.)
8. `settings app reset-all restores options and layout` — change a style + drag an element; open the
   settings app via evaluate `game.titan.playerHudSettings.render(true)`; click
   `player-hud-settings-reset-all`; poll `playerHudOptions` setting is `{}` and layout positions are
   defaults.
9. `hotbar hidden by default; setting shows it` — expect `#hotbar` not visible; set
   `showFoundryHotbar` true → poll visible; set false back → hidden (presence→absence rule
   satisfied by the true→false leg).

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/player-hud-layout.spec.js`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/player-hud-layout.spec.js
git commit -m "test: player HUD layout e2e (drag, sidebar push/pull, resize, resets, hotbar)"
```

---

### Task 18: Full suite, docs, skill update, wrap-up

- [ ] **Step 1: Full verification**

Run, in order (NEVER build during the e2e run):

```bash
npm run build
npx eslint src/ tests/
npx vitest run
npm run test:e2e
```

Expected: build clean, lint 0, all unit suites pass, full e2e green (previous baseline 417 minus
the deleted effect-hud specs plus the six new files). Read e2e counts from the incremental log,
not the exit pipe.

- [ ] **Step 2: Documentation updates (required)**

- `docs/OPEN_BUGS.md`: delete bug #1; append it to `docs/CLOSED_BUGS.md` with resolution "replaced
  by the Player HUD effects panel (spec 2026-06-11-player-hud-design.md)".
- `docs/TODO.md` #26: note the Effect Tray/HUD surface pass is superseded for the HUD by the
  Player HUD; the Effect **Tray** pass remains.
- `.claude/skills/titan-codebase/references/architecture.md` + `abstractions.md` +
  `conventions.md`: add `src/ui/player-hud/` (controller pattern, layout anchoring, settings
  model), remove every effect-hud mention, note the hotbar-hidden default and the four
  player-HUD settings keys.

- [ ] **Step 3: Commit docs**

```bash
git add docs/ .claude/skills/titan-codebase/
git commit -m "docs: player HUD ships; close OPEN_BUGS #1; update codebase skill"
```

- [ ] **Step 4: Final review and integration**

Dispatch the single fresh-context branch review per `mainline-plan-execution`; resolve findings;
then merge `feature/player-hud` → `main` per the live-dir rules (`git branch -f` + refspec push —
no checkout dance with the packs dir; confirm branch deletion with the user before deleting).

---

## Self-review notes (run during plan execution, not deferred)

- Sub-agent-sourced API claims used by code in this plan that MUST be re-verified at the point of
  use (each is one grep): `IconButton` prop names incl. `testId` forwarding; `DocumentIntegerInput`
  bind/commit behavior (Enter vs blur) for the bar-edit e2e; resource `max` path
  (`system.resource[r].max`); existing `LOCAL.*` keys before adding duplicates; existing
  stamina/resolve/wounds color tokens; the attack/casting/item check ChatMessage subtype strings;
  the `TitanDialog` options contract; whether `game.keybindings.register` works from
  SystemSettings' call site.
- Both reset buttons exist (settings app); reset-layout additionally lives on the edit toolbar.
- Every spec-§9 e2e bullet maps to Tasks 7/8/12/13/15/17; unit bullets map to Tasks 2/3/4/9.




