import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for conditionally modifying a Check made by a Character.
 * @typedef {object} ConditionalCheckModifierElement
 * @property {string} operation - The operation to be performed by the Rules Element (conditionalCheckModifier).
 * @property {string} modifierType - The part of the check to modify (damage, dice, advantage, etc.).
 * @property {string} checkType - The type of check modified (any, attack, casting, item, or resistance).
 * @property {string} selector - The condition for modifying the check (any, attribute, trait, situation, etc.).
 * @property {string} key - The specific result of the condition for modifying the check (body, melee, etc.). For the
 * `situation` selector: the typed situation text for a user situation, or the canonical English string for a system
 * situation.
 * @property {string} [label] - For a system situation, its display text localized for this client; a user situation
 * has none and displays its key.
 * @property {string} [labelKey] - For a system situation, the localization key of its label.
 * @property {string} skill - For the `situation` selector, the one Skill whose checks offer the modifier ('' = any).
 * The editor clears it on any other selector and on Resistance Checks, which use no Skill.
 * @property {number} value - The modifier's amount; for `advantage` its level (±1, ±2); unused by `automaticFailure`.
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * Creates a Rules Element for conditionally modifying a Check made by a Character.
 * @param {object} [options] - Options for the rules element.
 * @returns {ConditionalCheckModifierElement} The new Rules Element.
 */
export default function createConditionalCheckModifierElement(options) {
   return {
      operation: 'conditionalCheckModifier',
      modifierType: 'damage',
      checkType: 'any',
      selector: 'any',
      key: '',
      skill: '',
      value: 1,
      uuid: options?.uuid ?? generateUUID(),
   };
}
