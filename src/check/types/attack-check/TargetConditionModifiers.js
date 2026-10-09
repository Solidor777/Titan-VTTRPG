import localize from '~/helpers/utility-functions/Localize.js';

/**
 * The Difficulty of an attack against an Incapacitated target: the rules fix it at 2.
 * @type {number}
 */
export const INCAPACITATED_TARGET_DIFFICULTY = 2;

/**
 * The farthest distance, in spaces, at which an attacker gains the close Prone bonus: the rules grant it for attacking
 * a Prone target within 1 space. The distance is the grid measurement, so under a grid whose diagonals cost more than
 * 1 a diagonal neighbor measures beyond it and gets no bonus.
 * @type {number}
 */
export const PRONE_CLOSE_DISTANCE = 1;

/**
 * The distance step, in spaces, of the far Prone penalty: the rules lower Accuracy for a Prone target at a distance
 * greater than 10 spaces, per 10 spaces.
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
 * The facts of a target that give an attack its condition modifiers, read once so an open dialog keeps them while the
 * modifiers follow the attacker's live ratings.
 * @typedef {object} TargetFacts
 * @property {number|null} distance - The distance from the attacker's token in spaces, or null when it cannot be
 * measured.
 * @property {string[]} statuses - The target's active condition ids.
 */

/**
 * Computes the modifiers an attack takes from its target's conditions.
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
 * Omits the modifiers of an attacker rating that was supplied: the supplied value replaces the derived rating, bonus
 * included, so the list never carries a modifier the value does not.
 * @param {TargetConditionModifier[]} modifiers - The modifiers of both ratings and the Difficulty.
 * @param {object} supplied - The ratings supplied.
 * @param {number} [supplied.attackerAccuracy] - The supplied Accuracy; its modifiers are omitted when defined.
 * @param {number} [supplied.attackerMelee] - The supplied Melee; its modifiers are omitted when defined.
 * @returns {TargetConditionModifier[]} The modifiers of the other rating and the Difficulty.
 */
export function omitSuppliedRatingModifiers(modifiers, { attackerAccuracy, attackerMelee }) {
   return modifiers.filter((modifier) =>
      !(modifier.modifier === 'melee' && attackerMelee !== undefined) &&
      !(modifier.modifier === 'accuracy' && attackerAccuracy !== undefined));
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
