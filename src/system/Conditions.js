import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';

/**
 * Sets up the system conditions.
 */
export default function setupConditions() {
   // Create list of conditions
   const conditions = [
      {
         id: 'blinded',
         name: 'LOCAL.blinded.text',
         icon: 'icons/svg/blind.svg',
      },
      {
         id: 'contaminated',
         name: 'LOCAL.contaminated.text',
         icon: 'icons/svg/poison.svg',
      },
      {
         id: 'dead',
         name: 'LOCAL.dead.text',
         icon: 'icons/svg/skull.svg',
      },
      {
         id: 'deafened',
         name: 'LOCAL.deafened.text',
         icon: 'icons/svg/deaf.svg',
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.text',
         icon: 'icons/svg/terror.svg',
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.text',
         icon: 'icons/svg/paralysis.svg',
      },
      {
         id: 'prone',
         name: 'LOCAL.prone.text',
         icon: 'icons/svg/falling.svg',
      },
      {
         id: 'restrained',
         name: 'LOCAL.restrained.text',
         icon: 'icons/svg/net.svg',
      },
      {
         id: 'stunned',
         name: 'LOCAL.stunned.text',
         icon: 'icons/svg/stoned.svg',
      },
      {
         id: 'sleeping',
         name: 'LOCAL.sleeping.text',
         icon: 'icons/svg/sleep.svg',
      },
      {
         id: 'unconscious',
         name: 'LOCAL.unconscious.text',
         icon: 'icons/svg/unconscious.svg',
      },
   ];

   // Sort conditions by name
   conditions.sort((a, b) => sortAscending(localize(a.name), localize(b.name)));

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
      CONFIG.statusEffects.push(condition);
   }
}
