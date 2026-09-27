/**
 * The values a conditional check modifier's `modifierType` can take. The single source for both the rules-element
 * editor's options and the actor's modifier lookups: the actor caches conditional modifiers under these exact
 * strings, so a lookup under any other string silently finds nothing.
 * @type {readonly string[]}
 */
export const CONDITIONAL_CHECK_MODIFIER_TYPES = Object.freeze([
   'damage',
   'dice',
   'expertise',
   'training',
   'healing',
]);

/**
 * Conditional check modifier selectors whose keys the user types free-form (a custom trait name, a spell
 * tradition). Their keys are compared in camel case, so "Field Medicine" matches "fieldMedicine".
 * @type {readonly string[]}
 */
export const USER_KEYED_CHECK_MODIFIER_SELECTORS = Object.freeze([
   'customTrait',
   'spellTradition',
]);
