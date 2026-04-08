import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Ratings. */
export const RATINGS = deepFreeze([
   'awareness',
   'defense',
   'melee',
   'accuracy',
   'initiative',
]);
