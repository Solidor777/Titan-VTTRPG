/**
 * The actor-derived field keys each check type's dialog offers. Every key names a field
 * `initialize<Type>CheckOptions` derives from `get<Type>CheckMod` (or, for Automatic Failure, its boolean form)
 * whenever the field is `undefined` in the options handed to it — the same conditional-check-modifier family that
 * changes when an Active Effect or item carrying a `conditionalCheckModifier` rules element is added, edited, or
 * removed. Training does not apply to Resistance Checks; Damage does not apply to Attribute or Resistance Checks;
 * Healing applies only to Casting and Item Checks.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const ACTOR_DERIVED_CHECK_OPTION_FIELDS = Object.freeze({
   attribute: Object.freeze([
      'diceMod',
      'expertiseMod',
      'trainingMod',
      'advantage',
      'automaticFailure',
   ]),
   resistance: Object.freeze([
      'diceMod',
      'expertiseMod',
      'advantage',
      'automaticFailure',
   ]),
   attack: Object.freeze([
      'diceMod',
      'expertiseMod',
      'trainingMod',
      'damageMod',
      'advantage',
      'automaticFailure',
   ]),
   casting: Object.freeze([
      'diceMod',
      'expertiseMod',
      'trainingMod',
      'damageMod',
      'healingMod',
      'advantage',
      'automaticFailure',
   ]),
   item: Object.freeze([
      'diceMod',
      'expertiseMod',
      'trainingMod',
      'damageMod',
      'healingMod',
      'advantage',
      'automaticFailure',
   ]),
});

/**
 * Records that the user edited an actor-derived Check Option field in the dialog, so the shell's re-derivation
 * effect preserves it instead of overwriting it with a value read from the live Actor.
 * @param {Set<string>} touchedFields - The dialog's shared touched-field set (context `'touchedCheckOptionFields'`).
 * @param {string} field - The actor-derived field key the user just edited, e.g. `'advantage'`.
 * @returns {void}
 */
export function touchCheckOptionField(touchedFields, field) {
   touchedFields.add(field);
}

/**
 * Builds the options object to hand to a check's `initialize<Type>CheckOptions`: every field the dialog currently
 * holds, except the check type's actor-derived fields the user has not edited in this dialog, which are omitted so
 * the initializer re-derives them from the live Actor. Fields the user has touched keep their dialog value, since
 * `initialize<Type>CheckOptions` only derives a field when it is `undefined`.
 * @param {object} checkOptions - The dialog's current, fully-resolved Check Options.
 * @param {Set<string>} touchedFields - The actor-derived field keys the user has edited in this dialog.
 * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
 * @returns {object} The options object to pass to `initialize<Type>CheckOptions`.
 */
export default function reinitializeCheckOptions(checkOptions, touchedFields, checkType) {
   /** @type {object} A shallow copy of the current options; untouched derived fields are deleted below. */
   const options = { ...checkOptions };
   for (const field of ACTOR_DERIVED_CHECK_OPTION_FIELDS[checkType] ?? []) {
      if (!touchedFields.has(field)) {
         delete options[field];
      }
   }
   return options;
}

/**
 * Re-derives a check's actor-derived option fields from the live Actor, skipping every field the user has already
 * touched in the dialog. The single shared mechanism every check-type shell's re-derivation effect calls, so
 * "re-derive unless touched" is implemented once rather than once per check type.
 * @param {object} currentOptions - The dialog's current, fully-resolved Check Options, read untracked by the caller
 * so this function's result does not itself retrigger the effect that calls it.
 * @param {Set<string>} touchedFields - The actor-derived field keys the user has edited in this dialog.
 * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
 * @param {(options: object) => object} initialize - The live Actor's bound `initialize<Type>CheckOptions` method.
 * @returns {object|undefined} The re-derived options, or `undefined` if no derived field actually changed (so the
 * caller can skip writing back to the store).
 */
export function rederiveActorCheckOptionFields(currentOptions, touchedFields, checkType, initialize) {
   /** @type {object} The options re-derived from the live Actor. */
   const nextOptions = initialize(reinitializeCheckOptions(currentOptions, touchedFields, checkType));

   /** @type {boolean} Whether any of the check type's actor-derived fields actually changed. */
   const changed = (ACTOR_DERIVED_CHECK_OPTION_FIELDS[checkType] ?? [])
      .some((field) => nextOptions[field] !== currentOptions[field]);

   return changed ? nextOptions : undefined;
}
