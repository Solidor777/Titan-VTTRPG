import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Builds one synthetic situational Conditional Check Modifier element for an armor trait.
 * @param {string} trait - The armor trait imposing the modifier.
 * @param {string} modifierType - The modifier type (advantage or automaticFailure).
 * @param {number} value - The Advantage level, or 1 for Automatic Failure.
 * @param {string} labelKey - The localization key of the situation label.
 * @param {string} skill - The one Skill whose checks offer the modifier ('' = any).
 * @returns {ConditionalCheckModifierElement} The synthetic element.
 */
function createSituationalElement(trait, modifierType, value, labelKey, skill) {
   return {
      checkType: 'any',
      key: localize(labelKey),
      modifierType,
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill,
      uuid: `armor-trait-${trait}-${labelKey}`,
      value,
   };
}

/**
 * Builds the situational check modifiers an equipped armor's traits impose. Source: TITAN Rules Compendium
 * (09_26_2026), lines 2765-2775. Situation keys are localized labels, so traits sharing a situation ("Swim, Fly, or
 * Climb") merge into one dialog entry whose value is their sum. Each situation is narrowed to the Skill its checks use,
 * so it is offered (and opens the dialog) only there: Jumping and Climbing are Body (Athletics) checks (lines 2300,
 * 3150), and remaining undetected is a Stealth check. The rules name no Skill for swimming or flying: narrowing them to
 * Athletics alongside climbing is a design choice, not a rules citation, made because the three share one situation.
 * Heavy's "cannot Jump" is therefore an Automatic Failure offered on Athletics checks.
 * @param {StandardTrait[]} traits - The armor's traits.
 * @returns {ConditionalCheckModifierElement[]} The synthetic elements, in trait order Heavy, Encumbering, Loud.
 */
export default function createArmorTraitCheckModifiers(traits) {
   /** @type {string[]} The names of the armor's traits. */
   const traitNames = traits.map((trait) => trait.name);

   /** @type {ConditionalCheckModifierElement[]} The synthetic elements. */
   const elements = [];
   if (traitNames.includes('heavy')) {
      elements.push(
         createSituationalElement('heavy', 'advantage', -2, 'situationSwimFlyClimb', 'athletics'),
         createSituationalElement('heavy', 'automaticFailure', 1, 'situationJump', 'athletics'),
      );
   }
   if (traitNames.includes('encumbering')) {
      elements.push(createSituationalElement('encumbering', 'advantage', -1, 'situationSwimFlyClimb', 'athletics'));
   }
   if (traitNames.includes('loud')) {
      elements.push(
         createSituationalElement('loud', 'advantage', -1, 'situationRemainUndetectedByHearing', 'stealth'),
      );
   }

   return elements;
}
