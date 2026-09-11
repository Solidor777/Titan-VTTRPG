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

/** @type {HTMLElement | null} The row element the active drag started from, cleared if it is destroyed mid-drag. */
let activeDragNode = null;

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

   /**
    * Disarms dragging when the press is released without a drag starting.
    */
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
      activeDragNode = node;
      event.dataTransfer.effectAllowed = 'copyMove';
      event.dataTransfer.setData('text/plain', current.getDataTransfer());
      current.onDragStart?.();
   }

   /**
    * Clears drag state.
    */
   function onDragEnd() {
      activeDrag = null;
      activeDragNode = null;
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
         // A row removed mid-drag (e.g. a filter change) never fires its own dragend; clear the shared
         // descriptor here so a stale drag cannot make every drop zone a target for the rest of the session.
         if (activeDragNode === node) {
            activeDrag = null;
            activeDragNode = null;
         }
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
 * @param {string} params.rowSelector - CSS selector matching draggable row children, each carrying a
 * `data-row-index` attribute with its index in the FULL (unfiltered) array.
 * @param {boolean} [params.acceptsForeign] - Whether this zone handles drags from a different source
 * (a cross-sheet copy). When false, foreign drags pass through untouched so Foundry's own drop handler
 * (e.g. cross-actor item creation) still runs.
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
    * Whether the active drag is one this zone should handle: a matching kind that is either a same-list
    * reorder or, for zones that accept them, a foreign-source copy.
    * @returns {boolean} True when this zone owns the drop.
    */
   function handlesActiveDrag() {
      return !!activeDrag
         && activeDrag.kind === current.kind
         && (activeDrag.sourceKey === current.sourceKey || !!current.acceptsForeign);
   }

   /**
    * Computes the insertion index in the FULL array frame by reading the `data-row-index` of the row
    * the pointer is above (its midpoint). Reading the row's own index keeps the result correct even when
    * the list is filtered and the DOM holds only a subset of rows.
    * @param {number} clientY - The pointer's viewport Y coordinate.
    * @returns {number} The insertion point in the unfiltered array frame.
    */
   function computeIndex(clientY) {
      /** @type {HTMLElement[]} The current (possibly filtered) row elements. */
      const rows = Array.from(node.querySelectorAll(current.rowSelector));
      for (let i = 0; i < rows.length; i += 1) {
         const rect = rows[i].getBoundingClientRect();
         if (clientY < rect.top + rect.height / 2) {
            return Number(rows[i].dataset.rowIndex);
         }
      }

      // Below the last visible row: land just after its unfiltered index.
      if (rows.length > 0) {
         return Number(rows[rows.length - 1].dataset.rowIndex) + 1;
      }

      return 0;
   }

   /**
    * Allows the drop and updates the insertion indicator when a compatible drag is overhead.
    * @param {DragEvent} event - The dragover event.
    */
   function onDragOver(event) {
      if (!handlesActiveDrag()) {
         return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = activeDrag.sourceKey === current.sourceKey ? 'move' : 'copy';
      current.onIndicator(computeIndex(event.clientY));
   }

   /**
    * Hides the indicator when the pointer leaves the zone entirely.
    * @param {DragEvent} event - The dragleave event.
    */
   function onDragLeave(event) {
      if (!node.contains(event.relatedTarget)) {
         current.onIndicator(null);
      }
   }

   /**
    * Commits the drop: a same-list reorder, or a foreign copy parsed from the payload. Foreign drags
    * this zone does not accept are left untouched so Foundry's own drop handler can run.
    * @param {DragEvent} event - The drop event.
    */
   function onDrop(event) {
      if (!handlesActiveDrag()) {
         return;
      }
      event.preventDefault();
      event.stopPropagation();

      /** @type {number} The insertion point resolved from the drop position. */
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
