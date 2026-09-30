import { describe, it, expect } from 'vitest';
import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';
import calculateSpellAspectCosts from '~/document/types/item/types/spell/CalculateSpellAspectCosts.js';
import { buildConditionDefinitions } from '~/system/Conditions.js';

/**
 * The conditions the Inflict Condition and Remove Condition spell aspects do not offer. A condition added to
 * `buildConditionDefinitions` fails this file until both aspects offer it (Inflict with a cost) or it is listed here.
 * @type {string[]}
 */
const OMITTED_CONDITIONS = [
   'dead',
   'sleeping',
];

/** @type {string[]} Every condition id, in definition order. */
const CONDITION_IDS = buildConditionDefinitions().map((condition) => condition.id);

/** @type {string[]} The condition ids both spell aspects must offer, in definition order. */
const OFFERED_CONDITIONS = CONDITION_IDS.filter((id) => !OMITTED_CONDITIONS.includes(id));

/**
 * Builds a standard-aspect entry selecting one condition, with no resistance check.
 * @param {string} label - The aspect label (`inflictCondition` or `removeCondition`).
 * @param {string} condition - The selected condition id.
 * @returns {object} The aspect entry, as `calculateSpellAspectCosts` reads it.
 */
function conditionAspect(label, condition) {
   return {
      allOptions: false,
      label,
      option: [condition],
      resistanceCheck: 'none',
   };
}

describe('spell-aspect condition lists', () => {
   it.each(OMITTED_CONDITIONS)('omits %s, which is a defined condition', (id) => {
      expect(CONDITION_IDS).toContain(id);
   });

   it.each([
      'inflictCondition',
      'removeCondition',
   ])('%s offers every condition but the omitted ones, in definition order', (label) => {
      expect(SpellAspects[label].settings.option).toEqual(OFFERED_CONDITIONS);
   });

   it('prices every Inflict Condition option with a positive whole cost, and nothing else', () => {
      /** @type {object} The Inflict Condition settings. */
      const settings = SpellAspects.inflictCondition.settings;
      expect(Object.keys(settings.optionCosts).sort()).toEqual([...settings.option].sort());
      for (const [id, cost] of Object.entries(settings.optionCosts)) {
         expect(Number.isInteger(cost) && cost > 0, `${id} costs ${cost}`).toBe(true);
      }
   });

   it('inflicting Off-Balance costs 3 and removing it costs 2', () => {
      expect(calculateSpellAspectCosts([
         conditionAspect('inflictCondition', 'offBalance'),
         conditionAspect('removeCondition', 'offBalance'),
      ], []).aspectCosts).toEqual([
         3,
         2,
      ]);
   });
});
