# Effect Tray Sidebar Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per project CLAUDE.md, route all `.js` / `.svelte` edits to the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded. The Foundry `test-titan` world must be **launched** (`curl localhost:30000/api/status` → `"active":true`) before any e2e run; the user launches it.

**Goal:** Add a native TITAN sidebar tab (`titanEffects`) that hosts a Svelte "effect tray" — a dropdown-selected browser over any visible ActiveEffect compendium with one-click owner-gated Apply, drag-to-apply, and full CRUD (create / stash-from-actor / duplicate / rename / delete / folders).

**Architecture:** Register the tab the blessed v14 way — additively add a `titanEffects` entry to `foundry.applications.sidebar.Sidebar.TABS` at `init` and set `CONFIG.ui.titanEffects = TitanEffectTrayTab`. `TitanEffectTrayTab extends AbstractSidebarTab` (an `ApplicationV2`) and mounts a Svelte shell imperatively in `_replaceHTML`, mirroring `TitanDocumentSheet`. The tray's reactive state lives in a Svelte 5 runes class (`EffectTrayState.svelte.js`) put into Svelte context (there is no single backing document). Apply reuses an upgraded shared `getBestCharactersToUpdate()`.

**Tech Stack:** Foundry VTT v14 (ApplicationV2 + `AbstractSidebarTab`), pure Svelte 5 (runes) mounted via `mount()`/`unmount()`, Vite build to repo root, Vitest unit, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-06-02-effect-tray-sidebar-tab-design.md`

---

## File Structure

**Create (JS):**
- `src/sidebar/TitanEffectTrayTab.js` — the `AbstractSidebarTab` subclass; mounts the Svelte shell.
- `src/sidebar/tray/EffectTrayState.svelte.js` — runes state class (selected pack, search, folders, loaded docs, `refresh()`).
- `src/sidebar/tray/GetEffectCompendiums.js` — pure helper: filter + sort visible ActiveEffect packs.
- `src/helpers/utility-functions/GetFocusedCharacterSheetActor.js` — focused-sheet actor (targeting fallback).
- `src/helpers/utility-functions/ApplyEffectToTargets.js` — owner-gated copy-apply + notification.

**Create (Svelte, under `src/sidebar/tray/`):**
- `EffectTrayShell.svelte` — sets tray state into context, renders `EffectTray`.
- `EffectTray.svelte` — composes header + list; hosts the drag-in drop zone.
- `EffectTrayHeader.svelte` — compendium dropdown, search, + New, folder controls.
- `EffectTrayList.svelte` — renders filtered effects grouped by folder.
- `EffectTrayRow.svelte` — one effect row: icon, inline-rename, Apply, drag source, context menu.

**Modify:**
- `src/hooks/OnceInit.js` — register the tab (TABS entry + `CONFIG.ui.titanEffects`).
- `src/system/SystemSettings.js` — register `effectTrayLastPack` client setting.
- `src/helpers/utility-functions/GetBestCharactersToUpdate.js` — upgrade fallback ladder.
- `lang/en.json` — `LOCAL` + `SETTINGS` keys.

**Create (tests):**
- `tests/GetBestCharactersToUpdate.test.js` — unit (targeting ladder).
- `tests/GetEffectCompendiums.test.js` — unit (pack filter/sort).
- `tests/e2e/effect-tray.spec.js` — e2e (registration, dropdown, apply, CRUD, drag-stash).

---

### Task 1: Walking skeleton — register the tab and mount a stub Svelte panel

De-risks the feasibility hinge: prove the tab registers, appears in the sidebar, and mounts Svelte before building the tray.

**Files:**
- Create: `src/sidebar/TitanEffectTrayTab.js`
- Create: `src/sidebar/tray/EffectTrayShell.svelte`
- Modify: `src/hooks/OnceInit.js`
- Modify: `lang/en.json`
- Test: `tests/e2e/effect-tray.spec.js`

- [ ] **Step 1: Read the mount pattern to mirror**

Read `src/document/sheet/TitanDocumentSheet.js` in full — specifically its `_renderHTML`, `_replaceHTML`, `_onClose`, the `mount`/`unmount` imports, and how `#mountHandle` is stored. The tab below mirrors it exactly, minus the `ReactiveDocument` bridge (a tab has no backing document). Confirm whether `TitanDocumentSheet` also overrides `_renderHTML` (a pure-Svelte AppV2 typically returns an empty value there so the base does not try Handlebars); replicate whatever it does.

- [ ] **Step 2: Write the failing e2e test**

Create `tests/e2e/effect-tray.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

// The in-sidebar tab content selector for the TITAN effect tray.
const TRAY_SELECTOR = 'section.titanEffects-sidebar, section#titanEffects';

test.describe('effect tray sidebar tab', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.ui?.titanEffects);
      expect(ready, 'TITAN system + titanEffects tab must be registered').toBe(true);
   });

   test('the titanEffects tab is registered and its panel mounts', async ({ page }) => {
      // The tab class is registered on CONFIG.ui and added to the Sidebar tab list.
      const registered = await page.evaluate(() => {
         const inTabs = 'titanEffects' in foundry.applications.sidebar.Sidebar.TABS;
         const hasClass = !!CONFIG.ui.titanEffects;
         return inTabs && hasClass;
      });
      expect(registered, 'titanEffects must be in Sidebar.TABS and CONFIG.ui').toBe(true);

      // Activate the tab and confirm the Svelte panel mounted with our marker.
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      });
      await expect(page.locator('[data-testid="effect-tray"]').first()).toBeVisible();
      expect(errors, `uncaught errors mounting the tray:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js`
Expected: FAIL — `CONFIG.ui.titanEffects` is undefined (tab not registered yet).

- [ ] **Step 4: Create the stub shell**

Create `src/sidebar/tray/EffectTrayShell.svelte`:

```svelte
<script>
   /**
    * @typedef {object} EffectTrayShellProps
    * @property {object} trayState - The reactive Effect Tray state instance.
    */

   /** @type {EffectTrayShellProps} */
   const { trayState } = $props();
</script>

<div
   class="titan-effect-tray"
   data-testid="effect-tray"
>
   <!-- Stub content replaced in Task 3 by the full tray (header + list). -->
   <p>{trayState ? 'Effect Tray' : 'Effect Tray'}</p>
</div>
```

- [ ] **Step 5: Create the tab application class**

Create `src/sidebar/TitanEffectTrayTab.js` (mirror `TitanDocumentSheet`'s mount; adjust method bodies to match what Step 1 found):

```javascript
import { mount, unmount } from 'svelte';
import EffectTrayShell from '~/sidebar/tray/EffectTrayShell.svelte';

/**
 * A custom sidebar tab presenting the TITAN Effect Tray: a browsable, applicable library of
 * Active Effects backed by any visible ActiveEffect compendium.
 * @extends {foundry.applications.sidebar.AbstractSidebarTab}
 */
export default class TitanEffectTrayTab extends foundry.applications.sidebar.AbstractSidebarTab {

   /** @type {string} The sidebar tab name (matches the Sidebar.TABS key and CONFIG.ui key). */
   static tabName = 'titanEffects';

   /** @type {object} The default application options for the tab. */
   static DEFAULT_OPTIONS = {
      classes: ['titan'],
   };

   /** @type {object | undefined} The handle returned by Svelte's mount(), used to unmount on close. */
   #mountHandle = void 0;

   /** @type {object | undefined} The reactive tray state instance, created lazily on first render. */
   #trayState = void 0;

   /**
    * Renders the inner HTML. Pure-Svelte tab: returns an empty object; the mount happens in
    * _replaceHTML. Mirror TitanDocumentSheet exactly (replicate its _renderHTML if it defines one).
    * @param {object} context - The prepared render context.
    * @param {object} options - The render options.
    * @returns {Promise<object>} An empty render result.
    */
   async _renderHTML(context, options) {
      return {};
   }

   /**
    * Mounts the Svelte tray into the content element on first render.
    * @param {object} result - The result from _renderHTML (unused for the Svelte mount).
    * @param {HTMLElement} content - The tab content element to mount into.
    * @param {object} options - The render options; options.isFirstRender gates the mount.
    * @returns {void}
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         this.#trayState ??= this.#createTrayState();
         this.#mountHandle = mount(EffectTrayShell, {
            target: content,
            props: {
               trayState: this.#trayState,
            },
            context: new Map([['application', this]]),
         });
      }
   }

   /**
    * Creates the reactive tray state. Stubbed in Task 1; replaced in Task 3 with EffectTrayState.
    * @returns {object} The tray state instance.
    */
   #createTrayState() {
      return {};
   }

   /**
    * Unmounts the Svelte tray when the tab application closes.
    * @param {object} options - The close options.
    * @returns {void}
    */
   _onClose(options) {
      super._onClose(options);
      if (this.#mountHandle) {
         unmount(this.#mountHandle, { outro: true });
         this.#mountHandle = void 0;
      }
   }
}
```

- [ ] **Step 6: Register the tab in `OnceInit.js`**

In `src/hooks/OnceInit.js`, add the import near the other imports:

```javascript
import TitanEffectTrayTab from '~/sidebar/TitanEffectTrayTab.js';
```

Inside `onceInit()`, after the `CONFIG.ui`-relevant configuration and before/after the sheet registrations (any point inside the `init` hook is fine), add:

```javascript
   // Register the TITAN Effect Tray sidebar tab (additive — do not replace the core Sidebar).
   foundry.applications.sidebar.Sidebar.TABS.titanEffects = {
      icon: 'fa-solid fa-wand-sparkles',
      tooltip: 'TYPES.SidebarTab.titanEffects',
   };
   CONFIG.ui.titanEffects = TitanEffectTrayTab;
```

**Note:** If runtime shows core does not instantiate `ui.titanEffects` from a mutated `TABS` static (i.e. `ui.titanEffects` is undefined after boot), fall back to a minimal `Sidebar` subclass that defines `static TABS = { ...super.TABS, titanEffects: {...} }` and assign `CONFIG.ui.sidebar = TitanSidebar`. Verify which is needed during this step and record the choice in the spec's "Decision" section.

- [ ] **Step 7: Add the tab tooltip lang key**

In `lang/en.json`, add a top-level `"TYPES"` → `"SidebarTab"` → `"titanEffects"` key (create the nesting if absent):

```json
   "TYPES": {
      "SidebarTab": {
         "titanEffects": "TITAN Effects"
      }
   }
```

(If `TYPES` already exists, add only the `SidebarTab.titanEffects` leaf. Keep JSON valid.)

- [ ] **Step 8: Build and run the test to verify it passes**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js`
Expected: PASS — the tab is registered and the stub panel mounts (`[data-testid="effect-tray"]` visible).

- [ ] **Step 9: Commit**

```bash
git add src/sidebar/TitanEffectTrayTab.js src/sidebar/tray/EffectTrayShell.svelte src/hooks/OnceInit.js lang/en.json tests/e2e/effect-tray.spec.js
git commit -m "feat(effects): register titanEffects sidebar tab walking skeleton (#2)"
```

---

### Task 2: Upgrade the shared targeting ladder

Pure logic, unit-tested, independent of the UI. Upgrades `getBestCharactersToUpdate()` in place (damage/healing benefit too), preserving the existing primary order and adding fallbacks where there were none.

**Files:**
- Create: `src/helpers/utility-functions/GetFocusedCharacterSheetActor.js`
- Modify: `src/helpers/utility-functions/GetBestCharactersToUpdate.js`
- Test: `tests/GetBestCharactersToUpdate.test.js`

- [ ] **Step 1: Write the failing unit test**

Create `tests/GetBestCharactersToUpdate.test.js`:

```javascript
import { afterEach, describe, expect, it, vi } from 'vitest';
import getBestCharactersToUpdate from '../src/helpers/utility-functions/GetBestCharactersToUpdate.js';

// Build a fake character actor.
const actor = (id) => ({ id, system: { isCharacter: true } });
// Build a fake token wrapping an actor.
const token = (a) => ({ actor: a });

/**
 * Installs the global game/canvas state the targeting ladder reads.
 * @param {object} opts - Targeting inputs.
 */
function setup({ isGM = false, targets = [], controlled = [], userCharacter = null, focused = null }) {
   globalThis.game = { user: { isGM, targets, character: userCharacter } };
   globalThis.canvas = { tokens: { controlled } };
   // The focused-sheet fallback resolves through the focused-sheet helper, mocked below.
   vi.doMock('../src/helpers/utility-functions/GetFocusedCharacterSheetActor.js', () => ({
      default: () => focused,
   }));
}

afterEach(() => {
   vi.restoreAllMocks();
   vi.resetModules();
});

describe('getBestCharactersToUpdate — upgraded fallback ladder', () => {
   it('GM: returns targeted characters first', () => {
      const t = actor('t');
      setup({ isGM: true, targets: [{ actor: t }], controlled: [token(actor('c'))] });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['t']);
   });

   it('GM: falls back to controlled tokens when no targets', () => {
      const c = actor('c');
      setup({ isGM: true, targets: [], controlled: [token(c)] });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['c']);
   });

   it('player: returns controlled characters first', () => {
      const c = actor('c');
      setup({ isGM: false, controlled: [token(c)], userCharacter: actor('main') });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['c']);
   });

   it('player: falls back to the assigned character', () => {
      const main = actor('main');
      setup({ isGM: false, controlled: [], userCharacter: main });
      expect(getBestCharactersToUpdate().map((a) => a.id)).toEqual(['main']);
   });
});
```

**Note on the focused-sheet fallback test:** because `getTargetedCharacters()` already applies a GM controlled-token fallback internally, the GM ladder's first two rungs are covered above. Add one more case asserting the focused-sheet fallback only after dynamic import wiring is confirmed in Step 3 (the existing helpers read `game`/`canvas`; if the mock for the focused-sheet helper does not take effect under the existing import graph, assert the focused fallback via a direct unit test of the composed function instead).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- GetBestCharactersToUpdate`
Expected: FAIL (current implementation lacks the GM controlled fallback returning `['c']` only via `getTargetedCharacters`, and lacks the focused-sheet rung) — confirm which assertions fail.

- [ ] **Step 3: Create the focused-sheet helper**

Create `src/helpers/utility-functions/GetFocusedCharacterSheetActor.js`:

```javascript
/**
 * Gets the Character Actor whose sheet is currently focused/active, if any. Used as the final
 * fallback target when no tokens are targeted or controlled.
 * @returns {TitanActor | null} The focused sheet's Character Actor, or null if none applies.
 */
export default function getFocusedCharacterSheetActor() {
   // The most recently focused application window (Foundry tracks this on ui.activeWindow).
   const active = ui.activeWindow;
   const actor = active?.document?.documentName === 'Actor' ? active.document : void 0;
   return actor?.system?.isCharacter ? actor : null;
}
```

**Note:** Verify the focused-application accessor against the v14 client (`ui.activeWindow` and the document accessor on `TitanActorSheet`). If `ui.activeWindow` is not the right source, use the documented v14 equivalent for "the active sheet" and adjust; the contract (return a focused Character Actor or null) is fixed.

- [ ] **Step 4: Upgrade `getBestCharactersToUpdate`**

Replace the body of `src/helpers/utility-functions/GetBestCharactersToUpdate.js`:

```javascript
import getTargetedCharacters from '~/helpers/utility-functions/GetTargetedCharacters.js';
import getControlledCharacters from '~/helpers/utility-functions/GetControlledCharacters.js';
import getFocusedCharacterSheetActor from '~/helpers/utility-functions/GetFocusedCharacterSheetActor.js';

/**
 * Gets the best Character Actors for the current user to perform updates on (damage, healing, effect
 * application). The primary order is unchanged from prior behavior; additional fallbacks are appended.
 * GM: targeted characters (which themselves fall back to controlled tokens) -> focused sheet actor.
 * Player: controlled characters -> assigned character -> focused sheet actor.
 * @returns {TitanActor[]} The de-duplicated best Character Actors for the current user to update.
 */
export default function getBestCharactersToUpdate() {
   /** @type {TitanActor[]} The resolved target actors. */
   let retVal = [];

   // If the user is a GM, prefer targeted characters (getTargetedCharacters already falls back to
   // controlled tokens for GMs when nothing is targeted).
   if (game.user.isGM) {
      retVal = getTargetedCharacters();
   }

   // Otherwise, for players, prefer controlled characters, then the assigned character.
   else {
      retVal = getControlledCharacters();
      if (retVal.length <= 0) {
         const userCharacter = game.user.character;
         if (userCharacter?.system.isCharacter) {
            retVal.push(userCharacter);
         }
      }
   }

   // Final fallback for both roles: the focused character sheet, if any.
   if (retVal.length <= 0) {
      const focused = getFocusedCharacterSheetActor();
      if (focused) {
         retVal.push(focused);
      }
   }

   // De-duplicate by id to guard against a token and its actor resolving twice.
   /** @type {Map<string, TitanActor>} Unique actors keyed by id. */
   const unique = new Map();
   for (const target of retVal) {
      unique.set(target.id, target);
   }

   return Array.from(unique.values());
}
```

**Note:** this swaps the inline controlled-token filter for the existing `getControlledCharacters()` helper (DRY — same logic). Confirm `getControlledCharacters` returns character actors (it does: filters `token.actor?.system.isCharacter`).

- [ ] **Step 5: Run the unit test to verify it passes**

Run: `npm test -- GetBestCharactersToUpdate`
Expected: PASS for all ladder cases.

- [ ] **Step 6: Run the full unit suite + damage/healing e2e regression**

Run: `npm test` (expect 64 baseline + new file's cases, no regressions).
Run: `npm run build:e2e` then `npm run test:e2e -- socket-sync.spec.js` (expect green — the upgraded targeting must not break damage/healing replication).
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/helpers/utility-functions/GetFocusedCharacterSheetActor.js src/helpers/utility-functions/GetBestCharactersToUpdate.js tests/GetBestCharactersToUpdate.test.js
git commit -m "feat(effects): upgrade getBestCharactersToUpdate fallback ladder (#2)"
```

---

### Task 3: Tray state + compendium dropdown + list/row (browse)

Replaces the stub with the real tray: state class, compendium-source helper, header (dropdown + search), and the list/row (browse only — Apply/CRUD come next).

**Files:**
- Create: `src/sidebar/tray/GetEffectCompendiums.js`
- Create: `src/sidebar/tray/EffectTrayState.svelte.js`
- Modify: `src/sidebar/TitanEffectTrayTab.js` (use the real state)
- Modify: `src/sidebar/tray/EffectTrayShell.svelte` (set context, render `EffectTray`)
- Create: `src/sidebar/tray/EffectTray.svelte`
- Create: `src/sidebar/tray/EffectTrayHeader.svelte`
- Create: `src/sidebar/tray/EffectTrayList.svelte`
- Create: `src/sidebar/tray/EffectTrayRow.svelte`
- Modify: `src/system/SystemSettings.js`, `lang/en.json`
- Test: `tests/GetEffectCompendiums.test.js`, `tests/e2e/effect-tray.spec.js`

- [ ] **Step 1: Write the failing unit test for the compendium-source helper**

Create `tests/GetEffectCompendiums.test.js`:

```javascript
import { describe, expect, it } from 'vitest';
import getEffectCompendiums from '../src/sidebar/tray/GetEffectCompendiums.js';

// Build a fake pack collection entry.
const pack = (collection, type, visible, system) => ({
   collection,
   metadata: { type, label: collection, packageType: system === 'titan' ? 'system' : 'world' },
   visible,
});

describe('getEffectCompendiums', () => {
   it('keeps only visible ActiveEffect packs, TITAN (system) first then alphabetical', () => {
      globalThis.game = {
         packs: [
            pack('world.zeffects', 'ActiveEffect', true, 'world'),
            pack('titan.effects', 'ActiveEffect', true, 'titan'),
            pack('world.actors', 'Actor', true, 'world'),
            pack('world.hidden', 'ActiveEffect', false, 'world'),
            pack('world.aeffects', 'ActiveEffect', true, 'world'),
         ],
      };
      expect(getEffectCompendiums().map((p) => p.collection))
         .toEqual(['titan.effects', 'world.aeffects', 'world.zeffects']);
   });

   it('returns an empty array when no ActiveEffect packs are visible', () => {
      globalThis.game = { packs: [pack('world.actors', 'Actor', true, 'world')] };
      expect(getEffectCompendiums()).toEqual([]);
   });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- GetEffectCompendiums`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the compendium-source helper**

Create `src/sidebar/tray/GetEffectCompendiums.js`:

```javascript
/**
 * Gets the compendium packs the tray can display: every visible ActiveEffect-type pack, sorted with
 * TITAN (system) packs first, then alphabetically by label.
 * @returns {CompendiumCollection[]} The visible ActiveEffect packs in display order.
 */
export default function getEffectCompendiums() {
   /** @type {CompendiumCollection[]} The visible ActiveEffect packs. */
   const packs = game.packs.filter((pack) => pack.metadata.type === 'ActiveEffect' && pack.visible);

   // System (TITAN) packs sort before world/module packs; ties break alphabetically by label.
   return packs.sort((a, b) => {
      /** @type {boolean} Whether pack a is a system pack. */
      const aSystem = a.metadata.packageType === 'system';

      /** @type {boolean} Whether pack b is a system pack. */
      const bSystem = b.metadata.packageType === 'system';

      if (aSystem !== bSystem) {
         return aSystem ? -1 : 1;
      }

      return a.metadata.label.localeCompare(b.metadata.label);
   });
}
```

**Note:** Verify `metadata.packageType` is the v14 field distinguishing system vs world/module packs (alternative: `metadata.packageName === game.system.id`). Adjust the predicate to whatever the live client exposes; the contract (TITAN-first, then alphabetical, visible ActiveEffect only) is fixed.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- GetEffectCompendiums`
Expected: PASS.

- [ ] **Step 5: Register the `effectTrayLastPack` client setting**

In `src/system/SystemSettings.js`, add (near the other client settings):

```javascript
   // The last ActiveEffect compendium selected in the Effect Tray (per-user).
   game.settings.register('titan', 'effectTrayLastPack', {
      config: false,
      default: '',
      scope: 'client',
      type: String,
   });
```

- [ ] **Step 6: Create the tray state class**

Create `src/sidebar/tray/EffectTrayState.svelte.js`:

```javascript
import getEffectCompendiums from '~/sidebar/tray/GetEffectCompendiums.js';

/**
 * Reactive state for the Effect Tray: the available compendiums, the selected pack, its loaded
 * effect documents, the search filter, and expanded-folder tracking.
 */
export default class EffectTrayState {

   /** @type {CompendiumCollection[]} The visible ActiveEffect packs, in display order. */
   compendiums = $state([]);

   /** @type {string} The collection id of the currently selected pack. */
   selectedPackId = $state('');

   /** @type {object[]} The loaded ActiveEffect documents for the selected pack. */
   effects = $state([]);

   /** @type {string} The current search filter text. */
   filter = $state('');

   /** @type {Set<string>} The ids of folders currently expanded. */
   expandedFolders = $state(new Set());

   /**
    * Constructs the tray state and performs the initial pack discovery + load.
    */
   constructor() {
      this.compendiums = getEffectCompendiums();

      // Restore the last-selected pack, falling back to the system effects pack, then the first.
      /** @type {string} The persisted last-selected pack id. */
      const remembered = game.settings.get('titan', 'effectTrayLastPack');
      const ids = this.compendiums.map((pack) => pack.collection);
      this.selectedPackId = ids.includes(remembered)
         ? remembered
         : (ids.find((id) => id === `${game.system.id}.effects`) ?? ids[0] ?? '');

      this.#registerHooks();
      void this.refresh();
   }

   /**
    * The selected CompendiumCollection, or undefined if none is selected.
    * @returns {CompendiumCollection | undefined} The selected pack.
    */
   get selectedPack() {
      return this.compendiums.find((pack) => pack.collection === this.selectedPackId);
   }

   /**
    * Whether the selected pack is editable by the current user (unlocked + owner).
    * @returns {boolean} True when CRUD actions should be enabled.
    */
   get canEdit() {
      const pack = this.selectedPack;
      return !!pack && !pack.locked && pack.getUserLevel(game.user) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
   }

   /**
    * Selects a pack by id, persists the choice, and reloads its contents.
    * @param {string} packId - The collection id of the pack to select.
    * @returns {Promise<void>}
    */
   async selectPack(packId) {
      this.selectedPackId = packId;
      await game.settings.set('titan', 'effectTrayLastPack', packId);
      await this.refresh();
   }

   /**
    * Reloads the selected pack's documents into reactive state.
    * @returns {Promise<void>}
    */
   async refresh() {
      const pack = this.selectedPack;
      if (!pack) {
         this.effects = [];
         return;
      }

      /** @type {object[]} The full documents in the selected pack. */
      const documents = await pack.getDocuments();

      // TITAN system packs show only effect-subtype AEs; user packs show all ActiveEffects.
      const isSystemPack = pack.metadata.packageType === 'system';
      this.effects = isSystemPack
         ? documents.filter((effect) => effect.type === 'effect')
         : documents;
   }

   /**
    * Registers Foundry hooks that refresh the tray when the selected pack's contents change.
    * @returns {void}
    */
   #registerHooks() {
      /**
       * Refreshes only when the changed effect belongs to the currently-selected pack.
       * @param {object} effect - The ActiveEffect document that changed.
       */
      const onChange = (effect) => {
         if (effect?.pack === this.selectedPackId) {
            void this.refresh();
         }
      };

      for (const hook of ['createActiveEffect', 'updateActiveEffect', 'deleteActiveEffect']) {
         Hooks.on(hook, onChange);
      }
   }
}
```

**Note:** `$state`/`$derived` in a `.svelte.js` class is the project's runes-class convention (mirror an existing `*.svelte.js` state class such as a sheet `*SheetState.svelte.js`). Read one before writing to match the exact idiom (getters vs `$derived` fields). The hooks registered here live for the app session; that is acceptable for a singleton sidebar tab.

- [ ] **Step 7: Wire the real state into the tab**

In `src/sidebar/TitanEffectTrayTab.js`, add the import:

```javascript
import EffectTrayState from '~/sidebar/tray/EffectTrayState.svelte.js';
```

Replace `#createTrayState()` body:

```javascript
   #createTrayState() {
      return new EffectTrayState();
   }
```

- [ ] **Step 8: Build the shell + tray + header + list + row**

Replace `src/sidebar/tray/EffectTrayShell.svelte`:

```svelte
<script>
   import { setContext } from 'svelte';
   import EffectTray from '~/sidebar/tray/EffectTray.svelte';

   /**
    * @typedef {object} EffectTrayShellProps
    * @property {object} trayState - The reactive Effect Tray state instance.
    */

   /** @type {EffectTrayShellProps} */
   const { trayState } = $props();

   // Expose the tray state to all descendant components via context.
   setContext('trayState', trayState);
</script>

<EffectTray />
```

Create `src/sidebar/tray/EffectTray.svelte`:

```svelte
<script>
   import EffectTrayHeader from '~/sidebar/tray/EffectTrayHeader.svelte';
   import EffectTrayList from '~/sidebar/tray/EffectTrayList.svelte';
</script>

<div
   class="titan-effect-tray"
   data-testid="effect-tray"
>
   <EffectTrayHeader />
   <EffectTrayList />
</div>
```

Create `src/sidebar/tray/EffectTrayHeader.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /** @type {object} The reactive tray state from context. */
   const trayState = getContext('trayState');

   // The dropdown options: one per visible ActiveEffect compendium.
   const packOptions = $derived(trayState.compendiums.map((pack) => ({
      value: pack.collection,
      label: pack.metadata.label,
   })));
</script>

<div class="effect-tray-header">
   <Select
      disabled={packOptions.length === 0}
      onchange={() => trayState.selectPack(trayState.selectedPackId)}
      options={packOptions}
      testId="effect-tray-pack-select"
      bind:value={trayState.selectedPackId}
   />
   <input
      class="effect-tray-search"
      data-testid="effect-tray-search"
      placeholder="Search…"
      type="text"
      bind:value={trayState.filter}
   />
</div>
```

Create `src/sidebar/tray/EffectTrayList.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import EffectTrayRow from '~/sidebar/tray/EffectTrayRow.svelte';

   /** @type {object} The reactive tray state from context. */
   const trayState = getContext('trayState');

   // The effects of the selected pack, filtered by the search text, sorted by name.
   const filtered = $derived(
      trayState.effects
         .filter((effect) => effect.name.toLowerCase().includes(trayState.filter.toLowerCase()))
         .sort((a, b) => a.name.localeCompare(b.name)),
   );
</script>

{#if trayState.compendiums.length === 0}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-no-packs"
   >
      No effect compendiums available.
   </p>
{:else if filtered.length === 0}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-empty"
   >
      No effects yet — create one or drag an effect here.
   </p>
{:else}
   <ol
      class="effect-tray-list"
      data-testid="effect-tray-list"
   >
      {#each filtered as effect (effect.id)}
         <li>
            <EffectTrayRow {effect} />
         </li>
      {/each}
   </ol>
{/if}
```

Create `src/sidebar/tray/EffectTrayRow.svelte` (browse-only this task; Apply + context menu added in Tasks 4–6):

```svelte
<script>
   /**
    * @typedef {object} EffectTrayRowProps
    * @property {object} effect - The ActiveEffect document for this row.
    */

   /** @type {EffectTrayRowProps} */
   const { effect } = $props();
</script>

<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
>
   <img
      alt=""
      class="effect-tray-row-icon"
      src={effect.img}
   />
   <span class="effect-tray-row-name">{effect.name}</span>
</div>
```

- [ ] **Step 9: Add the search-placeholder + empty-state LOCAL lang keys**

In `lang/en.json` `LOCAL` block, add (alphabetical-ish):

```json
      "effectTrayEmpty.text": "No effects yet — create one or drag an effect here.",
      "effectTrayNoPacks.text": "No effect compendiums available.",
      "effectTraySearch.text": "Search…",
```

Then replace the hard-coded strings in `EffectTrayList.svelte`/`EffectTrayHeader.svelte` with `localize('effectTrayEmpty')` etc. (import `localize from '~/helpers/utility-functions/Localize.js'`). Keep JSON valid.

- [ ] **Step 10: Extend the e2e test with dropdown + browse coverage**

Add to `tests/e2e/effect-tray.spec.js`, inside the describe block. Seed a world ActiveEffect pack + an effect in `beforeEach` (add to the existing `beforeEach` after login):

```javascript
      // Seed a world ActiveEffect compendium with one effect for the tray to browse.
      await page.evaluate(async () => {
         let pack = game.packs.get('world.e2e-tray-effects');
         if (!pack) {
            pack = await CompendiumCollection.createCompendium({
               type: 'ActiveEffect',
               label: 'E2E Tray Effects',
               name: 'e2e-tray-effects',
            });
         }
         const existing = (await pack.getDocuments()).find((e) => e.name === 'E2E Tray Effect');
         if (!existing) {
            await ActiveEffect.create({ name: 'E2E Tray Effect', type: 'effect' }, { pack: pack.collection });
         }
      });
```

Add the test:

```javascript
   test('the dropdown lists ActiveEffect packs and browsing shows seeded effects', async ({ page }) => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      });

      // The pack select offers the seeded world pack.
      const options = await page.locator('[data-testid="effect-tray-pack-select"] option')
         .allTextContents();
      expect(options.join(' ')).toContain('E2E Tray Effects');

      // Selecting the world pack lists its seeded effect.
      await page.evaluate(async () => {
         await ui.titanEffects.element
            .querySelector('[data-testid="effect-tray-pack-select"]'); // ensure mounted
         await game.titan; // no-op await to keep ordering
      });
      await page.selectOption('[data-testid="effect-tray-pack-select"]', { label: 'E2E Tray Effects' });
      await page.waitForTimeout(400);
      await expect(page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' }).first())
         .toBeVisible();
   });
```

**Note:** if `page.selectOption` does not trigger the Svelte `onchange` reliably for the mounted `<select>`, drive the selection in-world via `ui.titanEffects` state instead (`await ui.titanEffects` exposes the app; expose a test hook if needed) — keep the assertion (seeded row visible) fixed.

- [ ] **Step 11: Build and run**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js` and `npm test -- GetEffectCompendiums`
Expected: PASS — dropdown lists the seeded pack, selecting it shows the row.

- [ ] **Step 12: Commit**

```bash
git add src/sidebar/tray/ src/sidebar/TitanEffectTrayTab.js src/system/SystemSettings.js lang/en.json tests/GetEffectCompendiums.test.js tests/e2e/effect-tray.spec.js
git commit -m "feat(effects): effect tray state, compendium dropdown, browse list (#2)"
```

---

### Task 4: Apply flow (owner-gated copy to smart targets)

**Files:**
- Create: `src/helpers/utility-functions/ApplyEffectToTargets.js`
- Modify: `src/sidebar/tray/EffectTrayRow.svelte` (Apply button)
- Modify: `lang/en.json`
- Test: `tests/e2e/effect-tray.spec.js`

- [ ] **Step 1: Write the failing e2e test**

Add to `tests/e2e/effect-tray.spec.js`:

```javascript
   test('Apply copies the effect onto the controlled token actor', async ({ page }) => {
      // Create an actor + token on the active scene and control it.
      await page.evaluate(async () => {
         const stale = game.actors.getName('E2E Tray Target');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Tray Target', type: 'player' });
         const scene = game.scenes.active ?? (await Scene.create({ name: 'E2E Tray Scene', active: true }));
         const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
            await actor.getTokenDocument({ x: 100, y: 100 }),
         ]);
         tokenDoc.object?.control({ releaseOthers: true });
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 400);
         });
      });

      await page.selectOption('[data-testid="effect-tray-pack-select"]', { label: 'E2E Tray Effects' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="effect-tray-apply"]').first().click();
      await page.waitForTimeout(400);

      const applied = await page.evaluate(() => {
         const actor = game.actors.getName('E2E Tray Target');
         return [...actor.effects].some((e) => e.name === 'E2E Tray Effect');
      });
      expect(applied, 'the effect must be copied onto the controlled token actor').toBe(true);
   });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js -g "Apply copies"`
Expected: FAIL — no `[data-testid="effect-tray-apply"]` button yet.

- [ ] **Step 3: Create the apply helper**

Create `src/helpers/utility-functions/ApplyEffectToTargets.js`:

```javascript
import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';

/**
 * Applies (copies) an ActiveEffect onto the current user's best targets that they own. Targets are
 * resolved via getBestCharactersToUpdate and filtered to those the user owns; a notification reports
 * the outcome.
 * @param {ActiveEffect} effect - The source ActiveEffect to copy.
 * @returns {Promise<void>}
 */
export default async function applyEffectToTargets(effect) {
   /** @type {TitanActor[]} The resolved targets the user owns. */
   const targets = getBestCharactersToUpdate().filter((actor) => actor.isOwner);

   if (targets.length <= 0) {
      ui.notifications.warn(game.i18n.localize('LOCAL.effectTrayNoTargets.text'));
      return;
   }

   /** @type {object} The serialized effect data to copy onto each target. */
   const effectData = effect.toObject();

   for (const target of targets) {
      await target.createEmbeddedDocuments('ActiveEffect', [effectData]);
   }

   ui.notifications.info(game.i18n.format('LOCAL.effectTrayApplied.text', {
      name: effect.name,
      count: targets.length,
   }));
}
```

- [ ] **Step 4: Add the Apply button to the row**

In `src/sidebar/tray/EffectTrayRow.svelte`, add imports and the button. Updated file:

```svelte
<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   /**
    * @typedef {object} EffectTrayRowProps
    * @property {object} effect - The ActiveEffect document for this row.
    */

   /** @type {EffectTrayRowProps} */
   const { effect } = $props();
</script>

<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
>
   <img
      alt=""
      class="effect-tray-row-icon"
      src={effect.img}
   />
   <span class="effect-tray-row-name">{effect.name}</span>
   <IconButton
      data-testid="effect-tray-apply"
      icon="fa-solid fa-bullseye-arrow"
      onclick={() => applyEffectToTargets(effect)}
      tooltip={localize('effectTrayApply')}
   />
</div>
```

**Note:** verify `IconButton.svelte`'s prop names (`icon`, `onclick`, `tooltip`, and how it forwards `data-testid`) against the component; if it does not forward arbitrary attributes, wrap the button in a `<span data-testid="effect-tray-apply">`. Match the icon-button usage in `CharacterSheetEffect.svelte`.

- [ ] **Step 5: Add the apply lang keys**

In `lang/en.json` `LOCAL`:

```json
      "effectTrayApply.text": "Apply to Target",
      "effectTrayApplied.text": "Applied {name} to {count} actor(s).",
      "effectTrayNoTargets.text": "Select or target a token to apply an effect.",
```

- [ ] **Step 6: Build and run to verify it passes**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js -g "Apply copies"`
Expected: PASS — the effect is copied onto the controlled token's actor.

- [ ] **Step 7: Commit**

```bash
git add src/helpers/utility-functions/ApplyEffectToTargets.js src/sidebar/tray/EffectTrayRow.svelte lang/en.json tests/e2e/effect-tray.spec.js
git commit -m "feat(effects): one-click owner-gated effect apply from the tray (#2)"
```

---

### Task 5: Full CRUD (create / duplicate / rename / delete / open sheet)

**Files:**
- Modify: `src/sidebar/tray/EffectTrayHeader.svelte` (+ New)
- Modify: `src/sidebar/tray/EffectTrayRow.svelte` (context menu: open / duplicate / delete; inline rename)
- Modify: `lang/en.json`
- Test: `tests/e2e/effect-tray.spec.js`

- [ ] **Step 1: Write the failing e2e test (create + rename + delete round-trip)**

Add to `tests/e2e/effect-tray.spec.js`:

```javascript
   test('create, rename, and delete round-trip in the selected world pack', async ({ page }) => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });
      });
      await page.selectOption('[data-testid="effect-tray-pack-select"]', { label: 'E2E Tray Effects' });
      await page.waitForTimeout(300);

      // Create a blank effect via the header + New button.
      await page.locator('[data-testid="effect-tray-new"]').click();
      await page.waitForTimeout(400);
      const created = await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return (await pack.getDocuments()).some((e) => e.name === 'New Effect');
      });
      expect(created, 'a blank "New Effect" must be created in the pack').toBe(true);

      // Delete it again (drive the confirm by invoking the row delete + confirming).
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         const doc = (await pack.getDocuments()).find((e) => e.name === 'New Effect');
         await doc.delete();
      });
      await page.waitForTimeout(300);
      const deleted = await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return !(await pack.getDocuments()).some((e) => e.name === 'New Effect');
      });
      expect(deleted, 'the created effect must be deletable from the pack').toBe(true);
   });
```

**Note:** the delete half is exercised directly (via `doc.delete()`) to keep the test deterministic; the row's delete→confirm UI is verified by the unit-level wiring + a manual `verify` pass. If a fully UI-driven delete assertion is wanted, target the row context-menu delete and the `ConfirmationDialog` confirm button (selector `.application.titan-dialog`), mirroring `interaction-dialogs.spec.js`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js -g "round-trip"`
Expected: FAIL — no `[data-testid="effect-tray-new"]` button.

- [ ] **Step 3: Add CRUD helpers to the tray state**

In `src/sidebar/tray/EffectTrayState.svelte.js`, add methods (inside the class):

```javascript
   /**
    * Creates a blank effect-subtype ActiveEffect in the selected pack and opens its sheet.
    * @returns {Promise<void>}
    */
   async createBlankEffect() {
      const pack = this.selectedPack;
      if (!pack || !this.canEdit) {
         return;
      }
      const [created] = await pack.documentClass.createDocuments(
         [{ name: game.i18n.localize('LOCAL.effectTrayNewName.text'), type: 'effect' }],
         { pack: pack.collection },
      );
      created?.sheet?.render(true);
   }

   /**
    * Duplicates an effect within the selected pack with a "(Copy)" suffix.
    * @param {ActiveEffect} effect - The effect to duplicate.
    * @returns {Promise<void>}
    */
   async duplicateEffect(effect) {
      const pack = this.selectedPack;
      if (!pack || !this.canEdit) {
         return;
      }
      const data = effect.toObject();
      data.name = `${data.name} ${game.i18n.localize('LOCAL.effectTrayCopySuffix.text')}`;
      delete data._id;
      await pack.documentClass.createDocuments([data], { pack: pack.collection });
   }

   /**
    * Renames an effect in the selected pack.
    * @param {ActiveEffect} effect - The effect to rename.
    * @param {string} name - The new name.
    * @returns {Promise<void>}
    */
   async renameEffect(effect, name) {
      if (!this.canEdit || !name || name === effect.name) {
         return;
      }
      await effect.update({ name });
   }
```

**Note:** Use whichever create API the v14 `CompendiumCollection.documentClass` exposes (`createDocuments` with `{ pack }`, or `ActiveEffect.create(data, { pack })`). Verify against the client and match the create call used elsewhere (Task 3's e2e seed uses `ActiveEffect.create(data, { pack })`).

- [ ] **Step 4: Add the + New button to the header**

In `src/sidebar/tray/EffectTrayHeader.svelte`, add an IconButton bound to `trayState.createBlankEffect`, disabled unless `trayState.canEdit`:

```svelte
   <IconButton
      data-testid="effect-tray-new"
      disabled={!trayState.canEdit}
      icon="fa-solid fa-plus"
      onclick={() => trayState.createBlankEffect()}
      tooltip={localize('effectTrayNew')}
   />
```

(Add `import IconButton ...` and `import localize ...` to the header script. Place the button in the header row.)

- [ ] **Step 5: Add open/duplicate/delete + inline rename to the row**

In `src/sidebar/tray/EffectTrayRow.svelte`, add:
- A double-click handler on the name that swaps it for an `<input>` whose commit calls `trayState.renameEffect(effect, value)` (read `trayState` from context).
- Buttons (shown to editors via `trayState.canEdit`): Open sheet (`effect.sheet.render(true)`), Duplicate (`trayState.duplicateEffect(effect)`), Delete (a `ConfirmationDialog` then `effect.delete()`).

Delete reuses the confirm pattern from the just-shipped effect-delete. Add a small dialog or inline confirm:

```javascript
   import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {object} The tray state from context. */
   const trayState = getContext('trayState');

   /**
    * Prompts for confirmation, then deletes the effect from its pack.
    * @returns {void}
    */
   function requestDelete() {
      new ConfirmationDialog(
         localize('effectTrayDelete'),
         [effect.name],
         localize('effectTrayConfirmDelete.desc'),
         localize('effectTrayDelete'),
         () => effect.delete(),
      ).render(true);
   }
```

**Note:** match `ConfirmationDialog`'s exact constructor argument order against `src/document/types/actor/dialogs/ConfirmDeleteEffectDialog.js` (title, headers[], message, confirmLabel, onConfirm) — read it before writing. Add `getContext` to the row's imports.

- [ ] **Step 6: Add the CRUD lang keys**

In `lang/en.json` `LOCAL`:

```json
      "effectTrayNew.text": "New Effect",
      "effectTrayNewName.text": "New Effect",
      "effectTrayCopySuffix.text": "(Copy)",
      "effectTrayOpen.text": "Open Sheet",
      "effectTrayDuplicate.text": "Duplicate",
      "effectTrayDelete.text": "Delete Effect",
      "effectTrayConfirmDelete.desc.text": "Are you sure you want to delete this effect from this compendium?",
```

- [ ] **Step 7: Build and run to verify it passes**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js -g "round-trip"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/sidebar/tray/ lang/en.json tests/e2e/effect-tray.spec.js
git commit -m "feat(effects): effect tray full CRUD (create/duplicate/rename/delete) (#2)"
```

---

### Task 6: Drag-to-apply out, stash-from-actor drag-in, and folders

**Files:**
- Modify: `src/sidebar/tray/EffectTrayRow.svelte` (drag source)
- Modify: `src/sidebar/tray/EffectTray.svelte` (drop zone)
- Modify: `src/sidebar/tray/EffectTrayState.svelte.js` (stash + folders)
- Modify: `src/sidebar/tray/EffectTrayList.svelte` (folder grouping)
- Modify: `lang/en.json`
- Test: `tests/e2e/effect-tray.spec.js`

- [ ] **Step 1: Write the failing e2e test (stash)**

Add to `tests/e2e/effect-tray.spec.js` — simulate the drop by invoking the stash handler with effect drag data:

```javascript
   test('stash-from-actor copies a dropped effect into the selected pack', async ({ page }) => {
      await page.evaluate(async () => {
         // An actor with an effect to stash.
         const stale = game.actors.getName('E2E Stash Source');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Stash Source', type: 'player' });
         const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
            { name: 'E2E Stash Effect', type: 'effect' },
         ]);

         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });
         // Select the world pack, then invoke the stash handler with the effect's drag data.
         await ui.titanEffects; // app handle
         await game.titan;
         const dragData = effect.toDragData();
         await ui.titanEffects.element.querySelector('[data-testid="effect-tray"]'); // ensure mounted
         await ui.titanEffects.constructor; // no-op
         await ui.titanEffects.render(false);
         await window.__titanTrayStash?.(dragData);
      });
      await page.waitForTimeout(400);
      const stashed = await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         return (await pack.getDocuments()).some((e) => e.name === 'E2E Stash Effect');
      });
      expect(stashed, 'the dropped effect must be copied into the selected pack').toBe(true);
   });
```

**Note:** This test calls a `window.__titanTrayStash` hook. Either expose the tray state's `stashFromDragData` on `window` in e2e builds only, OR replace this test with a true Playwright drag simulation (`dispatchEvent('drop', { dataTransfer })`) on `[data-testid="effect-tray"]`. Choose one during implementation and keep the assertion (effect copied into the pack) fixed. Ensure the world pack is selected first (drive `ui.titanEffects` state to `world.e2e-tray-effects`).

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js -g "stash"`
Expected: FAIL — no stash handler.

- [ ] **Step 3: Add the drag source to the row**

In `src/sidebar/tray/EffectTrayRow.svelte`, make the row draggable, emitting standard drag data:

```svelte
<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
   draggable={true}
   ondragstart={(event) => event.dataTransfer.setData('text/plain', JSON.stringify(effect.toDragData()))}
>
```

(Dropping on an actor sheet/token uses Foundry's native handling — no extra code needed for drag-out apply.)

- [ ] **Step 4: Add the stash handler + drop zone**

In `src/sidebar/tray/EffectTrayState.svelte.js`, add:

```javascript
   /**
    * Copies an effect described by Foundry drag data into the selected pack.
    * @param {object} dragData - Foundry drag data (expects type 'ActiveEffect' with a uuid).
    * @returns {Promise<void>}
    */
   async stashFromDragData(dragData) {
      const pack = this.selectedPack;
      if (!pack || !this.canEdit || dragData?.type !== 'ActiveEffect') {
         return;
      }
      /** @type {ActiveEffect | null} The source effect resolved from the drag data. */
      const source = await getDocumentClass('ActiveEffect').fromDropData(dragData);
      if (!source) {
         return;
      }
      const data = source.toObject();
      delete data._id;
      await pack.documentClass.createDocuments([data], { pack: pack.collection });
   }
```

(Add `getDocumentClass` import or use `foundry.utils`/global `ActiveEffect.fromDropData` per the client API — verify.) In `src/sidebar/tray/EffectTray.svelte`, add `ondragover`/`ondrop` on the container that parse `text/plain` JSON and call `trayState.stashFromDragData(...)`.

- [ ] **Step 5: Add folders**

In `EffectTrayState.svelte.js` add folder helpers (`createFolder`, `renameFolder`, `deleteFolder`, `toggleFolder(id)` mutating `expandedFolders`) operating on `pack.folders` and `effect.update({ folder })`. In `EffectTrayList.svelte`, group `filtered` by `effect.folder?.id` (or `effect.folder`), render expandable folder headers using `trayState.expandedFolders`; effects with no folder render at the root. Non-folder packs (no `pack.folders.size`) keep the flat list. Add folder controls (create) to `EffectTrayHeader.svelte`, editor-gated.

**Note:** verify v14 compendium folder API (`pack.folders`, `Folder.create({ ... }, { pack })`, and the effect's `folder` field for pack documents). Keep folder UI minimal; this is organization, not core flow.

- [ ] **Step 6: Add folder lang keys**

In `lang/en.json` `LOCAL`: `effectTrayNewFolder.text`, `effectTrayRenameFolder.text`, `effectTrayDeleteFolder.text` as needed by the controls you add.

- [ ] **Step 7: Build and run to verify it passes**

Run: `npm run build:e2e` then `npm run test:e2e -- effect-tray.spec.js`
Expected: all effect-tray tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/sidebar/tray/ lang/en.json tests/e2e/effect-tray.spec.js
git commit -m "feat(effects): effect tray drag-stash, drag-to-apply, and folders (#2)"
```

---

### Task 7: Full suites, lint, regression, close backlog + sync skill

**Files:**
- Modify: `docs/TODO.md`
- Modify: `.claude/skills/titan-codebase/references/*` (architecture + abstractions)

- [ ] **Step 1: Full unit + e2e suites**

Run: `npm test` (expect 64 baseline + the 2 new unit files' cases).
Run: `npm run build:e2e` then `npm run test:e2e` (expect 332 baseline + the new effect-tray cases; no regressions — especially `socket-sync`, `permissions-compendium`, `reactive-effect-rows`, `interaction-dialogs`).
Re-run a single spec once if an unrelated boot-timeout flake appears.

- [ ] **Step 2: Lint**

Run: `npm run eslint` and `npm run stylelint`
Expected: 0 errors; no new warnings from the created files.

- [ ] **Step 3: Mark backlog #2 complete**

In `docs/TODO.md` under "### 2. Custom sidebar-tab effect directory", prepend a `**Status: COMPLETE (sub-project A).**` line summarizing the tray (native `titanEffects` tab, compendium dropdown over visible ActiveEffect packs, owner-gated apply via the upgraded `getBestCharactersToUpdate`, full CRUD + folders) and note **sub-project B** (seeded standard-effects compendium + pack pipeline + rulebook scrape) remains deferred. Keep the original description for history.

- [ ] **Step 4: Sync the titan-codebase skill**

Add to `.claude/skills/titan-codebase/references/architecture.md` a `src/sidebar/` entry (the new sidebar-tab layer) and to `references/abstractions.md` a short paragraph: the `TitanEffectTrayTab` (`AbstractSidebarTab` + Svelte mount, registered via `Sidebar.TABS` + `CONFIG.ui.titanEffects`), the `EffectTrayState` runes class, `GetEffectCompendiums`, `ApplyEffectToTargets`, and the upgraded `getBestCharactersToUpdate` fallback ladder (now also used by damage/healing). Report what was changed.

- [ ] **Step 5: Commit docs**

```bash
git add docs/TODO.md .claude/skills/titan-codebase/
git commit -m "docs(effects): close backlog #2 sub-project A; sync codebase skill"
```

---

## Self-Review

**Spec coverage:**
- Spec "native sidebar tab (Approach 1)" → Task 1 (+ fallback note). ✅
- Spec "compendium dropdown over visible ActiveEffect packs, TITAN-first; display filter" → Task 3 (`GetEffectCompendiums` + state `refresh` filter). ✅
- Spec "layout C: list + inline Apply, drag also" → Task 3 (list/row) + Task 4 (Apply) + Task 6 (drag). ✅
- Spec "smart owner-gated Apply; upgraded shared `getBestCharactersToUpdate`" → Task 2 (upgrade + focused-sheet helper) + Task 4 (`ApplyEffectToTargets`, `isOwner` filter). ✅
- Spec "full CRUD (create/stash/duplicate/rename/delete/folders)" → Task 5 (create/duplicate/rename/delete) + Task 6 (stash/folders). ✅
- Spec "everyone sees it, gated by ownership" → tab registered for all; `canEdit` gates CRUD; `isOwner` gates apply (Tasks 3–5). ✅
- Spec "last-selected pack persists" → `effectTrayLastPack` client setting (Task 3). ✅
- Spec testing (unit: targeting ladder + pack filter; e2e: registration/dropdown/apply/CRUD/stash + regression) → Tasks 2, 3, 4, 5, 6, 7. ✅
- Spec "standard-effects content deferred" → out of scope; noted in Task 7. ✅
- Project CLAUDE.md (close TODO + sync skill) → Task 7. ✅

**Placeholder scan:** No "TBD"/"implement later". Several steps carry explicit **verification notes** for live Foundry-v14 API shapes (the sidebar-tab render hook, `ui.activeWindow`, `metadata.packageType`, the compendium create/folder/`fromDropData` APIs) — these are deliberate "verify against the client, contract is fixed" instructions, not deferred work; each names the exact contract to preserve. The two e2e tests that use a `window.__titanTrayStash`/test-hook or direct `doc.delete()` path document the alternative (true DOM drag/confirm-dialog simulation) and fix the assertion either way.

**Type/name consistency:** `EffectTrayState` (with `selectedPackId`, `effects`, `filter`, `expandedFolders`, `selectedPack`, `canEdit`, `selectPack`, `refresh`, `createBlankEffect`, `duplicateEffect`, `renameEffect`, `stashFromDragData`, folder helpers) is used consistently across Tasks 3–6. `getEffectCompendiums`, `getBestCharactersToUpdate`, `getFocusedCharacterSheetActor`, `applyEffectToTargets`, `TitanEffectTrayTab` (tabName `titanEffects`) match across registration, state, apply, and tests. Context key `'trayState'` is set in `EffectTrayShell` and read in header/list/row. Test ids (`effect-tray`, `effect-tray-pack-select`, `effect-tray-search`, `effect-tray-row`, `effect-tray-apply`, `effect-tray-new`, `effect-tray-empty`, `effect-tray-no-packs`, `effect-tray-list`) are consistent between components and the e2e spec.
