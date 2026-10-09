/**
 * Mixin that adds the check-list notifications to a sheet class. `CheckListMixin` (the document side) calls these
 * methods on `document.sheet` when it changes a check; each forwards to the sheet's `applicationState`, which keeps the
 * per-check expansion state aligned with the `system.check` array and takes a change back when its update does not
 * commit. INVARIANT: the sheet's `applicationState` provides `postAddCheck`, `preDeleteCheck`, `postMoveCheck`,
 * `postInsertCheck`, `undoDeleteCheck`, `undoMoveCheck` and `undoInsertCheck` (`TitanItemSheetState.js`).
 * @param {typeof import('~/document/sheet/TitanDocumentSheet.js').default} BaseClass - The sheet class to extend.
 * @returns {typeof import('~/document/sheet/TitanDocumentSheet.js').default} The extended class.
 */
export default function CheckListSheetMixin(BaseClass) {
   return class CheckListSheet extends BaseClass {

      /**
       * Called after a Check is added to this Sheet's document.
       * @returns {void}
       */
      postAddCheck() {
         this.applicationState.postAddCheck();
      }

      /**
       * Called before a Check is deleted from this Sheet's document.
       * @param {number} idx - The index of the Check about to be deleted.
       * @returns {import('~/document/types/item/sheet/TitanItemSheetState.js').CheckExpansionEntry|undefined} The
       * expansion flags removed with the check, or undefined when no check is at the index.
       */
      preDeleteCheck(idx) {
         return this.applicationState.preDeleteCheck(idx);
      }

      /**
       * Called after a Check is reordered, to keep per-check expansion state aligned.
       * @param {number} fromIdx - The check's previous index.
       * @param {number} toIdx - The insertion point it moved before.
       * @returns {void}
       */
      postMoveCheck(fromIdx, toIdx) {
         this.applicationState.postMoveCheck(fromIdx, toIdx);
      }

      /**
       * Called after a copied Check is inserted, to seed its expansion state.
       * @param {number} atIdx - The insertion point.
       * @returns {void}
       */
      postInsertCheck(atIdx) {
         this.applicationState.postInsertCheck(atIdx);
      }

      /**
       * Called when a Check delete did not commit, to put back the expansion flags `preDeleteCheck` removed.
       * @param {number} idx - The index of the Check that was to be deleted.
       * @param {import('~/document/types/item/sheet/TitanItemSheetState.js').CheckExpansionEntry} removed - The flags
       * `preDeleteCheck` returned.
       * @returns {void}
       */
      undoDeleteCheck(idx, removed) {
         this.applicationState.undoDeleteCheck(idx, removed);
      }

      /**
       * Called when a Check reorder did not commit, to move the expansion flags back.
       * @param {number} fromIdx - The `fromIdx` given to `postMoveCheck`.
       * @param {number} toIdx - The `toIdx` given to `postMoveCheck`.
       * @returns {void}
       */
      undoMoveCheck(fromIdx, toIdx) {
         this.applicationState.undoMoveCheck(fromIdx, toIdx);
      }

      /**
       * Called when a copied Check insert did not commit, to remove the expansion flags `postInsertCheck` added.
       * @param {number} atIdx - The `atIdx` given to `postInsertCheck`.
       * @returns {void}
       */
      undoInsertCheck(atIdx) {
         this.applicationState.undoInsertCheck(atIdx);
      }
   };
}
