# Effect-tray Context Menu + Localization Test — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a system-wide "double-localized text" test, and upgrade the effects sidebar with a right-click context menu, left-click-to-open, an actor-sheet-style filter bar, and a GM-only compendium lock toggle.

**Architecture:** Two independent deliverables sharing the effects-sidebar surface. Feature 1 is a vitest static audit of `lang/en.json` plus a Playwright DOM+tippy scan across all rendered surfaces. Feature 2 edits the existing `src/sidebar/tray/` Svelte tree, moves row actions into a Foundry `ContextMenu`, and adds reactive lock state to `EffectTrayState`.

**Tech Stack:** Foundry VTT v14 (`foundry.applications.ux.ContextMenu`, `CompendiumCollection.configure`), pure Svelte 5 runes, vitest (happy-dom), Playwright e2e, tippy.js tooltips.

**Project rules:** Route every `.js` / `.svelte` / `.svelte.js` change to the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, `foundry-svelte` skills loaded. Spec: `docs/superpowers/specs/2026-06-02-effect-tray-context-menu-and-localization-test-design.md`.

**Test commands:**
- Unit: `npm test` (vitest, no Foundry needed).
- E2E: requires the TITAN test world **running** in Foundry. Build first (`npm run build:e2e`), then `npm run test:e2e -- <spec>`. If the world is not running, ask the user to launch it (`! npm run dev` is not enough — Foundry must serve the world).

---

## File Structure

**Feature 1 — localization test**
- Create `tests/unit/LocalizationKeys.test.js` — static audit: no `lang/en.json` value contains `LOCAL.`.
- Modify `tests/e2e/fixtures.js` — add `collectLocalizationOffenders(page, rootSelector)` page-side scanner helper.
- Create `tests/e2e/localization.spec.js` — render every surface, assert no `LOCAL.` in text/attrs/tippy.

**Feature 2 — effect tray**
- Modify `src/system/Icons.js` — add `LOCK_ICON`, `UNLOCK_ICON`, `RENAME_ICON`, `MOVE_TO_FOLDER_ICON`, `TARGET_ICON` (+ map entries).
- Modify `lang/en.json` — add 6 keys.
- Modify `src/sidebar/tray/EffectTrayState.svelte.js` — reactive `isLocked`, `isOwner`, reactive `canEdit`, `toggleLock()`, `requestDeleteEffect()`.
- Create `src/sidebar/tray/EffectRowContextMenu.js` — builds the `ContextMenuEntry[]` + effect resolver.
- Create `src/sidebar/tray/MoveEffectToFolderDialog.js` + `src/sidebar/tray/MoveEffectToFolderDialogShell.svelte` — folder-picker dialog.
- Modify `src/sidebar/tray/EffectTray.svelte` — attach the context menu via a Svelte action.
- Modify `src/sidebar/tray/EffectTrayRow.svelte` — left-click opens sheet, keep only Apply inline, rename-event bridge.
- Modify `src/sidebar/tray/EffectTrayHeader.svelte` — actor-sheet-style filter bar + lock toggle.
- Create `tests/unit/EffectRowContextMenu.test.js` — entry labels + visibility.
- Modify `tests/e2e/effect-tray.spec.js` — left-click open, context-menu actions, lock toggle.

**Update after implementation:** `.claude/skills/titan-codebase/references/*.md`, `docs/TODO.md`.

---

## PART A — Localization test

### Task A1: Static `en.json` double-localization audit (vitest)

**Files:**
- Test: `tests/unit/LocalizationKeys.test.js`
- (Possibly) Fix: `lang/en.json` or source, if the test surfaces a real offender.

- [ ] **Step 1: Write the test**

```javascript
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Recursively collects every string value in an object into a list of [keyPath, value] pairs.
 * @param {object} object - The object to walk.
 * @param {string} [prefix] - The accumulated key path.
 * @returns {Array<[string, string]>} The [keyPath, value] pairs for every string leaf.
 */
function collectStringValues(object, prefix = '') {
   /** @type {Array<[string, string]>} The accumulated string leaves. */
   const pairs = [];
   for (const [key, value] of Object.entries(object)) {
      /** @type {string} The dotted key path for this leaf. */
      const keyPath = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
         pairs.push([keyPath, value]);
      }
      else if (value && typeof value === 'object') {
         pairs.push(...collectStringValues(value, keyPath));
      }
   }

   return pairs;
}

describe('en.json localization values', () => {
   it('contains no value that is itself a LOCAL. key (double-localization)', () => {
      /** @type {object} The parsed English localization file. */
      const lang = JSON.parse(
         readFileSync(path.resolve(__dirname, '../../lang/en.json'), 'utf-8'),
      );

      /** @type {Array<[string, string]>} Every [keyPath, value] string leaf. */
      const pairs = collectStringValues(lang);

      /** @type {string[]} The offending "keyPath -> value" descriptions. */
      const offenders = pairs
         .filter(([, value]) => value.includes('LOCAL.'))
         .map(([keyPath, value]) => `${keyPath} -> ${value}`);

      expect(offenders, `Values containing 'LOCAL.':\n${offenders.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- LocalizationKeys`
Expected: PASS. If it FAILS, the message lists each `keyPath -> value` whose value embeds `LOCAL.` — fix that value in `lang/en.json` (or the source that wrote it), then re-run to green.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/LocalizationKeys.test.js lang/en.json
git commit -m "test(i18n): guard en.json values against embedded LOCAL. keys"
```

---

### Task A2: Runtime DOM + tippy localization scan (e2e)

**Files:**
- Modify: `tests/e2e/fixtures.js`
- Create: `tests/e2e/localization.spec.js`

- [ ] **Step 1: Add the scanner helper to `tests/e2e/fixtures.js`**

Append this exported function:

```javascript
/**
 * Collect every user-facing string under a root element that contains the TITAN i18n namespace
 * substring `LOCAL.` — the signature of a missing or double-localized key. Scans text content, the
 * common text-bearing attributes, and tippy tooltip content (read from `_tippy.props.content`, which
 * is populated at mount so no hover is required).
 * @param {import('@playwright/test').Page} page - The Playwright page to evaluate within.
 * @param {string} rootSelector - CSS selector for the root element to scan (e.g. an app element).
 * @returns {Promise<string[]>} The offending strings (deduplicated) found under the root.
 */
export async function collectLocalizationOffenders(page, rootSelector) {
   return page.evaluate((selector) => {
      /** @type {HTMLElement | null} The root element to scan. */
      const root = document.querySelector(selector);
      if (!root) {
         return [`__ROOT_NOT_FOUND__: ${selector}`];
      }

      /** @type {Set<string>} The collected offending strings. */
      const offenders = new Set();

      /** @type {string[]} The text-bearing attributes to inspect on every element. */
      const attributes = ['aria-label', 'title', 'placeholder', 'alt', 'data-tooltip'];

      /**
       * Records a candidate string as an offender when it embeds the LOCAL. namespace.
       * @param {unknown} value - The candidate string (ignored when not a non-empty string).
       * @returns {void}
       */
      const consider = (value) => {
         if (typeof value === 'string' && value.includes('LOCAL.')) {
            offenders.add(value.trim());
         }
      };

      // Visible text nodes.
      /** @type {Node} The tree walker over text nodes under the root. */
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
         consider(walker.currentNode.nodeValue);
      }

      // Attributes and tippy content on every element (including the root).
      for (const element of [root, ...root.querySelectorAll('*')]) {
         for (const attribute of attributes) {
            consider(element.getAttribute(attribute));
         }

         /** @type {*} The tippy tooltip content, when the element carries a tippy instance. */
         const tippyContent = element._tippy?.props?.content;
         if (typeof tippyContent === 'string') {
            consider(tippyContent);
         }
         else if (tippyContent instanceof HTMLElement) {
            consider(tippyContent.textContent);
            consider(tippyContent.outerHTML);
         }
      }

      return [...offenders];
   }, rootSelector);
}
```

- [ ] **Step 2: Write the e2e spec**

Create `tests/e2e/localization.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { collectLocalizationOffenders, ensureDocument, login, renderSheet } from './fixtures.js';

// The seven TITAN Item subtypes, all rendered through the shared item sheet.
const ITEM_TYPES = ['ability', 'armor', 'commodity', 'equipment', 'shield', 'spell', 'weapon'];

test.describe('no double-localized (LOCAL.) text in rendered UI', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   test('player actor sheet', async ({ page }) => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      await renderSheet(page, locate, '.titan-player-sheet');
      const offenders = await collectLocalizationOffenders(page, '.titan-player-sheet');
      expect(offenders, `LOCAL. text on player sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   test('npc actor sheet', async ({ page }) => {
      const locate = await ensureDocument(page, 'Actor', 'npc', 'E2E NPC');
      await renderSheet(page, locate, '.titan-npc-sheet');
      const offenders = await collectLocalizationOffenders(page, '.titan-npc-sheet');
      expect(offenders, `LOCAL. text on npc sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   for (const type of ITEM_TYPES) {
      test(`${type} item sheet`, async ({ page }) => {
         const locate = await ensureDocument(page, 'Item', type, `E2E ${type}`);
         await renderSheet(page, locate, '.titan-item-sheet');
         const offenders = await collectLocalizationOffenders(page, '.titan-item-sheet');
         expect(offenders, `LOCAL. text on ${type} sheet:\n${offenders.join('\n')}`).toEqual([]);
      });
   }

   test('embedded effect sheet', async ({ page }) => {
      await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      const ids = await page.evaluate(async () => {
         const actor = game.actors.find((a) => a.type === 'player' && a.name === 'E2E Player')
            ?? game.actors.find((a) => a.type === 'player');
         let effect = actor.effects.find((e) => e.name === 'E2E Effect');
         if (!effect) {
            const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [
               { name: 'E2E Effect', type: 'effect' },
            ]);
            effect = created;
         }
         return { actorId: actor.id, effectId: effect.id };
      });
      const locateSrc = `() => game.actors.get('${ids.actorId}')?.effects.get('${ids.effectId}')`;
      await renderSheet(page, locateSrc, '.titan-effect-sheet');
      const offenders = await collectLocalizationOffenders(page, '.titan-effect-sheet');
      expect(offenders, `LOCAL. text on effect sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   test('effects sidebar header, rows, and context menu', async ({ page }) => {
      // Seed a world ActiveEffect pack with one effect, render + activate the tray, select the pack.
      await page.evaluate(async () => {
         let pack = game.packs.get('world.e2e-tray-effects');
         if (!pack) {
            pack = await CompendiumCollection.createCompendium({
               type: 'ActiveEffect', label: 'E2E Tray Effects', name: 'e2e-tray-effects',
            });
         }
         const existing = (await pack.getDocuments()).find((e) => e.name === 'E2E Tray Effect');
         if (!existing) {
            await ActiveEffect.create({ name: 'E2E Tray Effect', type: 'effect' }, { pack: pack.collection });
         }
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => { setTimeout(resolve, 500); });
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => { setTimeout(resolve, 400); });
      });

      // Scan the mounted tray (header + rows).
      const trayOffenders = await collectLocalizationOffenders(page, '[data-testid="effect-tray"]');
      expect(trayOffenders, `LOCAL. text in effect tray:\n${trayOffenders.join('\n')}`).toEqual([]);

      // Open the row context menu and scan it (Foundry appends #context-menu to the body).
      await page.locator('[data-testid="effect-tray-row"]').first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      const menuOffenders = await collectLocalizationOffenders(page, '#context-menu');
      expect(menuOffenders, `LOCAL. text in context menu:\n${menuOffenders.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 3: Build and run the e2e spec (world must be running)**

Run: `npm run build:e2e && npm run test:e2e -- localization`
Expected: all surfaces PASS. Any failure prints the exact offending `LOCAL.` strings — fix the offending `localize('LOCAL.…')` double-wrap or missing key in source, rebuild, re-run.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/fixtures.js tests/e2e/localization.spec.js
git commit -m "test(i18n): e2e scan for LOCAL. text/tooltips across all surfaces"
```

---

## PART B — Effect tray

### Task B1: Add icons

**Files:**
- Modify: `src/system/Icons.js`

- [ ] **Step 1: Add the icon constants**

Insert these exports alphabetically among the existing constants in `src/system/Icons.js`:

```javascript
export const LOCK_ICON = 'fas fa-lock';
export const MOVE_TO_FOLDER_ICON = 'fas fa-folder-arrow-down';
export const RENAME_ICON = 'fas fa-pen';
export const TARGET_ICON = 'fas fa-bullseye-arrow';
export const UNLOCK_ICON = 'fas fa-lock-open';
```

- [ ] **Step 2: Add map entries**

Insert these keys (alphabetically) into the `ICON_MAP` object literal:

```javascript
   lock: LOCK_ICON,
   moveToFolder: MOVE_TO_FOLDER_ICON,
   rename: RENAME_ICON,
   target: TARGET_ICON,
   unlock: UNLOCK_ICON,
```

- [ ] **Step 3: Lint and commit**

Run: `npm run eslint -- src/system/Icons.js`
Expected: no errors.

```bash
git add src/system/Icons.js
git commit -m "feat(icons): add lock/unlock/rename/move/target icons"
```

---

### Task B2: Add localization keys

**Files:**
- Modify: `lang/en.json`

- [ ] **Step 1: Add the keys**

Insert these entries into the `LOCAL` object in `lang/en.json` (keep the file's alphabetical-ish grouping near the other `effectTray*` keys):

```json
      "effectTrayLock.text": "Lock Compendium",
      "effectTrayMoveToFolder.text": "Move to Folder",
      "effectTrayMoveToFolderPrompt.text": "Choose a destination folder.",
      "effectTrayRename.text": "Rename",
      "effectTrayRoot.text": "(Root)",
      "effectTrayUnlock.text": "Unlock Compendium",
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('lang/en.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add lang/en.json
git commit -m "i18n: add effect-tray lock/rename/move-to-folder keys"
```

---

### Task B3: Reactive lock state + delete helper on `EffectTrayState`

**Files:**
- Modify: `src/sidebar/tray/EffectTrayState.svelte.js`

- [ ] **Step 1: Add imports**

At the top of `src/sidebar/tray/EffectTrayState.svelte.js`, add:

```javascript
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
```

- [ ] **Step 2: Add the reactive `isLocked` field**

Add this field alongside the other `$state` fields (e.g. after `folders`):

```javascript
   /** @type {boolean} Reactive mirror of the selected pack's locked state, so the UI reacts to it. */
   isLocked = $state(true);
```

- [ ] **Step 3: Set `isLocked` whenever the pack (re)loads**

In `refresh()`, inside the `if (!pack) { … }` guard set it to a safe default, and set the real value once the pack is resolved. Replace the early guard and add the mirror:

```javascript
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack) {
         this.effects = [];
         this.folders = [];
         this.isLocked = true;
         return;
      }

      this.isLocked = !!pack.locked;
```

(The existing `getDocuments()` / filter / folders logic below is unchanged.)

- [ ] **Step 4: Add `isOwner`, re-derive `canEdit`, add `toggleLock()`**

Replace the existing `canEdit` getter with these three members:

```javascript
   /**
    * Whether the current user owns the selected pack (a GM for world/module packs).
    * @returns {boolean} True when the user can manage the pack (lock, configure).
    */
   get isOwner() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      return !!pack && pack.getUserLevel(game.user) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
   }

   /**
    * Whether the selected pack is editable by the current user (owned and unlocked). Reads the
    * reactive `isLocked` mirror so CRUD affordances update when the lock is toggled.
    * @returns {boolean} True when CRUD actions should be enabled.
    */
   get canEdit() {
      return !this.isLocked && this.isOwner;
   }

   /**
    * Toggles the locked state of the selected pack. GM/owner only; persists via `pack.configure` and
    * updates the reactive `isLocked` mirror so the UI and `canEdit` react immediately.
    * @returns {Promise<void>}
    */
   async toggleLock() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack || !this.isOwner) {
         return;
      }

      await pack.configure({ locked: !pack.locked });
      this.isLocked = pack.locked;
   }
```

- [ ] **Step 5: Add `requestDeleteEffect()`**

Add this method (e.g. after `duplicateEffect`):

```javascript
   /**
    * Prompts for confirmation, then deletes the effect from its pack on confirm. No-ops when the
    * current user cannot edit the selected pack.
    * @param {ActiveEffect} effect - The effect to delete.
    * @returns {void}
    */
   requestDeleteEffect(effect) {
      if (!this.canEdit) {
         return;
      }

      /** @type {string} The localized Delete label, reused as title and confirm-button text. */
      const label = localize('effectTrayDelete');
      new ConfirmationDialog(
         label,
         [effect.name],
         localize('effectTrayConfirmDelete.desc'),
         label,
         () => effect.delete(),
      ).render(true);
   }
```

- [ ] **Step 6: Update the class JSDoc**

In the class-level doc comment's "Public interface" list, add `isLocked` to the `$state` fields, add `isOwner` to the getters, and add `toggleLock`, `requestDeleteEffect` to the methods.

- [ ] **Step 7: Lint and commit**

Run: `npm run eslint -- src/sidebar/tray/EffectTrayState.svelte.js`
Expected: no errors.

```bash
git add src/sidebar/tray/EffectTrayState.svelte.js
git commit -m "feat(effect-tray): reactive lock state, owner getter, delete helper"
```

---

### Task B4: Context-menu builder module (+ unit test)

**Files:**
- Create: `src/sidebar/tray/EffectRowContextMenu.js`
- Test: `tests/unit/EffectRowContextMenu.test.js`

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/EffectRowContextMenu.test.js`:

```javascript
import { beforeEach, describe, expect, it } from 'vitest';
import buildEffectRowContextMenu from '../../src/sidebar/tray/EffectRowContextMenu.js';

describe('buildEffectRowContextMenu', () => {
   beforeEach(() => {
      // localize() resolves `LOCAL.${key}.text`; mock i18n to echo the key for readable assertions.
      globalThis.game = { i18n: { localize: (key) => key } };
   });

   it('lists the seven entries in order with localized labels', () => {
      /** @type {object} A fake tray state: editable pack that supports folders. */
      const trayState = { canEdit: true, selectedPack: { folders: {} } };
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectRowContextMenu(trayState);
      expect(entries.map((entry) => entry.label)).toEqual([
         'LOCAL.effectTrayApply.text',
         'LOCAL.effectTrayOpen.text',
         'LOCAL.effectTrayRename.text',
         'LOCAL.effectTrayMoveToFolder.text',
         'LOCAL.effectTrayDuplicate.text',
         'LOCAL.effectTrayDelete.text',
      ]);
   });

   it('shows Apply and Open always, but gates edit actions behind canEdit', () => {
      /** @type {object} A fake tray state: not editable. */
      const trayState = { canEdit: false, selectedPack: { folders: {} } };
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectRowContextMenu(trayState);
      /** @type {(label: string) => boolean} Resolves an entry's visibility by label. */
      const visibleOf = (label) => entries.find((entry) => entry.label === label).visible();
      expect(visibleOf('LOCAL.effectTrayApply.text')).toBe(true);
      expect(visibleOf('LOCAL.effectTrayOpen.text')).toBe(true);
      expect(visibleOf('LOCAL.effectTrayRename.text')).toBe(false);
      expect(visibleOf('LOCAL.effectTrayDuplicate.text')).toBe(false);
      expect(visibleOf('LOCAL.effectTrayDelete.text')).toBe(false);
   });

   it('hides Move to Folder when the pack has no folder support', () => {
      /** @type {object} A fake tray state: editable but folderless pack. */
      const trayState = { canEdit: true, selectedPack: { folders: null } };
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectRowContextMenu(trayState);
      /** @type {object} The Move-to-Folder entry. */
      const move = entries.find((entry) => entry.label === 'LOCAL.effectTrayMoveToFolder.text');
      expect(move.visible()).toBe(false);
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- EffectRowContextMenu`
Expected: FAIL — cannot resolve `../../src/sidebar/tray/EffectRowContextMenu.js`.

- [ ] **Step 3: Write the module**

Create `src/sidebar/tray/EffectRowContextMenu.js`:

```javascript
import localize from '~/helpers/utility-functions/Localize.js';
import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
import MoveEffectToFolderDialog from '~/sidebar/tray/MoveEffectToFolderDialog.js';
import {
   DELETE_ICON,
   DUPLICATE_ICON,
   MOVE_TO_FOLDER_ICON,
   RENAME_ICON,
   SHEET_ICON,
   TARGET_ICON,
} from '~/system/Icons.js';

/**
 * Resolves the live ActiveEffect for a context-menu target row from its `data-effect-id`.
 * @param {HTMLElement} target - The row element the menu was opened on (carries `data-effect-id`).
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - The tray state.
 * @returns {object | undefined} The matching loaded effect, or undefined when not found.
 */
function resolveEffect(target, trayState) {
   /** @type {string | undefined} The effect id read off the row element. */
   const id = target?.closest('[data-effect-id]')?.dataset?.effectId;
   return id ? trayState.effects.find((effect) => effect.id === id) : void 0;
}

/**
 * Builds the right-click context-menu entries for an effect-tray row. Apply and Open Sheet are always
 * available; Rename, Move to Folder, Duplicate, and Delete require edit permission (Move also requires
 * a folder-capable pack). Entry shape matches TITAN's v14 directory hooks
 * (`{ label, icon, visible(target), onClick(event, target) }`).
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - The tray state read
 *    by the entries for permission gating and effect resolution.
 * @returns {object[]} The ContextMenuEntry array.
 */
export default function buildEffectRowContextMenu(trayState) {
   return [
      {
         label: localize('effectTrayApply'),
         icon: `<i class="${TARGET_ICON}"></i>`,
         visible: () => true,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               void applyEffectToTargets(effect);
            }
         },
      },
      {
         label: localize('effectTrayOpen'),
         icon: `<i class="${SHEET_ICON}"></i>`,
         visible: () => true,
         onClick: (event, target) => {
            resolveEffect(target, trayState)?.sheet?.render(true);
         },
      },
      {
         label: localize('effectTrayRename'),
         icon: `<i class="${RENAME_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            // Bridge to the row's inline-rename UX via a custom event it listens for.
            target?.closest('[data-effect-id]')
               ?.dispatchEvent(new CustomEvent('titan-effect-rename', { bubbles: false }));
         },
      },
      {
         label: localize('effectTrayMoveToFolder'),
         icon: `<i class="${MOVE_TO_FOLDER_ICON}"></i>`,
         visible: () => trayState.canEdit && !!trayState.selectedPack?.folders,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               new MoveEffectToFolderDialog(effect, trayState).render(true);
            }
         },
      },
      {
         label: localize('effectTrayDuplicate'),
         icon: `<i class="${DUPLICATE_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               void trayState.duplicateEffect(effect);
            }
         },
      },
      {
         label: localize('effectTrayDelete'),
         icon: `<i class="${DELETE_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               trayState.requestDeleteEffect(effect);
            }
         },
      },
   ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- EffectRowContextMenu`
Expected: PASS (all three cases).

- [ ] **Step 5: Lint and commit**

Run: `npm run eslint -- src/sidebar/tray/EffectRowContextMenu.js tests/unit/EffectRowContextMenu.test.js`
Expected: no errors.

```bash
git add src/sidebar/tray/EffectRowContextMenu.js tests/unit/EffectRowContextMenu.test.js
git commit -m "feat(effect-tray): context-menu entry builder + unit tests"
```

---

### Task B5: Move-to-Folder dialog

**Files:**
- Create: `src/sidebar/tray/MoveEffectToFolderDialog.js`
- Create: `src/sidebar/tray/MoveEffectToFolderDialogShell.svelte`

- [ ] **Step 1: Write the dialog class**

Create `src/sidebar/tray/MoveEffectToFolderDialog.js`:

```javascript
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import MoveEffectToFolderDialogShell from '~/sidebar/tray/MoveEffectToFolderDialogShell.svelte';

/**
 * @class MoveEffectToFolderDialog
 * @extends {TitanDialog}
 * A dialog that lets the user move a tray effect into one of the selected pack's folders, or back to
 * the pack root. Mounts a Svelte folder-picker and commits the choice through the tray state.
 */
export default class MoveEffectToFolderDialog extends TitanDialog {

   /**
    * Builds the folder-picker dialog for a single effect.
    * @param {object} effect - The effect to move.
    * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - The tray state
    *    providing the folder list and the move operation.
    */
   constructor(effect, trayState) {
      /** @type {{ value: string, label: string }[]} The folder options, root first then by name. */
      const folderOptions = [
         { value: '', label: localize('effectTrayRoot') },
         ...[...trayState.folders]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((folder) => ({ value: folder.id, label: folder.name })),
      ];

      super({
         title: localize('effectTrayMoveToFolder'),
         content: {
            class: MoveEffectToFolderDialogShell,
            props: {
               effectName: effect.name,
               folderOptions,
               initialValue: effect.folder?.id ?? '',
            },
         },
         id: 'titan-move-effect-to-folder-dialog',
      });

      /**
       * Commits the chosen folder (empty string means the pack root) through the tray state.
       * @param {string} folderId - The selected folder id, or '' for the pack root.
       * @returns {Promise<void>}
       */
      this.confirmationCallback = (folderId) =>
         trayState.moveEffectToFolder(effect, folderId === '' ? null : folderId);
   }
}
```

- [ ] **Step 2: Write the dialog shell**

Create `src/sidebar/tray/MoveEffectToFolderDialogShell.svelte`:

```svelte
<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * @typedef {object} MoveEffectToFolderDialogShellProps
    * @property {string} effectName - The name of the effect being moved.
    * @property {{ value: string, label: string }[]} folderOptions - The destination folder options.
    * @property {string} initialValue - The id of the effect's current folder, or '' for the root.
    */

   /** @type {MoveEffectToFolderDialogShellProps} */
   const { effectName, folderOptions, initialValue } = $props();

   /** @type {MoveEffectToFolderDialog} The Svelte component's owning application. */
   const application = getApplication();

   /** @type {string} The currently selected destination folder id ('' = pack root). */
   let selectedFolderId = $state(initialValue);

   /**
    * Commits the selected folder through the application callback, then closes the dialog.
    * @returns {void}
    */
   function onConfirmed() {
      void application.confirmationCallback(selectedFolderId);
      application.close();
   }
</script>

<div class="move-effect-dialog">
   <div class="header">
      {effectName}
   </div>

   <div class="section">
      {localize('effectTrayMoveToFolderPrompt')}
   </div>

   <div class="section">
      <Select
         options={folderOptions}
         testId="move-effect-folder-select"
         bind:value={selectedFolderId}
      />
   </div>

   <div class="button">
      <Button
         onclick={onConfirmed}
         testId="move-effect-confirm"
      >
         <Text text="effectTrayMoveToFolder"/>
      </Button>
   </div>

   <div class="button">
      <Button onclick={() => application.close()}>
         <Text text="cancel"/>
      </Button>
   </div>
</div>

<style lang="scss">
   .move-effect-dialog {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         width: 100%;
         font-weight: bold;
      }

      .section {
         @include flex-row;
         @include flex-group-center;
         @include padding-standard;

         width: 100%;
      }

      .button {
         @include flex-row;
         @include flex-group-center;
         @include margin-top-standard;

         width: 100%;
      }
   }
</style>
```

- [ ] **Step 3: Verify `Text` accepts a localization key**

Confirm `src/helpers/svelte-components/Text.svelte` localizes a bare key prop (used as `<Text text="cancel"/>` in `ConfirmationDialogShell.svelte`). If its prop name differs, match that component's usage. No code change expected.

- [ ] **Step 4: Lint and commit**

Run: `npm run eslint -- src/sidebar/tray/MoveEffectToFolderDialog.js` and `npm run stylelint -- src/sidebar/tray/MoveEffectToFolderDialogShell.svelte`
Expected: no errors.

```bash
git add src/sidebar/tray/MoveEffectToFolderDialog.js src/sidebar/tray/MoveEffectToFolderDialogShell.svelte
git commit -m "feat(effect-tray): move-to-folder picker dialog"
```

---

### Task B6: Attach the context menu in `EffectTray.svelte`

**Files:**
- Modify: `src/sidebar/tray/EffectTray.svelte`

- [ ] **Step 1: Import the builder**

Add to the `<script>` imports:

```javascript
   import buildEffectRowContextMenu from '~/sidebar/tray/EffectRowContextMenu.js';
```

- [ ] **Step 2: Add the context-menu Svelte action**

Add this function in the `<script>` block (after `onDrop`):

```javascript
   /**
    * Svelte action attaching a Foundry ContextMenu to the tray root, targeting effect rows by their
    * `data-effect-id`. Entries read the live tray state for permission gating and effect resolution.
    * Torn down with the component.
    * @param {HTMLElement} node - The tray root element the menu delegates from.
    * @returns {{ destroy: () => void }} The action lifecycle handle.
    */
   function effectContextMenu(node) {
      /** @type {object} The Foundry context menu bound to the tray's effect rows. */
      const menu = new foundry.applications.ux.ContextMenu(
         node,
         '[data-effect-id]',
         buildEffectRowContextMenu(trayState),
         { jQuery: false, fixed: true },
      );

      return {
         destroy() {
            menu.close?.({ animate: false });
         },
      };
   }
```

- [ ] **Step 3: Apply the action to the tray root**

Add `use:effectContextMenu` to the root `div.titan-effect-tray` (alongside its existing `ondragover`/`ondrop`):

```svelte
<div
   class="titan-effect-tray"
   data-testid="effect-tray"
   ondragover={onDragOver}
   ondrop={onDrop}
   role="region"
   use:effectContextMenu
>
```

- [ ] **Step 4: Lint and commit**

Run: `npm run eslint -- src/sidebar/tray/EffectTray.svelte`
Expected: no errors.

```bash
git add src/sidebar/tray/EffectTray.svelte
git commit -m "feat(effect-tray): attach row context menu to the tray root"
```

---

### Task B7: Row — left-click opens sheet, keep only Apply, rename bridge

**Files:**
- Modify: `src/sidebar/tray/EffectTrayRow.svelte`

- [ ] **Step 1: Update imports**

Replace the icon import line with one that drops the now-unused `SHEET_ICON`/`DELETE_ICON`/`DUPLICATE_ICON` (kept references move to the context menu) and adds `TARGET_ICON`. The row now imports only what it still uses:

```javascript
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
   import focusOnMount from '~/helpers/svelte-actions/FocusOnMount.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { TARGET_ICON } from '~/system/Icons.js';
```

(Remove the `ConfirmationDialog` import and the `DELETE_ICON, DUPLICATE_ICON, SHEET_ICON` import — delete moved to `EffectTrayState.requestDeleteEffect`.)

- [ ] **Step 2: Remove the now-unused labels and `requestDelete`**

Delete the `openLabel`, `duplicateLabel`, `deleteLabel` consts and the entire `requestDelete()` function. Keep `applyLabel`. The rename-related state (`isRenaming`, `renameValue`, `isCancellingRename`) and functions (`beginRename`, `commitRename`, `onRenameKeydown`, `onNameKeydown`, `onDragStart`) stay.

- [ ] **Step 3: Add the debounced left-click open and the rename-event bridge**

Add this state and these functions in the `<script>` block:

```javascript
   /** @type {ReturnType<typeof setTimeout> | null} Pending single-click timer, cancelled by a dblclick. */
   let openTimer = null;

   /**
    * Opens the effect's sheet on a single left-click of the row. Debounced so a double-click (which
    * starts an inline rename) does not also open the sheet. No-ops while renaming.
    * @returns {void}
    */
   function onRowClick() {
      if (isRenaming) {
         return;
      }

      if (openTimer) {
         clearTimeout(openTimer);
      }

      openTimer = setTimeout(() => {
         openTimer = null;
         effect.sheet.render(true);
      }, 200);
   }
```

Then make `beginRename()` cancel any pending open by adding, at its top (before the `canEdit` guard):

```javascript
      if (openTimer) {
         clearTimeout(openTimer);
         openTimer = null;
      }
```

- [ ] **Step 4: Bridge the context-menu Rename event to inline rename**

Add a Svelte action that listens for the `titan-effect-rename` custom event dispatched by the context menu, and apply it to the row root. Add this function:

```javascript
   /**
    * Svelte action: begins inline rename when the row receives the `titan-effect-rename` event the
    * context menu dispatches. Lets the right-click "Rename" entry drive the existing inline-rename UX.
    * @param {HTMLElement} node - The row root element.
    * @returns {{ destroy: () => void }} The action lifecycle handle.
    */
   function renameOnEvent(node) {
      /**
       * @returns {void}
       */
      const handler = () => beginRename();
      node.addEventListener('titan-effect-rename', handler);
      return {
         destroy() {
            node.removeEventListener('titan-effect-rename', handler);
         },
      };
   }
```

- [ ] **Step 5: Update the row markup**

Change the root `div.effect-tray-row` to add the click handler and the rename action:

```svelte
<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
   draggable={true}
   onclick={onRowClick}
   ondragstart={onDragStart}
   role="listitem"
   use:renameOnEvent
>
```

- [ ] **Step 6: Replace the controls block**

Replace the entire `<div class="effect-tray-row-controls">…</div>` block with one that keeps **only** Apply (now using `TARGET_ICON` and stopping propagation so it does not also open the sheet):

```svelte
   <div class="effect-tray-row-controls">
      <!--Apply to Target button (stops propagation so applying does not also open the sheet)-->
      <IconButton
         icon={TARGET_ICON}
         label={applyLabel}
         onclick={(event) => {
            event.stopPropagation();
            applyEffectToTargets(effect);
         }}
         testId="effect-tray-apply"
         tooltip={applyLabel}
      />
   </div>
```

- [ ] **Step 7: Stop clicks inside the rename input from opening the sheet**

The `onRowClick` `isRenaming` guard already prevents this, but make the rename input robust by adding `onclick` propagation-stop to it:

```svelte
      <input
         class="effect-tray-row-rename"
         data-testid="effect-tray-rename"
         type="text"
         use:focusOnMount
         onblur={() => void commitRename()}
         onclick={(event) => event.stopPropagation()}
         onkeydown={onRenameKeydown}
         bind:value={renameValue}
      />
```

- [ ] **Step 8: Lint and commit**

Run: `npm run eslint -- src/sidebar/tray/EffectTrayRow.svelte`
Expected: no errors (no unused imports).

```bash
git add src/sidebar/tray/EffectTrayRow.svelte
git commit -m "feat(effect-tray): left-click opens sheet; keep only Apply inline; rename bridge"
```

---

### Task B8: Header — actor-sheet-style filter bar + lock toggle

**Files:**
- Modify: `src/sidebar/tray/EffectTrayHeader.svelte`

- [ ] **Step 1: Update imports**

Replace the `<script>` imports with:

```javascript
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { CREATE_ICON, FOLDER_ICON, LOCK_ICON, UNLOCK_ICON } from '~/system/Icons.js';
```

- [ ] **Step 2: Add lock label derivations**

Alongside the existing `newLabel` / `newFolderLabel` / `supportsFolders` consts, add:

```javascript
   /** @type {string} The localized label for the lock/unlock toggle, reflecting current state. */
   const lockLabel = $derived(trayState.isLocked ? localize('effectTrayUnlock') : localize('effectTrayLock'));
```

- [ ] **Step 3: Replace the markup**

Replace the whole `<div class="effect-tray-header">…</div>` block with this actor-sheet-style header (pack select + buttons + lock on one row; a labelled Filter row using the shared `TextInput`):

```svelte
<div class="effect-tray-header">
   <div class="effect-tray-header-row">
      <Select
         disabled={packOptions.length === 0}
         onchange={() => trayState.selectPack(trayState.selectedPackId)}
         options={packOptions}
         testId="effect-tray-pack-select"
         bind:value={trayState.selectedPackId}
      />

      <!--New Effect / New Folder / Lock toggle buttons-->
      <div class="effect-tray-header-new">
         <IconButton
            disabled={!trayState.canEdit}
            icon={CREATE_ICON}
            label={newLabel}
            onclick={() => trayState.createBlankEffect()}
            testId="effect-tray-new"
            tooltip={newLabel}
         />

         {#if supportsFolders}
            <IconButton
               disabled={!trayState.canEdit}
               icon={FOLDER_ICON}
               label={newFolderLabel}
               onclick={() => trayState.createFolder()}
               testId="effect-tray-new-folder"
               tooltip={newFolderLabel}
            />
         {/if}

         {#if trayState.isOwner}
            <IconButton
               icon={trayState.isLocked ? LOCK_ICON : UNLOCK_ICON}
               label={lockLabel}
               onclick={() => trayState.toggleLock()}
               testId="effect-tray-lock"
               tooltip={lockLabel}
            />
         {/if}
      </div>
   </div>

   <!--Filter row (mirrors the actor-sheet tab header)-->
   <div class="effect-tray-filter-row">
      <div class="label">
         {localize('filter')}
      </div>
      <div class="input">
         <TextInput
            testId="effect-tray-search"
            bind:value={trayState.filter}
         />
      </div>
   </div>
</div>
```

- [ ] **Step 4: Replace the styles**

Replace the `<style lang="scss">` block with one adding the filter row (keeping the header layout):

```scss
<style lang="scss">
   .effect-tray-header {
      @include flex-column;
      @include flex-group-top;
      @include padding-standard;

      width: 100%;

      .effect-tray-header-row {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         .effect-tray-header-new {
            @include margin-left-standard;
         }
      }

      .effect-tray-filter-row {
         @include flex-row;
         @include flex-group-center;
         @include margin-top-standard;

         width: 100%;

         .label {
            font-weight: bold;

            @include margin-right-standard;
         }

         .input {
            @include flex-group-left;

            flex: 1;
         }
      }
   }
</style>
```

- [ ] **Step 5: Lint and commit**

Run: `npm run eslint -- src/sidebar/tray/EffectTrayHeader.svelte` and `npm run stylelint -- src/sidebar/tray/EffectTrayHeader.svelte`
Expected: no errors.

```bash
git add src/sidebar/tray/EffectTrayHeader.svelte
git commit -m "feat(effect-tray): actor-sheet-style filter bar + GM lock toggle"
```

---

### Task B9: E2E coverage for the new tray behaviors

**Files:**
- Modify: `tests/e2e/effect-tray.spec.js`

- [ ] **Step 1: Add the tests**

Append these tests inside the existing `test.describe('effect tray sidebar tab', …)` block (they reuse the `beforeEach` that seeds `world.e2e-tray-effects`). They assume the login user is a GM (owner of world packs).

```javascript
   test('left-clicking a row opens the effect sheet', async ({ page }) => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => { setTimeout(resolve, 300); });
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => { setTimeout(resolve, 400); });
      });

      // Click the row icon (not the Apply button) and wait past the 200ms open debounce.
      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .locator('.effect-tray-row-icon')
         .first()
         .click();
      await page.waitForTimeout(400);

      const opened = await page.evaluate(() =>
         Object.values(ui.windows).some((app) => app?.document?.name === 'E2E Tray Effect'));
      expect(opened, 'left-clicking the row must open the effect sheet').toBe(true);

      await page.evaluate(() => {
         for (const app of Object.values(ui.windows)) {
            if (app?.document?.name === 'E2E Tray Effect') { app.close(); }
         }
      });
   });

   test('right-click context menu opens the effect sheet', async ({ page }) => {
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => { setTimeout(resolve, 300); });
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => { setTimeout(resolve, 400); });
      });

      await page.locator('[data-testid="effect-tray-row"]', { hasText: 'E2E Tray Effect' })
         .first()
         .click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();

      // Click the "Open Sheet" entry by its localized label.
      const openLabel = await page.evaluate(() => game.i18n.localize('LOCAL.effectTrayOpen.text'));
      await page.locator('#context-menu li.context-item', { hasText: openLabel }).first().click();
      await page.waitForTimeout(400);

      const opened = await page.evaluate(() =>
         Object.values(ui.windows).some((app) => app?.document?.name === 'E2E Tray Effect'));
      expect(opened, 'the context-menu Open Sheet entry must open the effect sheet').toBe(true);

      await page.evaluate(() => {
         for (const app of Object.values(ui.windows)) {
            if (app?.document?.name === 'E2E Tray Effect') { app.close(); }
         }
      });
   });

   test('GM lock toggle flips the pack locked state', async ({ page }) => {
      // Ensure the world pack starts unlocked, then render + select it.
      await page.evaluate(async () => {
         const pack = game.packs.get('world.e2e-tray-effects');
         if (pack.locked) { await pack.configure({ locked: false }); }
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => { setTimeout(resolve, 300); });
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await new Promise((resolve) => { setTimeout(resolve, 400); });
      });

      // The lock button is visible to the GM owner; clicking it locks the pack.
      await page.locator('[data-testid="effect-tray-lock"]').first().click();
      await page.waitForTimeout(400);

      const locked = await page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked);
      expect(locked, 'clicking the lock toggle must lock the pack').toBe(true);

      // Toggling again unlocks it, restoring the shared pack for other tests.
      await page.locator('[data-testid="effect-tray-lock"]').first().click();
      await page.waitForTimeout(400);
      const unlocked = await page.evaluate(() => game.packs.get('world.e2e-tray-effects').locked);
      expect(unlocked, 'clicking the lock toggle again must unlock the pack').toBe(false);
   });
```

- [ ] **Step 2: Build and run the tray e2e (world must be running)**

Run: `npm run build:e2e && npm run test:e2e -- effect-tray`
Expected: all tray tests PASS (existing + 3 new).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/effect-tray.spec.js
git commit -m "test(effect-tray): left-click open, context menu, lock toggle e2e"
```

---

### Task B10: Full verification + docs

**Files:**
- Modify: `.claude/skills/titan-codebase/references/architecture.md` (and/or `abstractions.md`)
- Modify: `docs/TODO.md`

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: PASS, including the two new unit specs. Note the new total count.

- [ ] **Step 2: Run the whole e2e suite (world running)**

Run: `npm run build:e2e && npm run test:e2e`
Expected: PASS, including `localization.spec.js` and the new tray tests. Note the new total count.

- [ ] **Step 3: Update the titan-codebase skill**

In `.claude/skills/titan-codebase/references/architecture.md` (sidebar section) record: the effect tray now attaches a Foundry `ContextMenu` (built in `EffectRowContextMenu.js`) to its root for row actions; rows open their sheet on left-click (debounced vs. dblclick rename) and keep only Apply inline; `EffectTrayState` carries reactive `isLocked` + `isOwner` + `toggleLock()` and `requestDeleteEffect()`; the header has an actor-sheet-style filter bar and a GM-only lock toggle. Add `MoveEffectToFolderDialog` to the dialog list if dialogs are catalogued.

- [ ] **Step 4: Update TODO**

In `docs/TODO.md`, mark the localization-test and effect-tray context-menu/filter/lock items complete (add them as completed if not already listed).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/titan-codebase docs/TODO.md
git commit -m "docs(effect-tray): update codebase skill + TODO for context menu/lock/i18n test"
```

---

## Self-Review notes (author)

- **Spec coverage:** §2 → Tasks A1 (static audit), A2 (DOM+tippy scan, all surfaces incl. tray + context menu). §3.1 → B7 (left-click open, Apply-only, rename bridge). §3.2 → B4 (builder) + B6 (attach). §3.3 → B3 (`requestDeleteEffect`). §3.4 → B8 (filter bar). §3.5 → B3 (`isLocked`/`isOwner`/`toggleLock`) + B8 (toggle button). §3.6 → B1 (icons) + B2 (keys). §4 testing → A1/A2/B4/B9/B10. All covered.
- **Type consistency:** `buildEffectRowContextMenu(trayState)`, `resolveEffect(target, trayState)`, `trayState.requestDeleteEffect(effect)`, `trayState.toggleLock()`, `trayState.isOwner`, `trayState.isLocked`, `trayState.moveEffectToFolder(effect, folderId|null)`, custom event `titan-effect-rename`, testids `effect-tray-lock` / `effect-tray-apply` — used consistently across tasks.
- **Open risk to verify during execution:** (1) `MoveEffectToFolderDialogShell` uses `<Text text="cancel"/>` exactly as `ConfirmationDialogShell` does — confirm the `Text` prop name. (2) `ContextMenu` import path is `foundry.applications.ux.ContextMenu` (global namespace, confirmed in v14 source). (3) The login user is a GM so `isOwner` is true for world packs (matches existing tray tests).
