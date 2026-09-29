import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';

/**
 * Rebuilds an open check dialog's Check Options from their two sources of truth: the options the caller passed to
 * `request<Type>Check` (`callerOptions`, which for an Attack also carry a target's Defense resolved at open) and the
 * fields the user wrote in the dialog (`userEdits`, recorded by the tracked setter). The live Actor's
 * `initialize<Type>CheckOptions` derives every other field on every pass, so each of its derivation branches (an
 * `undefined` test, a `=== undefined` Complexity or Difficulty, the `'default'` Attribute and Skill sentinels, a read
 * of the owned weapon, spell, item, or effect, and conditional rules elements) follows the Actor with no list of
 * derived fields to maintain. User edits override caller values, and caller values override derivation.
 *
 * Two guards keep the rebuild safe while the dialog is open. A `'default'`-sentinel field the input leaves unset
 * keeps its displayed value when the input is otherwise invalid (e.g. an Attribute Check whose user picked Skill
 * "None" keeps the Attribute the old Skill supplied). An input that stays invalid (its owned weapon, spell, item, or
 * effect is gone) yields no rebuild, so the type shell's own validation decides the dialog's fate.
 *
 * Every value the dialog's store holds is a frozen snapshot that shares nothing with its sources
 * (`freezeCheckOptions`; a data model is snapshotted, never kept by reference), and the dialog's components see the
 * store only as a read-only view, so the tracked setter is the only way a component changes an option.
 */

/**
 * The Check Options functions each check type's rebuild uses: the pure `create<Type>CheckOptions` (whose
 * `'default'` values mark the sentinel fields) and the live Actor's `initialize<Type>CheckOptions` and
 * `validate<Type>CheckOptions` method names.
 * @type {Readonly<Record<string, Readonly<{create: (options: object) => object, initialize: string, validate:
 * string}>>>}
 */
export const CHECK_OPTIONS_METHODS = Object.freeze({
   attribute: Object.freeze({
      create: createAttributeCheckOptions,
      initialize: 'initializeAttributeCheckOptions',
      validate: 'validateAttributeCheckOptions',
   }),
   resistance: Object.freeze({
      create: createResistanceCheckOptions,
      initialize: 'initializeResistanceCheckOptions',
      validate: 'validateResistanceCheckOptions',
   }),
   attack: Object.freeze({
      create: createAttackCheckOptions,
      initialize: 'initializeAttackCheckOptions',
      validate: 'validateAttackCheckOptions',
   }),
   casting: Object.freeze({
      create: createCastingCheckOptions,
      initialize: 'initializeCastingCheckOptions',
      validate: 'validateCastingCheckOptions',
   }),
   item: Object.freeze({
      create: createItemCheckOptions,
      initialize: 'initializeItemCheckOptions',
      validate: 'validateItemCheckOptions',
   }),
});

/**
 * Tests whether a value is plain data: an array, or an object whose prototype is `Object.prototype` or `null`.
 * @param {*} value - The value to test.
 * @returns {boolean} Whether the value is a plain array or object.
 */
function isPlainContainer(value) {
   if (Array.isArray(value)) {
      return true;
   }
   if (value === null || typeof value !== 'object') {
      return false;
   }

   /** @type {object|null} The value's prototype. */
   const prototype = Object.getPrototypeOf(value);
   return prototype === Object.prototype || prototype === null;
}

/**
 * Copies Check Options into an immutable value that shares nothing with its source, so a component holding the
 * dialog's read-only view can change neither the options nor anything they were built from. Every plain array and
 * object (see `isPlainContainer`) is copied with its prototype kept and frozen at every depth. Any other object (a
 * document or data model a caller passed as roll data) is first converted to a plain snapshot, through its
 * `toObject()` when it provides one and otherwise a structured clone, and that snapshot is frozen the same way. A
 * structured clone that is still not plain (e.g. a `Date`) is frozen as the copy it is. Primitives are returned as
 * given.
 * @param {*} value - The options, or a value inside them.
 * @returns {*} The frozen copy.
 */
export function freezeCheckOptions(value) {
   if (Array.isArray(value)) {
      return Object.freeze(value.map(freezeCheckOptions));
   }
   if (value === null || typeof value !== 'object') {
      return value;
   }
   if (!isPlainContainer(value)) {
      /** @type {*} The object's plain snapshot. */
      const snapshot = typeof value.toObject === 'function' ? value.toObject() : structuredClone(value);
      if (isPlainContainer(snapshot)) {
         return freezeCheckOptions(snapshot);
      }

      /** @type {*} A structured clone of a snapshot that is still not plain. */
      const clone = structuredClone(snapshot);
      return isPlainContainer(clone) ? freezeCheckOptions(clone) : Object.freeze(clone);
   }
   return Object.freeze(Object.create(
      Object.getPrototypeOf(value),
      Object.fromEntries(Object.entries(value).map(([key, entry]) => [
         key,
         {
            configurable: true,
            enumerable: true,
            value: freezeCheckOptions(entry),
            writable: true,
         },
      ])),
   ));
}

/**
 * Creates the dialog's one tracked setter for Check Options: it records the write as a user edit, so every later
 * rebuild keeps it, and applies it to the options at once, so the field shows the new value before the rebuild runs.
 * Both stores hold frozen values.
 * @param {import('svelte/store').Writable} checkOptions - The dialog's Check Options store.
 * @param {import('svelte/store').Writable} userEdits - The dialog's user-edit record (field → value).
 * @returns {(field: string, value: *) => void} The setter, provided to the dialog as context `'setCheckOption'`.
 */
export function createCheckOptionSetter(checkOptions, userEdits) {
   return (field, value) => {
      userEdits.update((edits) => freezeCheckOptions({
         ...edits,
         [field]: value,
      }));
      checkOptions.update((options) => freezeCheckOptions({
         ...options,
         [field]: value,
      }));
   };
}

/**
 * Tests two Check Options values for structural equality. Plain arrays and objects (see `isPlainContainer`) are
 * equal when they share a prototype and their own enumerable keys hold structurally equal values; every other value
 * (primitives, documents, data models) is compared with `Object.is`. The rebuild produces fresh `situations` arrays
 * and a fresh Item `itemRollData` on every pass, so an identity test alone would never settle.
 * @param {*} a - The first value.
 * @param {*} b - The second value.
 * @returns {boolean} Whether the values are structurally equal.
 */
function isStructurallyEqual(a, b) {
   if (Object.is(a, b)) {
      return true;
   }
   if (!isPlainContainer(a) || !isPlainContainer(b) || Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      return false;
   }

   /** @type {string[]} The first value's own keys. */
   const keys = Object.keys(a);
   return keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && isStructurallyEqual(a[key], b[key]));
}

/**
 * Pins each `'default'`-sentinel field the rebuild input leaves unset to the value the dialog currently shows.
 * @param {object} input - The rebuild input: the caller's options overlaid with the user's edits.
 * @param {(options: object) => object} create - The check type's `create<Type>CheckOptions`.
 * @param {object} currentOptions - The dialog's current Check Options.
 * @returns {object} A copy of the input with its unset sentinel fields pinned.
 */
function pinSentinelFields(input, create, currentOptions) {
   /** @type {object} The pinned copy of the input. */
   const pinned = { ...input };
   for (const [field, value] of Object.entries(create({}))) {
      if (value === 'default' && (pinned[field] === undefined || pinned[field] === 'default')) {
         pinned[field] = currentOptions[field];
      }
   }
   return pinned;
}

/**
 * @typedef {object} RebuildCheckOptionsArguments
 * @property {string} checkType - The check type: attribute, resistance, attack, casting, or item.
 * @property {object} system - The live Actor's CharacterDataModel.
 * @property {object} [callerOptions] - The options the caller passed to `request<Type>Check`, plus any open-time
 * provenance (an Attack's target Defense).
 * @property {object} userEdits - The fields the user wrote in the dialog (field → value).
 * @property {object} currentOptions - The dialog's current Check Options.
 */

/**
 * Rebuilds a dialog's Check Options from the caller's options and the user's edits, deriving every other field from
 * the live Actor.
 * @param {RebuildCheckOptionsArguments} args - The check type, Actor, sources, and current options.
 * @returns {object|undefined} The rebuilt options, frozen (`freezeCheckOptions`), or `undefined` when they equal the
 * current options (so the dialog's rebuild effect writes nothing and settles) or when the check is no longer valid.
 */
export default function rebuildCheckOptions({ checkType, system, callerOptions, userEdits, currentOptions }) {
   /** @type {{create: (options: object) => object, initialize: string, validate: string}} The type's functions. */
   const methods = CHECK_OPTIONS_METHODS[checkType];

   /** @type {object} The rebuild input: the user's edits over the caller's options. */
   let input = {
      ...callerOptions,
      ...userEdits,
   };

   // Validate silently: an invalid input here is an expected dialog state, not a reportable error.
   if (!system[methods.validate](input, false)) {
      input = pinSentinelFields(input, methods.create, currentOptions);
      if (!system[methods.validate](input, false)) {
         return undefined;
      }
   }

   // Frozen before the compare: the current options are a frozen snapshot, so a caller's data model settles.
   /** @type {object} The options derived from the input and the live Actor, frozen. */
   const rebuilt = freezeCheckOptions(system[methods.initialize](input));
   return isStructurallyEqual(rebuilt, currentOptions) ? undefined : rebuilt;
}
