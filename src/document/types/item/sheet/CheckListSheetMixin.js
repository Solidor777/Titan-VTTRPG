/**
 * Mixin that adds the check-list notifications to a sheet class. `CheckListMixin` (the document side) calls these four
 * methods on `document.sheet` when it changes a check; each forwards to the sheet's `applicationState`, which keeps the
 * per-check expansion state aligned with the `system.check` array. INVARIANT: the sheet's `applicationState` provides
 * `postAddCheck`, `preDeleteCheck`, `postMoveCheck` and `postInsertCheck` (`TitanItemSheetState.js`).
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
       * @returns {void}
       */
      preDeleteCheck(idx) {
         this.applicationState.preDeleteCheck(idx);
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
   };
}
