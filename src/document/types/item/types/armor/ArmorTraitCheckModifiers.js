import localize from '~/helpers/utility-functions/Localize.js';

/**
 * The canonical source string of each system situation, by localization key. The camel-case form of the string is the
 * situation key on every client, so it never depends on the client's language and equals the key a user-typed situation
 * with the same English text gets. The displayed label is localized separately.
 * @type {Record<string, string>}
 */
const CANONICAL_SITUATIONS = {
   situationJump: 'Jump',
   situationRemainUndetectedByHearing: 'Remain Undetected by Hearing',
   situationSwimFlyClimb: 'Swim, Fly, or Climb',
};

/**
 * Builds one synthetic situational Conditional Check Modifier element for an armor trait. Its `key` is the canonical
 * situation string; `label` is that situation localized for this client, and `labelKey` lets a chat card localize it
 * again for another client.
 * @param {string} trait - The armor trait imposing the modifier.
 * @param {string} modifierType - The modifier type (advantage or automaticFailure).
 * @param {number} value - The Advantage level, or 1 for Automatic Failure.
 * @param {string} labelKey - The localization key of the situation label, and the key of its canonical string.
 * @param {string} skill - The one Skill whose checks offer the modifier ('' = any).
 * @returns {ConditionalCheckModifierElement} The synthetic element.
 */
function createSituationalElement(trait, modifierType, value, labelKey, skill) {
   return {
      checkType: 'any',
      key: CANONICAL_SITUATIONS[labelKey],
      label: localize(labelKey),
      labelKey,
      modifierType,
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill,
      uuid: `armor-trait-${trait}-${labelKey}`,
      value,
   };
}

/**
 * Builds the situational check modifiers an equipped armor's traits impose. Source: TITAN Rules Compendium, "Armor and
 * Shields" (the Encumbering, Loud, and Heavy traits) and "Jumping". Traits sharing a situation ("Swim, Fly, or Climb")
 * share its canonical key, so they merge into one dialog entry whose value is their sum. Each situation is narrowed to
 * the Skill its checks use, so it is offered (and opens the dialog) only there: Jumping (the "Jumping" section) and
 * Climbing (the Athlete ability and the fissure check) are Body (Athletics) checks, and remaining undetected is a
 * Stealth check. The rules name no Skill for swimming or flying: narrowing them to Athletics is a design choice, made
 * because Swim, Fly, and Climb share one situation and an unnarrowed armor situation would open the dialog on every
 * check. Heavy's "cannot Jump" is therefore an Automatic Failure offered on Athletics checks.
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
