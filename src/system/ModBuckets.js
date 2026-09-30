/**
 * The modifier buckets every modifiable stat's `mod` object carries besides its persisted `static` bucket, in the order
 * `CharacterDataModel._resetDynamicMods` first adds them. `_applyMods` floors a stat at 0 after each bucket in the
 * object's key order, so this order is part of every stat's value. Each is a rules-element source type the appliers
 * refill on every data preparation.
 * @type {readonly string[]}
 */
export const DYNAMIC_MOD_BUCKETS = Object.freeze([
   'equipment',
   'effect',
   'ability',
   'condition',
]);

/**
 * The localization key labeling each modifier bucket in a stat's breakdown tooltip, in breakdown order (the dynamic
 * buckets, then `static`, the manual modifier).
 * @type {Readonly<Record<string, string>>}
 */
export const MOD_BUCKET_LABELS = Object.freeze({
   equipment: 'equipment',
   effect: 'effects',
   ability: 'abilities',
   condition: 'conditions',
   static: 'temp',
});

/**
 * The buckets a stat's normal value includes: its innate sources, abilities and equipment. A value above or below the
 * base plus these reads as a bonus or penalty (from effects, conditions, or the manual modifier).
 * @type {readonly string[]}
 */
export const INNATE_MOD_BUCKETS = Object.freeze([
   'ability',
   'equipment',
]);

/**
 * Sums a stat's innate modifier buckets.
 * @param {Record<string, number>} [mod] - The stat's `mod` object; a display component may render before it has one.
 * @returns {number} The sum of the stat's INNATE_MOD_BUCKETS (a missing bucket counts 0).
 */
export function getInnateModTotal(mod) {
   return INNATE_MOD_BUCKETS.reduce((sum, bucket) => sum + (mod?.[bucket] ?? 0), 0);
}
