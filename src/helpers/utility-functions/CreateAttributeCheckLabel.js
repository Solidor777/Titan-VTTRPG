import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Helper function for creating a formatted and localized DC Label for the provided Attribute Check.
 * @param {string} attribute - The Attribute to use for the Check.
 * @param {string?} skill - The Skill to use for the Check.
 * @param {number?} difficulty - The minimum roll on a die to achieve a Success, if any.
 * @param {number?} complexity - The minimum number of Successes needed to succeed at the Check, if any.
 * @returns {string} A formatted and localized DC Label for the provided Check.
 */
export default function createAttributeCheckLabel(attribute, skill, difficulty, complexity) {
   // Initialize return value.
   let retVal = (localize(attribute));

   // Add skill if appropriate.
   if (skill && skill !== 'none') {
      retVal += ` (${localize(skill)})`;
   }

   // Add difficulty and complexity if appropriate.
   if (difficulty) {
      retVal += ` ${difficulty}:${complexity ?? 0}`;
   }

   return retVal;
}