import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Inventory Item Types. */
export const INVENTORY_ITEM_TYPES = deepFreeze([
   'armor',
   'commodity',
   'equipment',
   'shield',
   'weapon',
]);
