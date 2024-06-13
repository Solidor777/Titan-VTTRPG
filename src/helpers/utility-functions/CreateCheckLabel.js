import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Helper function for creating a formatted and localized DC Label for the provided Check.
 * @param {number} difficulty - The minimum roll on a die to achieve a Success.
 * @param {number} complexity - The minimum number of Successes needed to succeed at the Check.
 * @param {string} stat - Key the for state being used to roll the Check (typically an Attribute or Resistance).
 * @returns {string} A formatted and localized DC Label for the provided Check.
 */
export default function createAttributeCheckLabel(difficulty, complexity, stat) {
   return `${localize(stat)} ${difficulty}:${complexity}`;
}