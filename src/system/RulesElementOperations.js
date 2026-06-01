import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Rules Element operations. */
export const RULES_ELEMENT_OPERATIONS = deepFreeze([
   'flatModifier',
   'mulBase',
   'mulSum',
   'setSum',
   'fastHealing',
   'persistentDamage',
   'turnMessage',
   'rollMessage',
   'conditionalRatingModifier',
   'conditionalCheckModifier',
]);
