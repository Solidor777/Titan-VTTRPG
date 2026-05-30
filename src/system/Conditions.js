import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';

/**
 * Sets up the system conditions.
 */
export default function setupConditions() {
   // Create list of conditions.
   const conditions = [
      {
         id: 'blinded',
         name: 'LOCAL.blinded.text',
         img: 'icons/svg/blind.svg',
      },
      {
         id: 'contaminated',
         name: 'LOCAL.contaminated.text',
         img: 'icons/svg/poison.svg',
      },
      {
         id: 'dead',
         name: 'LOCAL.dead.text',
         img: 'icons/svg/skull.svg',
      },
      {
         id: 'deafened',
         name: 'LOCAL.deafened.text',
         img: 'icons/svg/deaf.svg',
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.text',
         img: 'icons/svg/terror.svg',
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.text',
         img: 'icons/svg/paralysis.svg',
      },
      {
         id: 'prone',
         name: 'LOCAL.prone.text',
         img: 'icons/svg/falling.svg',
      },
      {
         id: 'restrained',
         name: 'LOCAL.restrained.text',
         img: 'icons/svg/net.svg',
      },
      {
         id: 'stunned',
         name: 'LOCAL.stunned.text',
         img: 'icons/svg/stoned.svg',
      },
      {
         id: 'sleeping',
         name: 'LOCAL.sleeping.text',
         img: 'icons/svg/sleep.svg',
      },
      {
         id: 'unconscious',
         name: 'LOCAL.unconscious.text',
         img: 'icons/svg/unconscious.svg',
      },
   ];

   // Sort conditions by name.
   conditions.sort((a, b) => sortAscending(localize(a.name), localize(b.name)));

   // For each condition.
   for (const condition of conditions) {

      // Set the description.
      const description = localize(`${condition.id}.desc`);

      // Set the flags for visual active effects.
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
