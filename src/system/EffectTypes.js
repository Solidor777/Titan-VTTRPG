/** @type {string} The Active Effect subtype for TITAN's effects (duration, checks, rules elements). */
export const EFFECT_TYPE = 'effect';

/** @type {string} The Active Effect subtype for TITAN's conditions. */
export const CONDITION_TYPE = 'condition';

/** @type {string} Core's own Active Effect subtype, stored for third parties and read by core only. */
export const BASE_TYPE = 'base';

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

/**
 * Tests whether an Active Effect is core's `base` subtype, which carries none of TITAN's fields. Its row shows only
 * what core's effect data holds (name, image, `disabled`, `description`) and opens core's default effect sheet.
 * @param {{type: string}} effect - The Active Effect.
 * @returns {boolean} True for a `base` effect.
 */
export function isBaseEffect(effect) {
   return effect.type === BASE_TYPE;
}

/**
 * Tests whether an effect list shows an Active Effect: every TITAN effect or condition and every `base` effect. A row
 * of a `base` effect reads no TITAN field, so a reader of TITAN data tests isTitanEffect instead.
 * @param {{type: string}} effect - The Active Effect.
 * @returns {boolean} True for an `effect`, `condition` or `base` subtype.
 */
export function isListedEffect(effect) {
   return isTitanEffect(effect) || isBaseEffect(effect);
}
