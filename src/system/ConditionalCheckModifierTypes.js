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
 * The cached conditional check modifiers each check type sums: the element check types it reads (`any` and its own)
 * and, under each, the selectors it matches. `any` and `multiAttack` cache one sum (`any` always applies,
 * `multiAttack` only to a multi-attack); every other selector caches a sum per key, matched against the check's value.
 * A Resistance Check has no Attribute or Skill, so of the `any` check type it reads only the `any` selector. Attribute
 * Checks have no check type of their own in the editor, so they read only `any`.
 * @type {Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>}
 */
export const CHECK_TYPE_CONDITIONAL_SELECTORS = Object.freeze({
   attack: Object.freeze({
      any: Object.freeze([
         'any',
         'attribute',
         'skill',
         'customTrait',
      ]),
      attack: Object.freeze([
         'any',
         'attribute',
         'skill',
         'attackType',
         'attackTrait',
         'customTrait',
         'multiAttack',
      ]),
   }),
   attribute: Object.freeze({
      any: Object.freeze([
         'any',
         'attribute',
         'skill',
      ]),
   }),
   casting: Object.freeze({
      any: Object.freeze([
         'any',
         'attribute',
         'skill',
         'customTrait',
      ]),
      casting: Object.freeze([
         'any',
         'attribute',
         'skill',
         'spellTradition',
         'customTrait',
      ]),
   }),
   item: Object.freeze({
      any: Object.freeze([
         'any',
         'attribute',
         'skill',
         'customTrait',
      ]),
      item: Object.freeze([
         'any',
         'attribute',
         'skill',
         'customTrait',
      ]),
   }),
   resistance: Object.freeze({
      any: Object.freeze(['any']),
      resistance: Object.freeze([
         'any',
         'resistance',
      ]),
   }),
});

/**
 * The check types the rules-element editor offers a conditional check modifier, as select options in display order.
 * `any` targets every check; Attribute Checks read only `any`, so they have no option of their own. A unit test pins
 * the values to the element check types CHECK_TYPE_CONDITIONAL_SELECTORS reads.
 * @type {ReadonlyArray<Readonly<{label: string, value: string}>>}
 */
export const CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS = Object.freeze([
   Object.freeze({
      label: 'anyCheck',
      value: 'any',
   }),
   Object.freeze({
      label: 'attackCheck',
      value: 'attack',
   }),
   Object.freeze({
      label: 'castingCheck',
      value: 'casting',
   }),
   Object.freeze({
      label: 'itemCheck',
      value: 'item',
   }),
   Object.freeze({
      label: 'resistanceCheck',
      value: 'resistance',
   }),
]);

/**
 * The selectors the rules-element editor offers under each element check type, in display order. A unit test pins
 * each list to the selectors CHECK_TYPE_CONDITIONAL_SELECTORS reads under that check type, plus `situation` (cached
 * apart from the summed cells), so the editor offers every selector a check reads and nothing else.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS = Object.freeze({
   any: Object.freeze([
      'any',
      'attribute',
      'skill',
      'customTrait',
      'situation',
   ]),
   attack: Object.freeze([
      'any',
      'attribute',
      'attackTrait',
      'attackType',
      'customTrait',
      'multiAttack',
      'skill',
      'situation',
   ]),
   casting: Object.freeze([
      'any',
      'attribute',
      'customTrait',
      'spellTradition',
      'skill',
      'situation',
   ]),
   item: Object.freeze([
      'any',
      'attribute',
      'customTrait',
      'skill',
      'situation',
   ]),
   resistance: Object.freeze([
      'any',
      'resistance',
      'situation',
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
