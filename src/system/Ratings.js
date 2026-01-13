import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Ratings. */
export const DEFAULT_SKILL_ATTRIBUTES = deepFreeze([
   'awareness',
   'defense',
   'melee',
   'accuracy',
   'initiative',
]);
