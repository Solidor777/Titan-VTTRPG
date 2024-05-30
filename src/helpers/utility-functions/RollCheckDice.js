import sort from '~/helpers/utility-functions/Sort.js';

/**
 * A check die that has been processed by applying expertise.
 * @typedef {object} CheckDie
 * @property {number} base The base number that was rolled on the dice.
 * @property {number} expertiseApplied The amount of expertise that was applied to the die.
 * @property {number} final The final number after applying expertise to the base result.
 */

/**
 * Rolls a number of d6s, sorts the results from largest to smallest, and converts them to {@link CheckDie} objects.
 * @param {number} numDie - The number of d6s to roll.
 * @returns {Promise<CheckDie[]>} Array of {@link CheckDie} sorted from largest to smallest, before any expertise is applied.
 */
export default async function rollCheckDice(numDie) {
   const roll = new Roll(`${numDie}d6`);
   await roll.evaluate();
   return roll.terms[0].results.sort((a, b) => sort(a.result, b.result)).map((die) => {
      return {
         expertiseApplied: 0,
         base: die.result,
         final: die.result,
      };
   });
}