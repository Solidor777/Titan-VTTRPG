import { FLAT_MODIFIER } from './fixtureConstants.js';

/**
 * Builds a minimal player actor create-payload.
 * @param {string} name - The actor name.
 * @returns {object} An `Actor.create` payload.
 */
export function buildPlayerActorData(name) {
   return {
      name: name,
      type: 'player',
   };
}

/**
 * Builds a weapon item create-payload carrying a single flatModifier rules element with a known value.
 * The element targets the Body attribute so a derived-stat assertion can check the exact delta.
 * @param {string} name - The item name.
 * @returns {object} An `Item.create` payload.
 */
export function buildFlatModifierItemData(name) {
   return {
      name: name,
      type: 'weapon',
      system: {
         // Field key `rulesElement` and element shape confirmed against RulesElementMixin + FlatModifier.js.
         rulesElement: [
            {
               operation: 'flatModifier',
               selector: FLAT_MODIFIER.selector,
               key: FLAT_MODIFIER.key,
               value: FLAT_MODIFIER.value,
               uuid: 'e2e-flatmod-0000',
            },
         ],
      },
   };
}
