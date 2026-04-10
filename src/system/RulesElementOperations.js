import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Attack Types. */
export const RULES_ELEMENT_OPERATIONS = deepFreeze([
   'flatModifier',
   'mulBase',
   'fastHealing',
   'persistentDamage',
   'turnMessage',
   'rollMessage',
   'conditionalRatingModifier',
   'conditionalCheckModifier',
]);
