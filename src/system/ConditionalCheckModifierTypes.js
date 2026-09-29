/**
 * The values a conditional check modifier's `modifierType` can take. The single source for both the rules-element
 * editor's options and the actor's modifier lookups: the actor caches conditional modifiers under these exact
 * strings, so a lookup under any other string silently finds nothing. `advantage` stores its level (±1 Advantage,
 * ±2 Greater) in `value`; `automaticFailure` ignores `value`.
 * @type {readonly string[]}
 */
export const CONDITIONAL_CHECK_MODIFIER_TYPES = Object.freeze([
   'damage',
   'dice',
   'expertise',
   'training',
   'healing',
   'advantage',
   'automaticFailure',
]);

/**
 * The selectors whose keys the user types free-form (a custom trait name, a spell tradition, a situation label), keyed
 * by the rules-element operation that carries them. The single source for the cache builders in `CharacterDataModel`:
 * typed keys are grouped and matched in camel case, so "Field Medicine" matches "fieldMedicine". A unit test pins each
 * entry to the text inputs of that operation's rules-element editor.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const TYPED_KEY_SELECTORS = Object.freeze({
   conditionalCheckModifier: Object.freeze([
      'customTrait',
      'spellTradition',
      'situation',
   ]),
   conditionalRatingModifier: Object.freeze([
      'customArmorTrait',
      'customShieldTrait',
      'customWeaponTrait',
   ]),
   rollMessage: Object.freeze([
      'customTrait',
      'spellTradition',
   ]),
});

/**
 * The modifier types each check type reads. A situational modifier is offered to a check only for a type it reads (an
 * Attribute Check has no Damage). The rules-element editor filters both selects through this map: a check type's
 * options are the ones that read the element's modifier type, and a modifier type's options are the ones the element's
 * check type reads (`any` reads every type). Attribute Checks read only `any`-check-type modifiers, so the editor has
 * no `attribute` check type.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const CHECK_TYPE_MODIFIER_TYPES = Object.freeze({
   attack: Object.freeze([
      'damage',
      'dice',
      'expertise',
      'training',
      'advantage',
      'automaticFailure',
   ]),
   attribute: Object.freeze([
      'dice',
      'expertise',
      'training',
      'advantage',
      'automaticFailure',
   ]),
   casting: CONDITIONAL_CHECK_MODIFIER_TYPES,
   item: CONDITIONAL_CHECK_MODIFIER_TYPES,
   resistance: Object.freeze([
      'dice',
      'expertise',
      'advantage',
      'automaticFailure',
   ]),
});

/**
 * The check parameter each summable modifier type adds to when a situational modifier is ticked. Automatic Failure is
 * a flag, not a sum, so it has no entry.
 * @type {Readonly<Record<string, string>>}
 */
export const MODIFIER_TYPE_PARAMETER_KEYS = Object.freeze({
   advantage: 'advantage',
   damage: 'damageMod',
   dice: 'diceMod',
   expertise: 'expertiseMod',
   healing: 'healingMod',
   training: 'trainingMod',
});
