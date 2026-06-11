# Drag-drop Reorder + Cross-Sheet Element Copy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the faint drag-hover tint with an insertion-line + grip-handle treatment, add drag-to-reorder for the four item-settings lists and the character-sheet effect list, and allow copying rules elements / checks / attacks / custom aspects between matching sheets.

**Architecture:** A pair of shared Svelte actions (`draggableRow` / `reorderDropZone`) plus a `DragHandle.svelte` and `InsertionLine.svelte` own all drag visuals and pointer math. An in-memory `activeDrag` descriptor (set on dragstart, read on dragover) lets the drop zone gate by kind and tell reorder from foreign-copy without reading the un-readable `dataTransfer` payload mid-drag. Plain-array element kinds get per-kind `moveX`/`insertX` data mutators mirroring the existing `addX`/`deleteX`; items and effects reorder through Foundry's `sort` field via `performIntegerSort`.

**Tech Stack:** Foundry VTT v14 (ApplicationV2), pure Svelte 5 runes, Vitest (unit), Playwright (e2e), SCSS.

**Spec:** `docs/superpowers/specs/2026-06-11-drag-reorder-and-cross-sheet-copy-design.md`

## Buddy-check directives

A pre-build buddy-check was offered (risks: cross-document copy/insert mutation, native-drop vs
Foundry `DragDrop` coexistence) and **declined** by the user. Proceed without one; the verify-live
points listed in the self-review notes cover the main risks.

---

## File map

**Create**
- `src/helpers/utility-functions/MoveArrayEntry.js` — pure array move helper.
- `src/helpers/utility-functions/CloneElementWithNewUuid.js` — clone an element bag with a fresh uuid.
- `src/helpers/svelte-components/drag-reorder/DragHandle.svelte` — the ⋮⋮ grip affordance.
- `src/helpers/svelte-components/drag-reorder/InsertionLine.svelte` — the glowing drop boundary bar.
- `src/helpers/svelte-components/drag-reorder/DragReorderActions.js` — `draggableRow` / `reorderDropZone` actions.
- `tests/unit/MoveArrayEntry.test.js`, `tests/unit/CloneElementWithNewUuid.test.js`
- `tests/e2e/settings-list-reorder.spec.js`, `tests/e2e/cross-sheet-element-copy.spec.js`, `tests/e2e/character-sheet-reorder.spec.js`

**Modify**
- `src/system/Icons.js` — add `DRAG_HANDLE_ICON`.
- `src/document/types/item/rules-element/RulesElementMixin.js` — `moveRulesElement` / `insertRulesElement`.
- `src/document/types/item/TitanItem.js` — `moveCheck` / `insertCheck`.
- `src/document/types/item/sheet/TitanItemSheetState.js` — `postMoveCheck` / `postInsertCheck`.
- `src/document/types/item/sheet/RulesElementItemSheetState.js` — expose the two new methods.
- `src/document/types/item/sheet/TitanItemSheet.js` — `postMoveCheck` / `postInsertCheck` sheet hooks.
- `src/document/types/item/types/weapon/WeaponDataModel.js` — `moveAttack` / `insertAttack`.
- `src/document/types/item/types/spell/SpellDataModel.js` — `moveCustomAspect` / `insertCustomAspect`.
- The four settings tabs + their row components (grip + actions).
- `src/document/types/actor/types/character/sheet/items/CharacterSheetItemList.svelte`,
  `CharacterSheetMultiItemList.svelte`, `.../effect/CharacterSheetEffectList.svelte`.
- `.claude/skills/titan-codebase/references/*.md`, `docs/TODO.md`.

---

## Task 1: Pure array-move helper

**Files:**
- Create: `src/helpers/utility-functions/MoveArrayEntry.js`
- Test: `tests/unit/MoveArrayEntry.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';

describe('moveArrayEntry', () => {
   it('moves an entry forward using insertion-point semantics (toIdx = slot before move)', () => {
      // 'a' moved to insertion point 3 lands before original index 3 ('d').
      expect(moveArrayEntry(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'a', 'd']);
   });

   it('moves an entry backward', () => {
      expect(moveArrayEntry(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd']);
   });

   it('treats toIdx at array length as "append"', () => {
      expect(moveArrayEntry(['a', 'b', 'c'], 0, 3)).toEqual(['b', 'c', 'a']);
   });

   it('is a no-op when the entry is dropped onto its own boundary', () => {
      expect(moveArrayEntry(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
      expect(moveArrayEntry(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'b', 'c']);
   });

   it('does not mutate the input array', () => {
      const input = ['a', 'b', 'c'];
      moveArrayEntry(input, 0, 2);
      expect(input).toEqual(['a', 'b', 'c']);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/MoveArrayEntry.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
/**
 * Moves an entry within an array using insertion-point semantics: `toIdx` is the slot in the
 * ORIGINAL array's frame that the entry should come to sit before (so a drop line drawn before
 * row N maps to `toIdx === N`, and `toIdx === array.length` appends). Returns a new array; the
 * input is not mutated.
 * @param {Array<*>} array - The source array.
 * @param {number} fromIdx - The current index of the entry to move.
 * @param {number} toIdx - The insertion point in the original array frame.
 * @returns {Array<*>} A new array with the entry repositioned.
 */
export default function moveArrayEntry(array, fromIdx, toIdx) {
   /** @type {Array<*>} A shallow working copy so the input array is left untouched. */
   const result = array.slice();

   /** @type {Array<*>} The single removed entry, captured for re-insertion. */
   const [moved] = result.splice(fromIdx, 1);

   /** @type {number} Removing an earlier entry shifts later insertion points left by one. */
   const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
   result.splice(insertAt, 0, moved);

   return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/MoveArrayEntry.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/utility-functions/MoveArrayEntry.js tests/unit/MoveArrayEntry.test.js
git commit -m "feat: add moveArrayEntry insertion-point helper"
```

---

## Task 2: Clone-with-new-uuid helper

**Files:**
- Create: `src/helpers/utility-functions/CloneElementWithNewUuid.js`
- Test: `tests/unit/CloneElementWithNewUuid.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';

describe('cloneElementWithNewUuid', () => {
   it('returns a deep copy whose uuid differs from the source', () => {
      const source = { operation: 'flatModifier', value: 3, uuid: 'original-uuid' };
      const clone = cloneElementWithNewUuid(source);

      expect(clone.operation).toBe('flatModifier');
      expect(clone.value).toBe(3);
      expect(clone.uuid).not.toBe('original-uuid');
      expect(typeof clone.uuid).toBe('string');
      expect(clone.uuid.length).toBeGreaterThan(0);
   });

   it('does not mutate or alias the source (deep copy)', () => {
      const source = { nested: { list: [1, 2] }, uuid: 'a' };
      const clone = cloneElementWithNewUuid(source);
      clone.nested.list.push(3);

      expect(source.nested.list).toEqual([1, 2]);
      expect(source.uuid).toBe('a');
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/CloneElementWithNewUuid.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Deep-clones a plain element bag (rules element, check, attack, or custom aspect) and stamps a
 * fresh uuid, so a copied element is independent of its source and keeps the per-element identity
 * the sheet lists key on.
 * @param {object} element - The element to copy. Must be structured-clone-safe (plain data).
 * @returns {object} The independent copy with a new uuid.
 */
export default function cloneElementWithNewUuid(element) {
   return {
      ...structuredClone(element),
      uuid: generateUUID(),
   };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/CloneElementWithNewUuid.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/utility-functions/CloneElementWithNewUuid.js tests/unit/CloneElementWithNewUuid.test.js
git commit -m "feat: add cloneElementWithNewUuid helper"
```

---

## Task 3: Drag-handle icon + DragHandle / InsertionLine components

**Files:**
- Modify: `src/system/Icons.js`
- Create: `src/helpers/svelte-components/drag-reorder/DragHandle.svelte`
- Create: `src/helpers/svelte-components/drag-reorder/InsertionLine.svelte`

- [ ] **Step 1: Add the icon constant**

In `src/system/Icons.js`, add alongside the existing icon exports (match the file's existing export style):

```javascript
/** @type {string} Font Awesome class for the drag-to-reorder grip handle. */
export const DRAG_HANDLE_ICON = 'fa-solid fa-grip-vertical';
```

- [ ] **Step 2: Write `DragHandle.svelte`**

```svelte
<script>
   import { DRAG_HANDLE_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} DragHandleProps
    * @property {string} [label] - Accessible title for the handle.
    */

   /** @type {DragHandleProps} */
   const { label = localize('dragToReorder') } = $props();
</script>

<!--Drag handle: marks the row draggable; the draggableRow action only grabs when the press starts here.-->
<span
   class="drag-handle"
   data-drag-handle
   title={label}
   aria-label={label}
>
   <i class={DRAG_HANDLE_ICON}></i>
</span>

<style lang="scss">
   .drag-handle {
      @include flex-row;
      @include flex-group-center;

      cursor: grab;
      color: var(--titan-text-color-faint, #6b6a78);
      padding: 0 0.25rem;
      transition: color 0.1s ease;

      &:hover {
         color: var(--titan-text-color);
      }

      &:active {
         cursor: grabbing;
      }
   }
</style>
```

- [ ] **Step 3: Write `InsertionLine.svelte`**

```svelte
<!--The glowing accent bar marking where a dragged row will land.-->
<div class="insertion-line" aria-hidden="true"></div>

<style lang="scss">
   .insertion-line {
      position: relative;
      width: 100%;
      height: 0;

      &::before {
         content: '';

         position: absolute;
         left: 0;
         right: 0;
         top: -2px;

         height: 3px;
         border-radius: 2px;
         background: var(--titan-accent-color, #c9a14a);
         box-shadow: 0 0 6px 1px var(--titan-accent-color, #c9a14a);
      }
   }
</style>
```

- [ ] **Step 4: Add the localization key**

In the language file (find with `grep -rl '"addRulesElement"' lang/`), add a `dragToReorder` entry near the other UI strings, e.g. `"dragToReorder": "Drag to reorder"`. Confirm the key path matches how `localize('addRulesElement')` resolves in this project (bare key vs `LOCAL.*`).

- [ ] **Step 5: Build to verify components compile**

Run: `npm run build`
Expected: build completes with no Svelte compile error for the two new components.

- [ ] **Step 6: Commit**

```bash
git add src/system/Icons.js src/helpers/svelte-components/drag-reorder/ lang/
git commit -m "feat: add DragHandle and InsertionLine components"
```

---

## Task 4: Drag/reorder Svelte actions

**Files:**
- Create: `src/helpers/svelte-components/drag-reorder/DragReorderActions.js`

- [ ] **Step 1: Write the actions module**

```javascript
/**
 * Shared Svelte actions for grip-handle drag-to-reorder lists.
 *
 * `dataTransfer` payloads are not readable during `dragover`, so an in-memory `activeDrag`
 * descriptor (set by `draggableRow` on `dragstart`, cleared on `dragend`) lets `reorderDropZone`
 * gate by kind and distinguish a same-list reorder from a foreign-sheet copy synchronously.
 */

/**
 * @typedef {object} ActiveDrag
 * @property {string} kind - The element kind being dragged ('rulesElement', 'check', 'attack',
 * 'customAspect', 'item', or 'effect').
 * @property {string} sourceKey - Identity of the originating list (document uuid + ':' + kind).
 * @property {number} index - The source index within the originating list.
 */

/** @type {ActiveDrag | null} The drag in progress, shared between source and drop zone. */
let activeDrag = null;

/**
 * Makes a list row draggable, but only when the press begins on the row's `[data-drag-handle]`.
 * @param {HTMLElement} node - The row element (e.g. an `<li>`).
 * @param {object} params - Action parameters.
 * @param {string} params.kind - The element kind for this row.
 * @param {string} params.sourceKey - Identity of this row's list (document uuid + ':' + kind).
 * @param {number} params.index - This row's index within its list.
 * @param {() => string} params.getDataTransfer - Returns the string written to `dataTransfer`
 * `text/plain` on dragstart (a titanElementDrag JSON payload, or a Foundry toDragData JSON string).
 * @param {() => void} [params.onDragStart] - Called after a drag begins.
 * @param {() => void} [params.onDragEnd] - Called when the drag ends.
 * @returns {{ update: (p: object) => void, destroy: () => void }} The Svelte action lifecycle.
 */
export function draggableRow(node, params) {
   /** @type {object} The latest action parameters. */
   let current = params;
   /** @type {boolean} Whether the current press started on this row's drag handle. */
   let armed = false;

   /**
    * Arms dragging only when the press begins on the drag handle, so text selection inside row
    * inputs is never hijacked by a drag.
    * @param {PointerEvent} event - The pointerdown event.
    */
   function onPointerDown(event) {
      armed = !!(event.target instanceof Element && event.target.closest('[data-drag-handle]'));
      node.draggable = armed;
   }

   /** Disarms dragging when the press is released without a drag starting. */
   function onPointerUp() {
      armed = false;
      node.draggable = false;
   }

   /**
    * Publishes the active-drag descriptor and writes the drag payload.
    * @param {DragEvent} event - The dragstart event.
    */
   function onDragStart(event) {
      if (!armed) {
         event.preventDefault();
         return;
      }
      activeDrag = {
         kind: current.kind,
         sourceKey: current.sourceKey,
         index: current.index,
      };
      event.dataTransfer.effectAllowed = 'copyMove';
      event.dataTransfer.setData('text/plain', current.getDataTransfer());
      current.onDragStart?.();
   }

   /** Clears drag state. */
   function onDragEnd() {
      activeDrag = null;
      armed = false;
      node.draggable = false;
      current.onDragEnd?.();
   }

   node.addEventListener('pointerdown', onPointerDown);
   node.addEventListener('pointerup', onPointerUp);
   node.addEventListener('dragstart', onDragStart);
   node.addEventListener('dragend', onDragEnd);

   return {
      update(next) {
         current = next;
      },
      destroy() {
         node.removeEventListener('pointerdown', onPointerDown);
         node.removeEventListener('pointerup', onPointerUp);
         node.removeEventListener('dragstart', onDragStart);
         node.removeEventListener('dragend', onDragEnd);
      },
   };
}

/**
 * Turns a list container into a reorder/copy drop zone. Computes the insertion index from the
 * pointer position over its row children and reports it for the insertion-line render.
 * @param {HTMLElement} node - The list container (e.g. an `<ol>`).
 * @param {object} params - Action parameters.
 * @param {string} params.kind - The kind this zone accepts.
 * @param {string} params.sourceKey - Identity of this zone's own list (document uuid + ':' + kind).
 * @param {string} params.rowSelector - CSS selector matching draggable row children.
 * @param {(index: number | null) => void} params.onIndicator - Reports the live insertion index
 * (or null when the pointer leaves), for the insertion-line render.
 * @param {(fromIdx: number, toIdx: number) => void} params.onReorder - Commits a same-list reorder.
 * @param {(payload: object, atIdx: number) => void} params.onForeignDrop - Commits a foreign copy.
 * @returns {{ update: (p: object) => void, destroy: () => void }} The Svelte action lifecycle.
 */
export function reorderDropZone(node, params) {
   /** @type {object} The latest action parameters. */
   let current = params;

   /**
    * Computes the insertion index by comparing the pointer Y against each row's vertical midpoint.
    * @param {number} clientY - The pointer's viewport Y coordinate.
    * @returns {number} The insertion index in the list frame (0..rowCount).
    */
   function computeIndex(clientY) {
      /** @type {HTMLElement[]} The current row elements. */
      const rows = Array.from(node.querySelectorAll(current.rowSelector));
      for (let i = 0; i < rows.length; i += 1) {
         const rect = rows[i].getBoundingClientRect();
         if (clientY < rect.top + rect.height / 2) {
            return i;
         }
      }
      return rows.length;
   }

   /**
    * Allows the drop and updates the insertion indicator when a compatible drag is overhead.
    * @param {DragEvent} event - The dragover event.
    */
   function onDragOver(event) {
      if (!activeDrag || activeDrag.kind !== current.kind) {
         return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = activeDrag.sourceKey === current.sourceKey ? 'move' : 'copy';
      current.onIndicator(computeIndex(event.clientY));
   }

   /** Hides the indicator when the pointer leaves the zone entirely. */
   function onDragLeave(event) {
      if (!node.contains(event.relatedTarget)) {
         current.onIndicator(null);
      }
   }

   /**
    * Commits the drop: a same-list reorder, or a foreign copy parsed from the payload.
    * @param {DragEvent} event - The drop event.
    */
   function onDrop(event) {
      if (!activeDrag || activeDrag.kind !== current.kind) {
         return;
      }
      event.preventDefault();
      event.stopPropagation();
      const toIdx = computeIndex(event.clientY);
      if (activeDrag.sourceKey === current.sourceKey) {
         current.onReorder(activeDrag.index, toIdx);
      } else {
         /** @type {object} The full drag payload, readable only now (on drop). */
         const payload = JSON.parse(event.dataTransfer.getData('text/plain'));
         current.onForeignDrop(payload, toIdx);
      }
      current.onIndicator(null);
   }

   node.addEventListener('dragover', onDragOver);
   node.addEventListener('dragleave', onDragLeave);
   node.addEventListener('drop', onDrop);

   return {
      update(next) {
         current = next;
      },
      destroy() {
         node.removeEventListener('dragover', onDragOver);
         node.removeEventListener('dragleave', onDragLeave);
         node.removeEventListener('drop', onDrop);
      },
   };
}
```

- [ ] **Step 2: Build to verify it compiles and is importable**

Run: `npm run build`
Expected: build completes, no module/resolve errors.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/svelte-components/drag-reorder/DragReorderActions.js
git commit -m "feat: add draggableRow and reorderDropZone actions"
```

---

## Task 5: `moveRulesElement` / `insertRulesElement`

**Files:**
- Modify: `src/document/types/item/rules-element/RulesElementMixin.js`

- [ ] **Step 1: Add the two mutators after `deleteRulesElement`**

```javascript
      /**
       * Reorders a Rules Element within this document's array.
       * @param {number} fromIdx - The current index of the element.
       * @param {number} toIdx - The insertion point (original-frame index) to move it before.
       * @returns {Promise<void>}
       */
      async moveRulesElement(fromIdx, toIdx) {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            await this.parent.update({
               system: {
                  rulesElement: moveArrayEntry(this.rulesElement, fromIdx, toIdx),
               },
            });
         }
      }

      /**
       * Inserts a copy of a Rules Element (from this or another item) at a position, with a fresh uuid.
       * @param {object} element - The element data to copy in.
       * @param {number} atIdx - The insertion point in the array.
       * @returns {Promise<void>}
       */
      async insertRulesElement(element, atIdx) {
         if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
            /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
            const next = this.rulesElement.slice();
            next.splice(atIdx, 0, cloneElementWithNewUuid(element));
            await this.parent.update({
               system: {
                  rulesElement: next,
               },
            });
         }
      }
```

- [ ] **Step 2: Add the imports at the top of the file**

```javascript
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build completes.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/rules-element/RulesElementMixin.js
git commit -m "feat: add moveRulesElement and insertRulesElement mutators"
```

---

## Task 6: `moveCheck` / `insertCheck` + check expansion lockstep

**Files:**
- Modify: `src/document/types/item/TitanItem.js`
- Modify: `src/document/types/item/sheet/TitanItemSheetState.js`
- Modify: `src/document/types/item/sheet/RulesElementItemSheetState.js`
- Modify: `src/document/types/item/sheet/TitanItemSheet.js`

- [ ] **Step 1: Add sheet-state lockstep methods in `TitanItemSheetState.js`**

After `preDeleteCheck`, add:

```javascript
   /**
    * Reorders the per-check expansion arrays in lockstep with a check reorder so expansion state
    * tracks the moved row.
    * @param {number} fromIdx - The check's current index.
    * @param {number} toIdx - The insertion point to move it before.
    */
   function postMoveCheck(fromIdx, toIdx) {
      update((data) => {
         data.tabs.checks.isExpanded = moveArrayEntry(data.tabs.checks.isExpanded, fromIdx, toIdx);
         data.sidebar.checks.isExpanded = moveArrayEntry(data.sidebar.checks.isExpanded, fromIdx, toIdx);
         return data;
      });
   }

   /**
    * Splices a fresh expanded flag into both per-check expansion arrays when a copied check is
    * inserted, keeping them aligned with the check array.
    * @param {number} atIdx - The insertion point.
    */
   function postInsertCheck(atIdx) {
      update((data) => {
         data.tabs.checks.isExpanded.splice(atIdx, 0, true);
         data.sidebar.checks.isExpanded.splice(atIdx, 0, true);
         return data;
      });
   }
```

Add the import at the top:

```javascript
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
```

Add both names to the returned object (and to the typedef `@property` list):

```javascript
   return {
      set,
      update,
      subscribe,
      postAddCheck,
      preDeleteCheck,
      postMoveCheck,
      postInsertCheck,
   };
```

- [ ] **Step 2: Forward the methods through `RulesElementItemSheetState.js`**

Destructure and re-export the two new names exactly as `postAddCheck` / `preDeleteCheck` are:

```javascript
   const { set, update, subscribe, postAddCheck, preDeleteCheck, postMoveCheck, postInsertCheck } =
      createTitanItemSheetState(item, overrideData ?? createRulesElementItemSheetData(item));

   return {
      set,
      update,
      subscribe,
      postAddCheck,
      preDeleteCheck,
      postMoveCheck,
      postInsertCheck,
   };
```

- [ ] **Step 3: Add sheet hooks in `TitanItemSheet.js`**

After `preDeleteCheck`, add:

```javascript
   /**
    * Called after an Item Check is reordered, to keep per-check expansion state aligned.
    * @param {number} fromIdx - The check's previous index.
    * @param {number} toIdx - The insertion point it moved before.
    */
   postMoveCheck(fromIdx, toIdx) {
      this.applicationState.postMoveCheck(fromIdx, toIdx);
   }

   /**
    * Called after a copied Item Check is inserted, to seed its expansion state.
    * @param {number} atIdx - The insertion point.
    */
   postInsertCheck(atIdx) {
      this.applicationState.postInsertCheck(atIdx);
   }
```

- [ ] **Step 4: Add `moveCheck` / `insertCheck` in `TitanItem.js`**

Locate the existing `addCheck` / `deleteCheck` (which call `this._sheet.postAddCheck()` / `preDeleteCheck(idx)` around the `system.check` array update — match their exact owner-gating and sheet-notification shape). Add:

```javascript
   /**
    * Reorders an Item Check, keeping the sheet's per-check expansion state in lockstep.
    * @param {number} fromIdx - The check's current index.
    * @param {number} toIdx - The insertion point to move it before.
    * @returns {Promise<void>}
    */
   async moveCheck(fromIdx, toIdx) {
      if (assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         this._sheet?.postMoveCheck(fromIdx, toIdx);
         await this.update({
            system: {
               check: moveArrayEntry(this.system.check, fromIdx, toIdx),
            },
         });
      }
   }

   /**
    * Inserts a copy of a Check (from this or another item) with a fresh uuid, seeding its
    * expansion state.
    * @param {object} element - The check data to copy in.
    * @param {number} atIdx - The insertion point.
    * @returns {Promise<void>}
    */
   async insertCheck(element, atIdx) {
      if (assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
         const next = this.system.check.slice();
         next.splice(atIdx, 0, cloneElementWithNewUuid(element));
         this._sheet?.postInsertCheck(atIdx);
         await this.update({
            system: {
               check: next,
            },
         });
      }
   }
```

Add imports at the top of `TitanItem.js` (verify the exact `assert` import path already present):

```javascript
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';
```

> Note: confirm the sheet accessor used by `addCheck`/`deleteCheck` (e.g. `this._sheet` vs
> `this.sheet`) and reuse that exact accessor; the snippet assumes `this._sheet`.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build completes.

- [ ] **Step 6: Commit**

```bash
git add src/document/types/item/TitanItem.js src/document/types/item/sheet/TitanItemSheetState.js src/document/types/item/sheet/RulesElementItemSheetState.js src/document/types/item/sheet/TitanItemSheet.js
git commit -m "feat: add moveCheck/insertCheck with expansion lockstep"
```

---

## Task 7: `moveAttack` / `insertAttack`

**Files:**
- Modify: `src/document/types/item/types/weapon/WeaponDataModel.js`

- [ ] **Step 1: Add after `deleteAttack`**

```javascript
   /**
    * Reorders an Attack within this Weapon.
    * @param {number} fromIdx - The attack's current index.
    * @param {number} toIdx - The insertion point to move it before.
    * @returns {Promise<void>}
    */
   async moveAttack(fromIdx, toIdx) {
      if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
         await this.parent.update({
            system: {
               attack: moveArrayEntry(this.attack, fromIdx, toIdx),
            },
         });
      }
   }

   /**
    * Inserts a copy of an Attack (from this or another weapon) at a position, with a fresh uuid.
    * @param {object} element - The attack data to copy in.
    * @param {number} atIdx - The insertion point.
    * @returns {Promise<void>}
    */
   async insertAttack(element, atIdx) {
      if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
         /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
         const next = this.attack.slice();
         next.splice(atIdx, 0, cloneElementWithNewUuid(element));
         await this.parent.update({
            system: {
               attack: next,
            },
         });
      }
   }
```

Add imports at the top:

```javascript
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';
```

> Note: `addAttack`/`deleteAttack` also notify the sheet (`sheet.addAttack()` /
> `sheet.postDeleteAttack(idx)`) to maintain attack-row UI state. Check
> `WeaponItemSheetState` for any per-attack index-keyed arrays; if present, add matching
> `postMoveAttack`/`postInsertAttack` hooks the way Task 6 did for checks. If attacks have no
> parallel expansion arrays (rows key by uuid), no sheet notification is needed here.

- [ ] **Step 2: Verify the attack-row UI-state question**

Run: `grep -n "isExpanded\|postDeleteAttack\|addAttack" src/document/types/item/types/weapon/sheet/*.js`
Expected: determines whether attack rows carry index-keyed expansion arrays. Act on the result per the note above before continuing.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build completes.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/types/weapon/
git commit -m "feat: add moveAttack and insertAttack mutators"
```

---

## Task 8: `moveCustomAspect` / `insertCustomAspect`

**Files:**
- Modify: `src/document/types/item/types/spell/SpellDataModel.js`

- [ ] **Step 1: Add after `deleteCustomAspect`**

```javascript
   /**
    * Reorders a Custom Aspect within this Spell.
    * @param {number} fromIdx - The aspect's current index.
    * @param {number} toIdx - The insertion point to move it before.
    * @returns {Promise<void>}
    */
   async moveCustomAspect(fromIdx, toIdx) {
      if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
         await this.parent.update({
            system: {
               customAspect: moveArrayEntry(this.customAspect, fromIdx, toIdx),
            },
         });
      }
   }

   /**
    * Inserts a copy of a Custom Aspect (from this or another spell) at a position, with a fresh uuid.
    * @param {object} element - The aspect data to copy in.
    * @param {number} atIdx - The insertion point.
    * @returns {Promise<void>}
    */
   async insertCustomAspect(element, atIdx) {
      if (assert(this.parent.isOwner, 'Cannot modify document %s if not owner.', this.parent.name)) {
         /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
         const next = this.customAspect.slice();
         next.splice(atIdx, 0, cloneElementWithNewUuid(element));
         await this.parent.update({
            system: {
               customAspect: next,
            },
         });
      }
   }
```

Add imports at the top (verify `assert` is already imported; match `WeaponDataModel`'s import block):

```javascript
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/document/types/item/types/spell/SpellDataModel.js
git commit -m "feat: add moveCustomAspect and insertCustomAspect mutators"
```

---

## Task 9: Wire the Rules Elements settings tab

**Files:**
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetRulesElementsTab.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte`

- [ ] **Step 1: Add the grip handle to the settings row header**

In `ItemSheetRulesElementSettings.svelte`, import the handle and place it at the leading edge of the existing header `.row` (before the `.operation` block):

```svelte
   import DragHandle from '~/helpers/svelte-components/drag-reorder/DragHandle.svelte';
```

```svelte
      <div class="row">
         <!--Drag handle-->
         <DragHandle/>

         <!--Operation Select-->
         <div class="operation">
            <LabeledElement label="operation">
               <ItemSheetRulesElementOperationSelect {idx}/>
            </LabeledElement>
         </div>

         <!--Delete Button-->
         <div class="delete-button">
            <DocumentOwnerIconButton
               icon={DELETE_ICON}
               label={localize('delete')}
               onclick={() => {
                  document.data.system.deleteRulesElement(idx);
               }}
            />
         </div>
      </div>
```

- [ ] **Step 2: Wire the list `<ol>` and `<li>` in `ItemSheetRulesElementsTab.svelte`**

Add imports and a `dropIndex` state, replace the list block:

```svelte
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { flip } from 'svelte/animate';
```

```svelte
   /** @type {number | null} The live insertion index for the drop line, or null when idle. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this list, distinguishing a reorder from a foreign-sheet copy. */
   const sourceKey = $derived(`${document.data.uuid}:rulesElement`);
```

```svelte
      {#if document.data.system.rulesElement.length > 0}
         <ol
            transition:slide|local
            use:reorderDropZone={{
               kind: 'rulesElement',
               sourceKey,
               rowSelector: 'li.reorder-row',
               onIndicator: (index) => { dropIndex = index; },
               onReorder: (from, to) => { document.data.system.moveRulesElement(from, to); },
               onForeignDrop: (payload, at) => { document.data.system.insertRulesElement(payload.element, at); },
            }}
         >
            <!--Each Element-->
            {#each document.data.system.rulesElement as element, idx (element.uuid)}
               {#if dropIndex === idx}
                  <InsertionLine/>
               {/if}
               <li
                  class="reorder-row"
                  animate:flip={{ duration: 150 }}
                  transition:slide|local
                  use:draggableRow={{
                     kind: 'rulesElement',
                     sourceKey,
                     index: idx,
                     getDataTransfer: () => JSON.stringify({
                        titanElementDrag: true,
                        kind: 'rulesElement',
                        sourceDocUuid: document.data.uuid,
                        sourceIdx: idx,
                        element: document.data.system.rulesElement[idx],
                     }),
                  }}
               >
                  <ItemSheetRulesElementSettings {idx}/>
               </li>
            {/each}
            {#if dropIndex === document.data.system.rulesElement.length}
               <InsertionLine/>
            {/if}
         </ol>
      {/if}
```

- [ ] **Step 3: Build and smoke-test in the running client**

Run: `npm run build`
Then in the live world open a weapon/ability item sheet → Rules Elements tab: add two elements, drag one by its grip over the other — confirm the insertion line appears and the order persists after reload. (Project rule: replicate before claiming done.)

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/sheet/rules-element/
git commit -m "feat: drag-reorder + cross-item copy for rules elements"
```

---

## Task 10: Wire the Checks settings tab

**Files:**
- Modify: `src/document/types/item/sheet/check/ItemSheetChecksTab.svelte`
- Modify: `src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte`

This tab renders through the shared `FiltereedList`, which iterates a *filtered* subset. To get an
explicit insertion index and a stable container to attach the drop zone to, replace the
`FiltereedList` usage with an inline keyed `{#each}` over computed indices (mirroring the
custom-aspect tab in Task 12), so reorder/insert map to **unfiltered** array indices.

- [ ] **Step 1: Add the grip to `ItemSheetCheckSettings.svelte`**

Import `DragHandle` and place `<DragHandle/>` at the leading edge of the row's header (beside the existing delete control — match the row's current header structure).

- [ ] **Step 2: Replace the list in `ItemSheetChecksTab.svelte`**

```svelte
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { flip } from 'svelte/animate';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';
   import ItemSheetCheckSettings from '~/document/types/item/sheet/check/ItemSheetCheckSettings.svelte';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';

   const document = getContext('document');
   const appState = getContext('applicationState');

   /** @type {number | null} The live insertion index for the drop line. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this list. */
   const sourceKey = $derived(`${document.data.uuid}:check`);

   /** @type {number[]} Unfiltered indices whose check matches the active filter. */
   const filteredEntries = $derived.by(() => {
      const result = [];
      const filter = $appState.tabs.checks.filter.toLowerCase();
      document.data.system.check.forEach((entry, idx) => {
         if (entry.label.toLowerCase().includes(filter)) {
            result.push(idx);
         }
      });
      return result;
   });
```

```svelte
         {#if document.data.system.check.length > 0}
            <ol
               use:reorderDropZone={{
                  kind: 'check',
                  sourceKey,
                  rowSelector: 'li.reorder-row',
                  onIndicator: (index) => { dropIndex = index; },
                  onReorder: (from, to) => { document.data.moveCheck(from, to); },
                  onForeignDrop: (payload, at) => { document.data.insertCheck(payload.element, at); },
               }}
            >
               {#each filteredEntries as idx (document.data.system.check[idx].uuid)}
                  {#if dropIndex === idx}
                     <InsertionLine/>
                  {/if}
                  <li
                     class="reorder-row"
                     animate:flip={{ duration: 150 }}
                     use:draggableRow={{
                        kind: 'check',
                        sourceKey,
                        index: idx,
                        getDataTransfer: () => JSON.stringify({
                           titanElementDrag: true,
                           kind: 'check',
                           sourceDocUuid: document.data.uuid,
                           sourceIdx: idx,
                           element: document.data.system.check[idx],
                        }),
                     }}
                  >
                     <ItemSheetCheckSettings {idx}/>
                  </li>
               {/each}
               {#if dropIndex === document.data.system.check.length}
                  <InsertionLine/>
               {/if}
            </ol>
         {/if}
```

> When a filter is active, `dropIndex` maps to unfiltered indices; the line still renders against
> the visible rows because each visible row carries its true `idx`. Reordering while filtered is an
> acceptable edge — the line renders only adjacent to visible rows.

- [ ] **Step 3: Build + live smoke-test (add 2 checks, reorder, confirm expansion state stays with the row)**

Run: `npm run build` then verify in the world.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/sheet/check/
git commit -m "feat: drag-reorder + cross-item copy for checks"
```

---

## Task 11: Wire the Weapon Attacks settings tab

**Files:**
- Modify: `src/document/types/item/types/weapon/sheet/WeaponSheetAttacksTab.svelte`
- Modify: `src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte`

- [ ] **Step 1: Add the grip to `WeaponSheetAttackSettings.svelte`** (leading edge of the row header).

- [ ] **Step 2: Wire the list in `WeaponSheetAttacksTab.svelte`** — the tab already iterates a
`filteredEntries` array of indices keyed by `attack[idx].uuid`. Add imports + `dropIndex` + `sourceKey`
exactly as Task 10, then wrap the `<ol>` and rows:

```svelte
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';
   import { flip } from 'svelte/animate';
```

```svelte
   let dropIndex = $state(null);
   const sourceKey = $derived(`${document.data.uuid}:attack`);
```

```svelte
      <ol
         use:reorderDropZone={{
            kind: 'attack',
            sourceKey,
            rowSelector: 'li.reorder-row',
            onIndicator: (index) => { dropIndex = index; },
            onReorder: (from, to) => { document.data.system.moveAttack(from, to); },
            onForeignDrop: (payload, at) => { document.data.system.insertAttack(payload.element, at); },
         }}
      >
         {#each filteredEntries as idx (document.data.system.attack[idx].uuid)}
            {#if dropIndex === idx}
               <InsertionLine/>
            {/if}
            <li
               class="reorder-row"
               animate:flip={{ duration: 150 }}
               use:draggableRow={{
                  kind: 'attack',
                  sourceKey,
                  index: idx,
                  getDataTransfer: () => JSON.stringify({
                     titanElementDrag: true,
                     kind: 'attack',
                     sourceDocUuid: document.data.uuid,
                     sourceIdx: idx,
                     element: document.data.system.attack[idx],
                  }),
               }}
            >
               <WeaponSheetAttackSettings {idx}/>
            </li>
         {/each}
         {#if dropIndex === document.data.system.attack.length}
            <InsertionLine/>
         {/if}
      </ol>
```

- [ ] **Step 3: Build + live smoke-test.** Run: `npm run build`, verify in the world.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/types/weapon/sheet/
git commit -m "feat: drag-reorder + cross-weapon copy for attacks"
```

---

## Task 12: Wire the Spell Custom Aspects settings tab

**Files:**
- Modify: `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte`
- Modify: `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectSettings.svelte`

- [ ] **Step 1: Add the grip to `SpellSheetCustomAspectSettings.svelte`** (leading edge of the row header).

- [ ] **Step 2: Wire the `<ol>` in `SpellSheetCustomAspectsTab.svelte`** — it already iterates a
`filteredEntries` index array keyed by `customAspect[idx].uuid`. Add the same imports + `dropIndex` +
`sourceKey` as Task 11, then:

```svelte
   let dropIndex = $state(null);
   const sourceKey = $derived(`${document.data.uuid}:customAspect`);
```

```svelte
            <ol
               out:slide|local
               use:reorderDropZone={{
                  kind: 'customAspect',
                  sourceKey,
                  rowSelector: 'li.reorder-row',
                  onIndicator: (index) => { dropIndex = index; },
                  onReorder: (from, to) => { document.data.system.moveCustomAspect(from, to); },
                  onForeignDrop: (payload, at) => { document.data.system.insertCustomAspect(payload.element, at); },
               }}
            >
               {#each filteredEntries as idx (document.data.system.customAspect[idx].uuid)}
                  {#if dropIndex === idx}
                     <InsertionLine/>
                  {/if}
                  <li
                     class="reorder-row"
                     animate:flip={{ duration: 150 }}
                     out:slide|local
                     use:draggableRow={{
                        kind: 'customAspect',
                        sourceKey,
                        index: idx,
                        getDataTransfer: () => JSON.stringify({
                           titanElementDrag: true,
                           kind: 'customAspect',
                           sourceDocUuid: document.data.uuid,
                           sourceIdx: idx,
                           element: document.data.system.customAspect[idx],
                        }),
                     }}
                  >
                     <SpellSheetCustomAspectSettings {idx}/>
                  </li>
               {/each}
               {#if dropIndex === document.data.system.customAspect.length}
                  <InsertionLine/>
               {/if}
            </ol>
```

Add the two imports (`InsertionLine`, actions, `flip`) as in Task 11.

- [ ] **Step 3: Build + live smoke-test.** Run: `npm run build`, verify in the world.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/types/spell/sheet/
git commit -m "feat: drag-reorder + cross-spell copy for custom aspects"
```

---

## Task 13: Character-sheet item list — insertion line + grip

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/items/CharacterSheetItemList.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/CharacterSheetMultiItemList.svelte`

Items reorder through Foundry's `sort` field. Keep the external-drop path (cross-actor / compendium
creation) on `TitanActorSheet`; handle intra-actor reorder natively via the action and commit with
`performIntegerSort`. The native `drop` calls `stopPropagation()` (in the action) so the sheet's
Foundry `DragDrop` handler is bypassed for reorders only.

- [ ] **Step 1: Replace the drag wiring in `CharacterSheetItemList.svelte`**

Remove the `isDragHovering` / `hoveredItemId` / `onDragEnter` tint logic and the `.drag-hovered`
style. Add:

```svelte
   import DragHandle from '~/helpers/svelte-components/drag-reorder/DragHandle.svelte';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';
   import { flip } from 'svelte/animate';
```

```svelte
   /** @type {number | null} The live insertion index for the drop line. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this actor's item list. */
   const sourceKey = $derived(`${document.data.uuid}:item`);

   /**
    * Commits a same-actor item reorder by integer-sorting the source before/after the target row.
    * @param {number} fromIdx - The dragged item's index in the sorted list.
    * @param {number} toIdx - The insertion point in the sorted list.
    * @returns {Promise<void>}
    */
   async function reorderItem(fromIdx, toIdx) {
      const source = items[fromIdx];
      const target = items[toIdx] ?? items[items.length - 1];
      if (!source || !target || source.id === target.id) {
         return;
      }
      const sortBefore = toIdx <= fromIdx;
      const siblings = items.filter((i) => i.id !== source.id);
      const updates = foundry.utils.performIntegerSort(source, { target, siblings, sortBefore });
      await document.data.updateEmbeddedDocuments(
         'Item',
         updates.map((u) => ({ _id: u.target.id, ...u.update })),
      );
   }
```

> Confirm the `performIntegerSort` entry point in v14 (`foundry.utils.performIntegerSort` vs the
> `SortingHelpers.performIntegerSort` global used in `TitanActorSheet._onSortItem`); reuse whichever
> that file already imports.

Wrap the list:

```svelte
{#if items.length > 0}
   <ol
      transition:slide|local
      use:reorderDropZone={{
         kind: 'item',
         sourceKey,
         rowSelector: 'li.reorder-row',
         onIndicator: (index) => { dropIndex = index; },
         onReorder: (from, to) => { reorderItem(from, to); },
         onForeignDrop: () => {},
      }}
   >
      {#each items as item, idx (item._id)}
         {#if dropIndex === idx}
            <InsertionLine/>
         {/if}
         <li
            class="item reorder-row"
            data-item-id={item._id}
            animate:flip={{ duration: 150 }}
            transition:slide|local
            use:draggableRow={{
               kind: 'item',
               sourceKey,
               index: idx,
               getDataTransfer: () => JSON.stringify(document.data.items.get(item._id).toDragData()),
            }}
         >
            <EmbeddedDocumentProvider doc={item}>
               <DragHandle/>
               {#each [itemComponent] as ItemComponent}
                  <ItemComponent bind:isExpanded={$appState.tabs[tabKey].isExpanded[item._id]}/>
               {/each}
            </EmbeddedDocumentProvider>
         </li>
      {/each}
      {#if dropIndex === items.length}
         <InsertionLine/>
      {/if}
   </ol>
{/if}
```

- [ ] **Step 2: Mirror the same change in `CharacterSheetMultiItemList.svelte`** (identical structure,
`sourceKey` uses the same `:item` suffix so multi-list and single-list reorders share a source identity
within the actor).

- [ ] **Step 3: Build + live smoke-test.** Drag an item by its grip — insertion line shows, order
persists. Drag an item from a compendium onto the list — still creates a new item (external path intact).
**This is the native-drop / Foundry-DragDrop coexistence risk: verify both live before claiming done.**

- [ ] **Step 4: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/CharacterSheetItemList.svelte src/document/types/actor/types/character/sheet/items/CharacterSheetMultiItemList.svelte
git commit -m "feat: insertion-line drag visual + grip for character item lists"
```

---

## Task 14: Character-sheet effect list — grip + new sort reorder

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectList.svelte`

- [ ] **Step 1: Apply the same treatment as Task 13**, with `kind: 'effect'`,
`sourceKey = ${document.data.uuid}:effect`, `data-effect-id`, the `effects` array, and a `reorderEffect`
that commits via `updateEmbeddedDocuments('ActiveEffect', …)`:

```svelte
   /**
    * Commits an effect reorder by integer-sorting the source before/after the target effect.
    * @param {number} fromIdx - The dragged effect's index in the sorted list.
    * @param {number} toIdx - The insertion point in the sorted list.
    * @returns {Promise<void>}
    */
   async function reorderEffect(fromIdx, toIdx) {
      const source = effects[fromIdx];
      const target = effects[toIdx] ?? effects[effects.length - 1];
      if (!source || !target || source.id === target.id) {
         return;
      }
      const sortBefore = toIdx <= fromIdx;
      const siblings = effects.filter((e) => e.id !== source.id);
      const updates = foundry.utils.performIntegerSort(source, { target, siblings, sortBefore });
      await document.data.updateEmbeddedDocuments(
         'ActiveEffect',
         updates.map((u) => ({ _id: u.target.id, ...u.update })),
      );
   }
```

Wire `<ol>` / `<li>` exactly as Task 13 (kind `'effect'`, `onReorder: reorderEffect`, `onForeignDrop: () => {}`,
`getDataTransfer` from the effect's `toDragData()`), add `<DragHandle/>` inside the row, remove the old
`.drag-hovered` tint.

- [ ] **Step 2: Build + live smoke-test.** Add two effects, reorder by grip, confirm order persists;
confirm dragging an effect onto another actor still works (drag-out intact).

- [ ] **Step 3: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectList.svelte
git commit -m "feat: drag-reorder + grip for character effect list"
```

---

## Task 15: E2E — settings-list reorder + cross-sheet copy

**Files:**
- Create: `tests/e2e/settings-list-reorder.spec.js`
- Create: `tests/e2e/cross-sheet-element-copy.spec.js`

Native HTML5 drag-drop is unreliable to synthesize in Playwright, so these specs drive the new
**mutators** through the document API (asserting persistence + reactive re-render, the pattern in
`rules-element-crud.spec.js`) and assert the grip/line **DOM** is present. The pointer-drag itself is
covered by the live smoke-tests in Tasks 9–14.

- [ ] **Step 1: Write `settings-list-reorder.spec.js`** following the `rules-element-crud.spec.js`
scaffold (file-shared `page`, `login`, `clearChat`, `closeAllApps`, `attachPageErrors`). For each kind,
seed an item with 3 distinguishable elements, call the move mutator, assert array order + that the row
order in the DOM updated. Rules-element example test body:

```javascript
test('moveRulesElement reorders and re-renders in place', async () => {
   const order = await page.evaluate(async (name) => {
      const item = game.items.getName(name);
      // Seed three flat-modifier elements with distinct values.
      await item.update({ system: { rulesElement: [
         { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 1, uuid: 'u1' },
         { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 2, uuid: 'u2' },
         { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 3, uuid: 'u3' },
      ] } });
      await item.system.moveRulesElement(0, 3);   // move first to end
      return item.system.rulesElement.map((e) => e.uuid);
   }, ITEM_NAME);
   expect(order).toEqual(['u2', 'u3', 'u1']);
});
```

Add analogous tests for `moveCheck` (also assert `sheet.applicationState` `tabs.checks.isExpanded`
order tracks the move), `moveAttack`, and `moveCustomAspect`. Assert the grip renders:
`await expect(page.locator('.rules-element .drag-handle').first()).toBeVisible();`

- [ ] **Step 2: Write `cross-sheet-element-copy.spec.js`** — for each kind, seed a source element and an
empty target of the matching type, call `insertX(sourceElement, 0)` on the target, and assert: the
target gained one row, the source still has its element, and the copy's uuid differs from the source's.
Type-gate assertion: a `kind: 'attack'` payload passed to `insertCustomAspect` is out of scope — instead
assert the action's `accepts` gate at the unit level is unnecessary; the e2e asserts only same-kind
inserts succeed. Example (rules element):

```javascript
test('insertRulesElement copies with a fresh uuid and leaves the source intact', async () => {
   const result = await page.evaluate(async (names) => {
      const source = game.items.getName(names.source);
      const target = game.items.getName(names.target);
      const element = source.system.rulesElement[0];
      await target.system.insertRulesElement(element, 0);
      return {
         targetCount: target.system.rulesElement.length,
         sourceCount: source.system.rulesElement.length,
         freshUuid: target.system.rulesElement[0].uuid !== element.uuid,
      };
   }, { source: SOURCE_NAME, target: TARGET_NAME });
   expect(result.targetCount).toBe(1);
   expect(result.sourceCount).toBe(1);
   expect(result.freshUuid).toBe(true);
});
```

- [ ] **Step 3: Run the new specs**

Run: `npm run test:e2e -- settings-list-reorder cross-sheet-element-copy`
Expected: all green. (World must be launched — the suite is world-launch-gated.)

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/settings-list-reorder.spec.js tests/e2e/cross-sheet-element-copy.spec.js
git commit -m "test: e2e for settings reorder + cross-sheet element copy"
```

---

## Task 16: E2E — character item/effect reorder + insertion-line presence

**Files:**
- Create: `tests/e2e/character-sheet-reorder.spec.js`

- [ ] **Step 1: Write the spec** — seed a character with three items and three effects, drive
`reorderItem`-equivalent commits through `performIntegerSort` via the document API (or call the same
`updateEmbeddedDocuments` sort updates), and assert the sorted order changes. Assert the grip handle
renders on item and effect rows: `await expect(page.locator('.item .drag-handle').first()).toBeVisible();`

```javascript
test('item sort reorder persists', async () => {
   const order = await page.evaluate(async (name) => {
      const actor = game.actors.getName(name);
      const items = actor.items.filter((i) => i.type === 'weapon').sort((a, b) => a.sort - b.sort);
      const [first, , third] = items;
      const updates = foundry.utils.performIntegerSort(first, { target: third, siblings: items.filter((i) => i.id !== first.id), sortBefore: false });
      await actor.updateEmbeddedDocuments('Item', updates.map((u) => ({ _id: u.target.id, ...u.update })));
      return actor.items.filter((i) => i.type === 'weapon').sort((a, b) => a.sort - b.sort).map((i) => i.name);
   }, ACTOR_NAME);
   expect(order[order.length - 1]).toBe('SeedWeapon A');
});
```

> Confirm the v14 sort entry point used here matches Task 13's resolution.

- [ ] **Step 2: Run**

Run: `npm run test:e2e -- character-sheet-reorder`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/character-sheet-reorder.spec.js
git commit -m "test: e2e for character item/effect reorder"
```

---

## Task 17: Full suite + documentation

- [ ] **Step 1: Run the full unit + e2e suites**

Run: `npm run test` (unit) and `npm run test:e2e` (full).
Expected: all green, including the prior counts plus the new tests. Investigate any regression before
proceeding (a null result may mean a wiring bug — project "Verify Failure" rule).

- [ ] **Step 2: Update the `titan-codebase` skill**

In `.claude/skills/titan-codebase/references/conventions.md` (and `abstractions.md` if the abstractions
list changed), record: the shared `drag-reorder/` actions + `DragHandle`/`InsertionLine`; the
`activeDrag` dragover-gating pattern; the per-kind `moveX`/`insertX` mutators and where each lives; the
check `isExpanded` lockstep (`postMoveCheck`/`postInsertCheck`); and the rule that cross-sheet element
copy uses copy semantics with a fresh uuid, type-gated by `kind`.

- [ ] **Step 3: Update `docs/TODO.md`**

Delete any now-completed entries; log any deferred edges discovered (e.g. reorder-while-filtered nuance)
per project rules. No bug entries unless a real bug was found.

- [ ] **Step 4: Run `graphify update .`** to refresh the knowledge graph (AST-only, no API cost).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/titan-codebase/ docs/TODO.md graphify-out/
git commit -m "docs: record drag-reorder + cross-sheet copy patterns"
```

---

## Self-review notes (addressed)

- **Spec coverage:** visual upgrade (Tasks 3, 9–14), four settings reorders (Tasks 5–12), effect
  reorder (Task 14), cross-sheet copy with fresh uuid + type-gating (Tasks 5–12, 15), check
  isExpanded lockstep (Task 6), testing (Tasks 1–2 unit, 15–16 e2e), docs (Task 17).
- **Type consistency:** mutators are `moveX(fromIdx, toIdx)` / `insertX(element, atIdx)` throughout;
  actions use `kind` / `sourceKey` / `rowSelector` / `onIndicator` / `onReorder` / `onForeignDrop`
  consistently; payload shape `{ titanElementDrag, kind, sourceDocUuid, sourceIdx, element }` is
  uniform across tabs.
- **Known verify-live points (not placeholders — flagged for the implementer):** the
  `performIntegerSort` entry point in v14; the `TitanItem` sheet accessor (`this._sheet`); whether
  attacks carry index-keyed expansion arrays (Task 7 Step 2); the native-drop vs Foundry-DragDrop
  coexistence on the actor sheet (Task 13 Step 3); the `localize` key convention for `dragToReorder`
  (Task 3 Step 4).
