import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Roles. */
export const ROLES = deepFreeze([
   'minion',
   'warrior',
   'elite',
   'champion',
]);
