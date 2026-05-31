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

/**
 * Builds an ability item create-payload carrying a single mulBase rules element on the Body attribute,
 * optionally followed by flatModifier elements. mulBase adds `base * (value - 1)` to the attribute mod.
 * @param {string} name - The ability name.
 * @param {number} mulValue - The mulBase multiplier value.
 * @param {number[]} [flatValues] - Optional flatModifier values appended after the mulBase element.
 * @returns {object} An `Item.create` payload of type `ability`.
 */
export function buildMulBaseAbilityData(name, mulValue, flatValues = []) {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: [
            {
               operation: 'mulBase',
               selector: 'attribute',
               key: 'body',
               value: mulValue,
               uuid: 'e2e-mulbase-0',
            },
            ...flatValues.map((value, index) => ({
               operation: 'flatModifier',
               selector: 'attribute',
               key: 'body',
               value: value,
               uuid: `e2e-mulbase-flat-${index}`,
            })),
         ],
      },
   };
}

/**
 * Builds the "E2E Roller" actor create-payload: a plain player actor used as the source for every
 * dialog-bypassing `roll<Type>Check` API. Owned items are created separately via
 * {@link buildE2ERollerItemData}.
 * @returns {object} An `Actor.create` payload.
 */
export function buildE2ERollerActorData() {
   return {
      name: 'E2E Roller',
      type: 'player',
   };
}

/**
 * Builds the owned-item create-payloads for the E2E Roller: a weapon (attack check), a spell
 * (casting check), and an ability carrying both an inlined item-check entry (item check) and two
 * flatModifier rules elements that boost Body and Mind by +2 each (so body/mind-based checks roll
 * three dice on a base-1 player). Expertise stays 0 (untrained skills), satisfying the oracle's
 * no-expertise assumption.
 * @returns {object[]} An array of `Item.create` payloads (weapon, spell, ability).
 */
export function buildE2ERollerItemData() {
   return [
      {
         name: 'E2E Weapon',
         type: 'weapon',
      },
      {
         name: 'E2E Spell',
         type: 'spell',
      },
      {
         name: 'E2E Ability',
         type: 'ability',
         system: {
            // A COMPLETE item-check entry mirroring createItemCheckTemplate()
            // (src/check/types/item-check/ItemCheckTemplate.js); omitting fields like opposedCheck
            // makes getItemCheckParameters throw. attribute/skill/label/difficulty/complexity are
            // set for the test; the rest hold template defaults.
            check: [
               {
                  attribute: 'body',
                  complexity: 1,
                  damageReducedBy: 'none',
                  difficulty: 4,
                  initialValue: 1,
                  isDamage: false,
                  isHealing: false,
                  label: 'E2E Check',
                  opposedCheck: {
                     attribute: 'body',
                     enabled: false,
                     skill: 'athletics',
                  },
                  resistanceCheck: 'none',
                  resolveCost: 0,
                  scaling: true,
                  skill: 'arcana',
                  uuid: 'e2e0e2e0-e2e0-4e2e-8e2e-e2e0e2e0e2e0',
               },
            ],
            // Boost Body and Mind to 3 so attribute/attack/casting/item checks roll three dice.
            rulesElement: [
               {
                  operation: 'flatModifier',
                  selector: 'attribute',
                  key: 'body',
                  value: 2,
                  uuid: 'e2e-roller-body-0',
               },
               {
                  operation: 'flatModifier',
                  selector: 'attribute',
                  key: 'mind',
                  value: 2,
                  uuid: 'e2e-roller-mind-0',
               },
            ],
         },
      },
   ];
}
