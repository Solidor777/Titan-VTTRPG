import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';

/**
 * @typedef {object} SpellAspectCostResult
 * Index-aligned per-aspect results plus the spell-level totals derived from them.
 * @property {number[]} aspectCosts - The computed cost of each standard aspect.
 * @property {boolean[]} enabled - Whether each standard aspect is enabled.
 * @property {(number|undefined)[]} scalingCosts - Each aspect's `scalingCost` setting, or `undefined`
 * when the aspect has none.
 * @property {number} totalAspectCost - The sum of every enabled standard aspect's cost plus every
 * custom aspect's cost.
 * @property {number} difficulty - The suggested casting check difficulty derived from the total cost.
 * @property {number} complexity - The suggested casting check complexity derived from the total cost.
 */

/**
 * Computes the cost of a Spell's standard and custom Aspects, and the difficulty/complexity a casting
 * check should auto-calculate to. Pure: reads only `SpellAspects.js`, touches no documents.
 * @param {object[]} aspects - The Spell's standard aspect entries (`aspect.label` keys into
 * `SpellAspects`).
 * @param {object[]} customAspects - The Spell's custom aspect entries, each carrying its own `cost`.
 * @returns {SpellAspectCostResult} The per-aspect and spell-level cost results.
 */
export default function calculateSpellAspectCosts(aspects, customAspects) {
   /** @type {number[]} */
   const aspectCosts = [];

   /** @type {boolean[]} */
   const enabled = [];

   /** @type {(number|undefined)[]} */
   const scalingCosts = [];

   // Total cost across every enabled standard aspect and every custom aspect.
   let totalAspectCost = 0;

   // For each standard aspect.
   for (const aspect of aspects) {
      const aspectSettings = SpellAspects[aspect.label];
      const settings = aspectSettings.settings;
      const template = aspectSettings.template;

      // The aspect is disabled if it requires an option and has no options set.
      if (settings?.requireOption && aspect.option.length === 0 && !aspect.allOptions) {
         enabled.push(false);
         aspectCosts.push(0);
         scalingCosts.push(settings?.scalingCost);
         continue;
      }

      // Otherwise, the aspect is enabled.
      enabled.push(true);

      // Calculate the cost of the aspect.
      let aspectCost = template.cost;
      if (settings) {

         // Initial value cost.
         if (settings.initialValueCosts) {
            aspectCost = settings.initialValueCosts[aspect.initialValue];
         }

         // Unit Cost.
         if (settings.unitCosts) {
            aspectCost = settings.unitCosts[aspect.unit];
         }

         // Add option costs.
         // All options.
         if (aspect.allOptions && settings.allOptionsCost) {
            aspectCost += settings.allOptionsCost;
         }

         // Add the cost for each option when the cost of each option is the same.
         else if (settings.optionCost) {
            aspectCost += settings.optionCost * aspect.option.length;
         }

         // Add the cost for each selected option when the cost of each option is different.
         else if (settings.optionCosts) {
            for (const option of aspect.option) {
               aspectCost += settings.optionCosts[option];
            }
         }
      }

      // Halve the cost if the aspect has a Resistance Check.
      if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
         aspectCost = Math.max(Math.floor(aspectCost / 2), 1);
      }

      aspectCosts.push(aspectCost);
      scalingCosts.push(settings?.scalingCost);
      totalAspectCost += aspectCost;
   }

   // Add the cost of each custom aspect.
   for (const customAspect of customAspects) {
      totalAspectCost += customAspect.cost;
   }

   // Calculate suggested complexity and difficulty.
   let difficulty = totalAspectCost;
   let complexity = 1;
   if (difficulty > 5) {
      complexity = totalAspectCost - 4;
      difficulty = 5;
   }
   else {
      difficulty = Math.max(difficulty, 4);
   }

   return {
      aspectCosts,
      enabled,
      scalingCosts,
      totalAspectCost,
      difficulty,
      complexity,
   };
}
