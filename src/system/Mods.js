import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Mods. */
export const MODS = deepFreeze([
   'armor',
   'damage',
   'healing',
   'resolveRegain',
   'woundRegain',
]);
