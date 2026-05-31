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

/**
 * Builds an ability item create-payload carrying one flatModifier rules element per supplied value,
 * each targeting the Body attribute. Abilities apply their rules elements on mere ownership (no equip),
 * making them the simplest fixture for asserting derived-attribute deltas.
 * @param {string} name - The ability name.
 * @param {number[]} values - The flat modifier values; one flatModifier element is created per value.
 * @returns {object} An `Item.create` payload of type `ability`.
 */
export function buildFlatModifierAbilityData(name, values) {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: values.map((value, index) => ({
            operation: 'flatModifier',
            selector: 'attribute',
            key: 'body',
            value: value,
            uuid: `e2e-flatmod-${index}`,
         })),
      },
   };
}
