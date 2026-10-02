import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import assert from '~/helpers/utility-functions/Assert.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';

/**
 * Mixin that adds the mutators of a document's `system.check` array to a document class. Items and Active Effects
 * share the Checks tab (`ItemSheetChecksTab.svelte`), which calls these four methods on its document, so both
 * document classes take them from here. INVARIANT: the document's sheet implements `postAddCheck`, `preDeleteCheck`,
 * `postMoveCheck` and `postInsertCheck`, which keep the per-check expansion state aligned with the array.
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
            this.system.check.push(createItemCheckTemplate());
            await this.update({
               system: {
                  check: structuredClone(this.system.check),
               },
            });

            // Notify the sheet of the added check.
            if (this.sheet) {
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
            if (this.sheet) {
               this.sheet.preDeleteCheck(idx);
            }

            this.system.check.splice(idx, 1);
            await this.update({
               system: {
                  check: structuredClone(this.system.check),
               },
            });
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

            await this.update({
               system: {
                  check: moveArrayEntry(this.system.check, fromIdx, toIdx),
               },
            });
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

            await this.update({
               system: {
                  check: next,
               },
            });
         }
      }
   };
}
