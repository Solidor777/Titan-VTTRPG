import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Speeds. */
export const SPEEDS = deepFreeze([
   'burrow',
   'climb',
   'fly',
   'stride',
   'swim',
]);
