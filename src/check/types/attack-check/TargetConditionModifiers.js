import localize from '~/helpers/utility-functions/Localize.js';

/**
 * The Difficulty of an attack against an Incapacitated target. Source: docs/TITAN Rules Compendium - Source -
 * 09_26_2026.md:2158, "The Difficulty to hit an Incapacitated creature is always 2".
 * @type {number}
 */
export const INCAPACITATED_TARGET_DIFFICULTY = 2;

/**
 * The farthest distance, in spaces, at which an attacker gains the close Prone bonus. Source: docs/TITAN Rules
 * Compendium - Source - 09_26_2026.md:2172, "attacking a Prone within 1 space".
 * @type {number}
 */
export const PRONE_CLOSE_DISTANCE = 1;

/**
 * The distance step, in spaces, of the far Prone penalty: beyond it, Accuracy drops per full step. Source: docs/TITAN
 * Rules Compendium - Source - 09_26_2026.md:2174, "a distance greater than 10 spaces" and "per 10 spaces".
 * @type {number}
 */
export const PRONE_FAR_DISTANCE = 10;

/**
 * A modifier an attack takes from its target's conditions.
 * @typedef {object} TargetConditionModifier
 * @property {string} condition - The target's condition id (prone or incapacitated).
 * @property {string} modifier - What it modifies: 'melee' or 'accuracy' (the attacker's rating) or 'difficulty'.
 * @property {number} value - The rating change, or the fixed Difficulty.
 */

/**
 * Computes the modifiers an attack takes from its target's conditions. Source: docs/TITAN Rules Compendium - Source -
 * 09_26_2026.md:2158-2174 (Incapacitated, Prone), with the rounding of section 3 of
 * docs/superpowers/specs/2026-09-27-conditions-rework-design.md.
 * - Prone target within 1 space: Melee and Accuracy each gain ¼ of their base, rounded up (the attack uses one).
 * - Prone target beyond 10 spaces: Accuracy loses ¼ of its base per full 10 spaces, the resulting Accuracy rounded up
 * (so the loss is rounded down), never below 0.
 * - Incapacitated target: the Difficulty is 2.
 * A modifier that rounds to 0 is left out.
 * @param {object} target - The target and attacker values.
 * @param {Set<string>} target.statuses - The target's active condition ids.
 * @param {number|null} target.distance - The distance in spaces, or null when it cannot be measured (no distance
 * modifier applies).
 * @param {{base: number, value: number}} target.melee - The attacker's base and current Melee.
 * @param {{base: number, value: number}} target.accuracy - The attacker's base and current Accuracy.
 * @returns {TargetConditionModifier[]} The modifiers: Prone's before Incapacitated's.
 */
export function getTargetConditionModifiers({ statuses, distance, melee, accuracy }) {
   /** @type {TargetConditionModifier[]} The modifiers found so far, Prone's first. */
   const modifiers = [];
   if (statuses.has('prone') && distance !== null) {
      if (distance <= PRONE_CLOSE_DISTANCE) {
         for (const [modifier, rating] of [
            [
               'melee',
               melee,
            ],
            [
               'accuracy',
               accuracy,
            ],
         ]) {
            /** @type {number} A quarter of the rating's base, rounded up. */
            const bonus = Math.ceil(rating.base * 0.25);
            if (bonus > 0) {
               modifiers.push({
                  condition: 'prone',
                  modifier,
                  value: bonus,
               });
            }
         }
      }
      else if (distance > PRONE_FAR_DISTANCE) {
         /** @type {number} The Accuracy lost: rounded down (the result rounds up), at most the current Accuracy. */
         const penalty = Math.min(
            Math.floor(accuracy.base * 0.25 * Math.floor(distance / PRONE_FAR_DISTANCE)),
            accuracy.value,
         );
         if (penalty > 0) {
            modifiers.push({
               condition: 'prone',
               modifier: 'accuracy',
               value: -penalty,
            });
         }
      }
   }
   if (statuses.has('incapacitated')) {
      modifiers.push({
         condition: 'incapacitated',
         modifier: 'difficulty',
         value: INCAPACITATED_TARGET_DIFFICULTY,
      });
   }
   return modifiers;
}

/**
 * Sums the target-condition modifiers to one of the attacker's ratings.
 * @param {TargetConditionModifier[]} modifiers - The modifiers of both ratings and the Difficulty.
 * @param {string} rating - 'melee' or 'accuracy'.
 * @returns {number} The summed change.
 */
export function sumTargetRatingModifiers(modifiers, rating) {
   return modifiers.filter((modifier) => modifier.modifier === rating)
      .reduce((sum, modifier) => sum + modifier.value, 0);
}

/**
 * Keeps the target-condition modifiers that apply to an attack: its own rating's (Melee for a melee attack, Accuracy
 * otherwise) and the Difficulty.
 * @param {TargetConditionModifier[]} modifiers - The modifiers for both ratings.
 * @param {string} attackType - The attack type (melee or ranged).
 * @returns {TargetConditionModifier[]} The applied modifiers.
 */
export function selectAttackTargetConditions(modifiers, attackType) {
   /** @type {string} The rating the attack uses. */
   const rating = attackType === 'melee' ? 'melee' : 'accuracy';
   return modifiers.filter((modifier) => modifier.modifier === rating || modifier.modifier === 'difficulty');
}

/**
 * Reads the Difficulty a target's conditions fix.
 * @param {TargetConditionModifier[]} modifiers - The modifiers computed for the target; one may fix a Difficulty.
 * @returns {number|null} The fixed Difficulty, or null when none is fixed.
 */
export function getTargetConditionDifficulty(modifiers) {
   return modifiers.find((modifier) => modifier.modifier === 'difficulty')?.value ?? null;
}

/**
 * Labels a target-condition modifier for the dialog and the chat card, localized on this client: "Prone: Melee +2",
 * "Incapacitated: Difficulty 2".
 * @param {TargetConditionModifier} modifier - The modifier to describe.
 * @returns {string} The label: condition, modified stat and value.
 */
export function getTargetConditionModifierLabel(modifier) {
   /** @type {string} The value, signed for a rating change. */
   const value = modifier.modifier !== 'difficulty' && modifier.value > 0 ? `+${modifier.value}` : `${modifier.value}`;
   return `${localize(modifier.condition)}: ${localize(modifier.modifier)} ${value}`;
}
