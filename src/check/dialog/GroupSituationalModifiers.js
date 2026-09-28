import { getAdvantageLabel } from '~/check/ApplyAdvantage.js';
import localize from '~/helpers/utility-functions/Localize.js';
import pushUnique from '~/helpers/utility-functions/PushUnique.js';

/**
 * One checkbox in a check dialog: every situational modifier sharing a key, ticked together.
 * @typedef {object} SituationGroup
 * @property {string} key - The camel-case situation key written to `options.situations`.
 * @property {string} label - The situation's display label.
 * @property {string[]} modifiers - A localized description of each modifier the situation applies.
 * @property {string[]} sources - The names of the items and effects the situation comes from.
 */

/**
 * Describes what one situational modifier does to a check, e.g. "Greater Disadvantage" or "-1 Dice".
 * @param {string} modifierType - One of CONDITIONAL_CHECK_MODIFIER_TYPES.
 * @param {number} value - The modifier's summed value.
 * @returns {string} The localized description.
 */
export function describeSituationalModifier(modifierType, value) {
   switch (modifierType) {
      case 'advantage': {
         return localize(getAdvantageLabel(value));
      }
      case 'automaticFailure': {
         return localize('automaticFailure');
      }
      default: {
         return `${value > 0 ? '+' : ''}${value} ${localize(modifierType)}`;
      }
   }
}

/**
 * Groups a check's situational modifiers by key, one group per dialog checkbox, in first-seen order.
 * @param {SituationalCheckModifier[]} modifiers - The entries `getSituationalCheckModifiers` returned.
 * @returns {SituationGroup[]} The groups.
 */
export default function groupSituationalModifiers(modifiers) {
   /** @type {Map<string, SituationGroup>} The groups keyed by situation key. */
   const groups = new Map();
   for (const modifier of modifiers) {
      /** @type {SituationGroup|undefined} The group for this modifier's key, once started. */
      let group = groups.get(modifier.key);
      if (!group) {
         group = {
            key: modifier.key,
            label: modifier.label,
            modifiers: [],
            sources: [],
         };
         groups.set(modifier.key, group);
      }

      group.modifiers.push(describeSituationalModifier(modifier.modifierType, modifier.value));
      for (const source of modifier.sources) {
         pushUnique(group.sources, source);
      }
   }

   return [...groups.values()];
}
