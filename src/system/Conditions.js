import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';
import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/**
 * Sets up the system conditions.
 */
export default function setupConditions() {
   // Create list of conditions
   const conditions = [
      {
         id: 'blinded',
         name: 'LOCAL.blinded.label',
         icon: 'icons/svg/blind.svg',
      },
      {
         id: 'contaminated',
         name: 'LOCAL.contaminated.label',
         icon: 'icons/svg/poison.svg',
      },
      {
         id: 'dead',
         name: 'LOCAL.dead.label',
         icon: 'icons/svg/skull.svg',
      },
      {
         id: 'deafened',
         name: 'LOCAL.deafened.label',
         icon: 'icons/svg/deaf.svg',
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.label',
         icon: 'icons/svg/terror.svg',
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.label',
         icon: 'icons/svg/paralysis.svg',
      },
      {
         id: 'prone',
         name: 'LOCAL.prone.label',
         icon: 'icons/svg/falling.svg',
      },
      {
         id: 'restrained',
         name: 'LOCAL.restrained.label',
         icon: 'icons/svg/net.svg',
      },
      {
         id: 'stunned',
         name: 'LOCAL.stunned.label',
         icon: 'icons/svg/stoned.svg',
      },
      {
         id: 'sleeping',
         name: 'LOCAL.sleeping.label',
         icon: 'icons/svg/sleep.svg',
      },
      {
         id: 'unconscious',
         name: 'LOCAL.unconscious.label',
         icon: 'icons/svg/unconscious.svg',
      },
   ];

   // Sort conditions by name
   conditions.sort((a, b) => sortAscending(localize(a.label), localize(b.label)));

   // For each condition
   for (const condition of conditions) {

      // Set the description
      const description = localize(`${condition.id}.desc`);

      // Set the flags for visual active effects
      condition.flags = {
         titan: {
            description: description,
            type: 'condition',
         },
         'visual-active-effects.data.content': description,
      };
   }

   // Update the conditions
   CONFIG.statusEffects = deepFreeze(conditions);
}
