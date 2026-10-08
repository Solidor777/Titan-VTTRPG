/** @type {string} The Active Effect subtype for TITAN's effects (duration, checks, rules elements). */
export const EFFECT_TYPE = 'effect';

/** @type {string} The Active Effect subtype for TITAN's conditions. */
export const CONDITION_TYPE = 'condition';

/**
 * The Active Effect subtypes whose system data TITAN defines and reads. Any other registered subtype (core's `base`,
 * stored for third parties) carries none of TITAN's fields, so a TITAN reader of effects tests this list first.
 * @type {readonly string[]}
 */
export const TITAN_EFFECT_TYPES = Object.freeze([
   EFFECT_TYPE,
   CONDITION_TYPE,
]);

/**
 * Tests whether an Active Effect is one TITAN defines and reads.
 * @param {{type: string}} effect - The Active Effect.
 * @returns {boolean} True for an `effect` or `condition` subtype.
 */
export function isTitanEffect(effect) {
   return TITAN_EFFECT_TYPES.includes(effect.type);
}
