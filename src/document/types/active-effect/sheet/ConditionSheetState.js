import { writable } from 'svelte/store';
import createConditionSheetData from '~/document/types/active-effect/sheet/ConditionSheetData.js';

/**
 * @typedef {import('svelte/store').Writable<ConditionSheetData>} ConditionSheetState A reactive store for managing a
 * Condition Active Effect sheet.
 */

/**
 * Creates the reactive state store for a Condition Active Effect sheet.
 * @param {TitanActiveEffect} condition - The condition the sheet state belongs to.
 * @returns {ConditionSheetState} The newly created store.
 */
export default function createConditionSheetState(condition) {
   return writable(createConditionSheetData(condition));
}
