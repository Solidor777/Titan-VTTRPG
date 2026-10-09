import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import createTitanItemSheetState from '~/document/types/item/sheet/TitanItemSheetState.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';

/**
 * Creates a sheet state whose expansion arrays hold distinct numbers, so a flag that lands on the wrong row shows. The
 * numbers stand in for the expansion booleans: the state only moves entries, it never reads their value.
 * @param {number} count - The number of check rows.
 * @returns {{state: object, tabs: number[], sidebar: number[]}} The state and the starting arrays.
 */
function createState(count) {
   /** @type {number[]} The Checks tab entries. */
   const tabs = Array.from({ length: count }, (value, idx) => idx);

   /** @type {number[]} The sidebar entries, distinct from the tab entries. */
   const sidebar = Array.from({ length: count }, (value, idx) => 100 + idx);
   return {
      state: createTitanItemSheetState(undefined, {
         tabs: { checks: { isExpanded: [...tabs] } },
         sidebar: { checks: { isExpanded: [...sidebar] } },
      }),
      tabs,
      sidebar,
   };
}

describe('the check expansion undo methods of the item sheet state', () => {
   it('undoMoveCheck returns the arrays to their order for every from and to of 1 to 7 rows', () => {
      for (let count = 1; count <= 7; count++) {
         for (let fromIdx = 0; fromIdx < count; fromIdx++) {
            for (let toIdx = 0; toIdx <= count; toIdx++) {
               const { state, tabs, sidebar } = createState(count);
               state.postMoveCheck(fromIdx, toIdx);
               expect(get(state).tabs.checks.isExpanded, `moved ${fromIdx} to ${toIdx} of ${count}`)
                  .toEqual(moveArrayEntry(tabs, fromIdx, toIdx));
               state.undoMoveCheck(fromIdx, toIdx);
               expect(get(state).tabs.checks.isExpanded, `undid ${fromIdx} to ${toIdx} of ${count}`).toEqual(tabs);
               expect(get(state).sidebar.checks.isExpanded, `sidebar ${fromIdx} to ${toIdx} of ${count}`)
                  .toEqual(sidebar);
            }
         }
      }
   });

   it('undoDeleteCheck puts back the flags preDeleteCheck removed, at every index', () => {
      for (let idx = 0; idx < 4; idx++) {
         const { state, tabs, sidebar } = createState(4);
         const removed = state.preDeleteCheck(idx);
         expect(removed, `removed at ${idx}`).toEqual({
            tabs: tabs[idx],
            sidebar: sidebar[idx],
         });
         expect(get(state).tabs.checks.isExpanded, `after the delete at ${idx}`).toHaveLength(3);
         state.undoDeleteCheck(idx, removed);
         expect(get(state).tabs.checks.isExpanded, `tabs at ${idx}`).toEqual(tabs);
         expect(get(state).sidebar.checks.isExpanded, `sidebar at ${idx}`).toEqual(sidebar);
      }
   });

   it('preDeleteCheck at an index with no row changes nothing and returns undefined', () => {
      const { state, tabs, sidebar } = createState(2);
      expect(state.preDeleteCheck(2)).toBeUndefined();
      expect(state.preDeleteCheck(-1)).toBeUndefined();
      expect(get(state).tabs.checks.isExpanded).toEqual(tabs);
      expect(get(state).sidebar.checks.isExpanded).toEqual(sidebar);
   });

   it('undoInsertCheck removes the flags postInsertCheck added, at every index', () => {
      for (let atIdx = 0; atIdx <= 3; atIdx++) {
         const { state, tabs, sidebar } = createState(3);
         state.postInsertCheck(atIdx);
         expect(get(state).tabs.checks.isExpanded, `after the insert at ${atIdx}`).toHaveLength(4);
         state.undoInsertCheck(atIdx);
         expect(get(state).tabs.checks.isExpanded, `tabs at ${atIdx}`).toEqual(tabs);
         expect(get(state).sidebar.checks.isExpanded, `sidebar at ${atIdx}`).toEqual(sidebar);
      }
   });

   it('an undo keeps a flag changed in between', () => {
      const { state } = createState(3);
      const removed = state.preDeleteCheck(0);

      // A toggle made while the update is in flight changes the entry that is now at index 0.
      state.update((data) => {
         data.tabs.checks.isExpanded[0] = 'toggled';
         return data;
      });
      state.undoDeleteCheck(0, removed);
      expect(get(state).tabs.checks.isExpanded).toEqual([
         0,
         'toggled',
         2,
      ]);
   });
});
