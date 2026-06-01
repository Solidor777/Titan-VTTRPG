import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';

/**
 * Builds the static list of TITAN condition definitions for CONFIG.statusEffects. Every condition is the
 * 'condition' Active Effect subtype; the mechanically-active conditions also carry a `system.rulesElement`
 * array expressing their stat effects (applied through the shared rules-element pipeline). This function is
 * pure (no game/localization access) so it can be unit-tested.
 * @returns {object[]} The condition definitions, each with id, name (localization key), img, type, and —
 * for mechanically-active conditions — system.rulesElement.
 */
export function buildConditionDefinitions() {
   return [
      {
         id: 'blinded',
         name: 'LOCAL.blinded.text',
         img: 'icons/svg/blind.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'melee',
                  value: -1,
                  uuid: 'condition-blinded-melee',
               },
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'accuracy',
                  value: -1,
                  uuid: 'condition-blinded-accuracy',
               },
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'defense',
                  value: -1,
                  uuid: 'condition-blinded-defense',
               },
            ],
         },
      },
      {
         id: 'contaminated',
         name: 'LOCAL.contaminated.text',
         img: 'icons/svg/poison.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'flatModifier',
                  selector: 'attribute',
                  key: 'all',
                  value: -1,
                  uuid: 'condition-contaminated-attributes',
               },
               {
                  operation: 'flatModifier',
                  selector: 'resistance',
                  key: 'all',
                  value: -1,
                  uuid: 'condition-contaminated-resistances',
               },
            ],
         },
      },
      {
         id: 'dead',
         name: 'LOCAL.dead.text',
         img: 'icons/svg/skull.svg',
         type: 'condition',
      },
      {
         id: 'deafened',
         name: 'LOCAL.deafened.text',
         img: 'icons/svg/deaf.svg',
         type: 'condition',
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.text',
         img: 'icons/svg/terror.svg',
         type: 'condition',
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.text',
         img: 'icons/svg/paralysis.svg',
         type: 'condition',
      },
      {
         id: 'prone',
         name: 'LOCAL.prone.text',
         img: 'icons/svg/falling.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'mulSum',
                  selector: 'speed',
                  key: 'all',
                  value: 0.5,
                  rounding: 'up',
                  uuid: 'condition-prone-speed',
               },
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'melee',
                  value: -1,
                  uuid: 'condition-prone-melee',
               },
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'accuracy',
                  value: -1,
                  uuid: 'condition-prone-accuracy',
               },
            ],
         },
      },
      {
         id: 'restrained',
         name: 'LOCAL.restrained.text',
         img: 'icons/svg/net.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'melee',
                  value: -1,
                  uuid: 'condition-restrained-melee',
               },
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'accuracy',
                  value: -1,
                  uuid: 'condition-restrained-accuracy',
               },
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'defense',
                  value: -1,
                  uuid: 'condition-restrained-defense',
               },
               {
                  operation: 'setSum',
                  selector: 'speed',
                  key: 'all',
                  value: 0,
                  mode: 'set',
                  uuid: 'condition-restrained-speed',
               },
            ],
         },
      },
      {
         id: 'stunned',
         name: 'LOCAL.stunned.text',
         img: 'icons/svg/stoned.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'flatModifier',
                  selector: 'rating',
                  key: 'defense',
                  value: -1,
                  uuid: 'condition-stunned-defense',
               },
            ],
         },
      },
      {
         id: 'sleeping',
         name: 'LOCAL.sleeping.text',
         img: 'icons/svg/sleep.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'mulSum',
                  selector: 'rating',
                  key: 'awareness',
                  value: 0.5,
                  rounding: 'up',
                  uuid: 'condition-sleeping-awareness',
               },
            ],
         },
      },
      {
         id: 'unconscious',
         name: 'LOCAL.unconscious.text',
         img: 'icons/svg/unconscious.svg',
         type: 'condition',
      },
   ];
}

/**
 * Sets up the system conditions, registering each as a CONFIG.statusEffects entry with its localized
 * description and visual-active-effects content flag.
 * @returns {void}
 */
export default function setupConditions() {
   // Get the static condition definitions.
   const conditions = buildConditionDefinitions();

   // Sort conditions by localized name.
   conditions.sort((a, b) => sortAscending(game.i18n.localize(a.name), game.i18n.localize(b.name)));

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
