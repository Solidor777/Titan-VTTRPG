import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import assert from '~/helpers/utility-functions/Assert.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';

/**
 * Awaits an update of a document's check array and runs `undo` when the update did not commit. A check edit changes the
 * live model and the sheet's expansion state before its update resolves, so the next edit's snapshot of `system`
 * (`RefreshSystemDocumentData.js` sends the whole `system`) already carries the change and a later edit does not lose
 * it; an update that a `preUpdate` hook vetoes (it resolves undefined) or that the server rejects must take those edits
 * back, or the next edit would save them.
 * @param {() => Promise<foundry.abstract.Document|undefined>} update - Sends the update.
 * @param {() => void} undo - Takes back the edits made before the update.
 * @returns {Promise<foundry.abstract.Document|undefined>} The updated document, or undefined when nothing committed.
 */
async function commitCheckUpdate(update, undo) {
   /** @type {foundry.abstract.Document|undefined} The updated document. */
   let committed;
   try {
      committed = await update();
   }
   catch (error) {
      undo();
      throw error;
   }
   if (!committed) {
      undo();
   }
   return committed;
}

/**
 * Mixin that adds the mutators of a document's `system.check` array to a document class. Items and Active Effects
 * share the Checks tab (`ItemSheetChecksTab.svelte`), which calls these four methods on its document, so both
 * document classes take them from here. INVARIANT: the document's sheet implements `postAddCheck`, `preDeleteCheck`,
 * `postMoveCheck`, `postInsertCheck`, `undoDeleteCheck`, `undoMoveCheck` and `undoInsertCheck`, which keep the
 * per-check expansion state aligned with the array and take it back when an update does not commit.
 * @param {typeof foundry.abstract.Document} BaseClass - The document class to extend.
 * @returns {typeof foundry.abstract.Document} The extended class with check-list mutators.
 */
export default function CheckListMixin(BaseClass) {
   return class CheckListDocument extends BaseClass {

      /**
       * Adds a new Check to this document.
       * @returns {Promise<void>}
       */
      async addCheck() {
         if (assert(
            this.isOwner,
            'Cannot modify document %s if not owner.',
            this.name,
         )) {
            // The new Check goes into the live model first so an edit made before the update resolves carries it.
            /** @type {ItemCheckTemplate} The new Check. */
            const added = createItemCheckTemplate();
            this.system.check.push(added);

            /** @type {foundry.abstract.Document|undefined} The updated document, or undefined if none committed. */
            const committed = await commitCheckUpdate(
               () => this.update({
                  system: {
                     check: structuredClone(this.system.check),
                  },
               }),
               () => {
                  // The model is already rebuilt from the stored data when the new Check is not found.
                  /** @type {number} The position of the new Check in the live model, or -1. */
                  const idx = this.system.check.findIndex((check) => check.uuid === added.uuid);
                  if (idx >= 0) {
                     this.system.check.splice(idx, 1);
                  }
               },
            );

            // Notify the sheet of the added check.
            if (committed && this.sheet) {
               this.sheet.postAddCheck();
            }
         }
      }

      /**
       * Removes a Check from this document.
       * @param {number} idx - The index of the Check in this document's Checks array.
       * @returns {Promise<void>}
       */
      async deleteCheck(idx) {
         if (assert(
            this.isOwner,
            'Cannot modify document %s if not owner.',
            this.name,
         )) {
            // Notify the sheet before deletion.
            /** @type {object|undefined} The expansion flags the sheet removed with the check. */
            const removedExpansion = this.sheet?.preDeleteCheck(idx);

            /** @type {ItemCheck|undefined} The Check taken out of the live model, if any. */
            const [removed] = this.system.check.splice(idx, 1);
            await commitCheckUpdate(
               () => this.update({
                  system: {
                     check: structuredClone(this.system.check),
                  },
               }),
               () => {
                  // The model is already rebuilt from the stored data when the Check is back in it.
                  if (removed && !this.system.check.some((check) => check.uuid === removed.uuid)) {
                     this.system.check.splice(idx, 0, removed);
                  }
                  if (removedExpansion) {
                     this.sheet?.undoDeleteCheck(idx, removedExpansion);
                  }
               },
            );
         }
      }

      /**
       * Reorders a Check, keeping the sheet's per-check expansion state in lockstep.
       * @param {number} fromIdx - The check's current index.
       * @param {number} toIdx - The insertion point to move it before.
       * @returns {Promise<void>}
       */
      async moveCheck(fromIdx, toIdx) {
         if (assert(
            this.isOwner,
            'Cannot modify document %s if not owner.',
            this.name,
         )) {
            // Keep per-check expansion state aligned before the reactive re-render.
            if (this.sheet) {
               this.sheet.postMoveCheck(fromIdx, toIdx);
            }

            await commitCheckUpdate(
               () => this.update({
                  system: {
                     check: moveArrayEntry(this.system.check, fromIdx, toIdx),
                  },
               }),
               () => this.sheet?.undoMoveCheck(fromIdx, toIdx),
            );
         }
      }

      /**
       * Inserts a copy of a Check (from this or another document) with a fresh uuid, seeding its expansion state.
       * @param {object} element - The check data to copy in.
       * @param {number} atIdx - The insertion point.
       * @returns {Promise<void>}
       */
      async insertCheck(element, atIdx) {
         if (assert(
            this.isOwner,
            'Cannot modify document %s if not owner.',
            this.name,
         )) {
            /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
            const next = this.system.check.slice();
            next.splice(atIdx, 0, cloneElementWithNewUuid(element));

            // Seed expansion state for the inserted row before the reactive re-render.
            if (this.sheet) {
               this.sheet.postInsertCheck(atIdx);
            }

            await commitCheckUpdate(
               () => this.update({
                  system: {
                     check: next,
                  },
               }),
               () => this.sheet?.undoInsertCheck(atIdx),
            );
         }
      }
   };
}
