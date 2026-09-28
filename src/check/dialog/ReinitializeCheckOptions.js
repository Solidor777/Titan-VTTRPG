import getTargetedCharacters from '~/helpers/utility-functions/GetTargetedCharacters.js';

/**
 * The actor-derived field keys each check type's dialog offers: every field `initialize<Type>CheckOptions` derives
 * from the live Actor whenever it is `undefined` in the options handed to it — `get<Type>CheckMod` (or its boolean
 * form for Automatic Failure) reading `conditionalCheckModifier` rules elements, `_getAttackRatingMod` reading
 * `conditionalRatingModifier` rules elements (Attack's Melee/Accuracy), or `targetDefense`'s no-target self-fallback
 * (mirrors Melee/Accuracy; a real target's Defense, or a caller override, is not actor-derived — see
 * `ACTOR_DERIVED_FIELD_GUARDS`). Training does not apply to Resistance Checks; Damage does not apply to Attribute or
 * Resistance Checks; Healing applies only to Casting and Item Checks.
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
      'attackerMelee',
      'attackerAccuracy',
      'targetDefense',
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
 * Additional per-field eligibility guards beyond the touched-field check. A derived field re-derives when it is
 * untouched AND (if it has a guard here) the guard returns true. `targetDefense` is actor-derived only through its
 * no-target self-fallback (`initializeAttackCheckOptions` mirrors Melee/Accuracy when nothing is targeted); a
 * currently targeted character's Defense is not actor-derived (it belongs to the target, not the roller) and must
 * never be overwritten by this mechanism. `targetDefense` also has ordinary touch tracking (its field component
 * calls `touchCheckOptionField`) — every check-option edit re-runs the re-derivation pass (see `CheckDialogShell`),
 * so without touch tracking the user's own edit to this field would immediately be reverted by that same pass.
 * @type {Readonly<Record<string, () => boolean>>}
 */
const ACTOR_DERIVED_FIELD_GUARDS = Object.freeze({
   targetDefense: () => getTargetedCharacters().length === 0,
});

/**
 * The live Actor's `initialize<Type>CheckOptions` method name for each check type, so a single re-derivation
 * mechanism (`CheckDialogShell.svelte`) can resolve and call the right one without a per-type copy.
 * @type {Readonly<Record<string, string>>}
 */
export const INITIALIZE_CHECK_OPTIONS_METHODS = Object.freeze({
   attribute: 'initializeAttributeCheckOptions',
   resistance: 'initializeResistanceCheckOptions',
   attack: 'initializeAttackCheckOptions',
   casting: 'initializeCastingCheckOptions',
   item: 'initializeItemCheckOptions',
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
 * Seeds the touched-field set from the raw options a caller passed to `request<Type>Check`: a field present there
 * (not `undefined`) was set by the caller, not derived from the Actor, so it must survive dialog mount rather than
 * being overwritten by the first re-derivation pass.
 * @param {Set<string>} touchedFields - The dialog's shared touched-field set, mutated in place.
 * @param {object} [callerOptions] - The raw options object the caller passed to `request<Type>Check`.
 * @returns {void}
 */
export function seedTouchedFieldsFromCallerOptions(touchedFields, callerOptions) {
   for (const [field, value] of Object.entries(callerOptions ?? {})) {
      if (value !== undefined) {
         touchedFields.add(field);
      }
   }
}

/**
 * Builds the options object to hand to a check's `initialize<Type>CheckOptions`: every field the dialog currently
 * holds, except the check type's actor-derived fields the user has not edited in this dialog (and whose guard, if
 * any, allows re-deriving them right now), which are omitted so the initializer re-derives them from the live
 * Actor. Fields the user has touched keep their dialog value, since `initialize<Type>CheckOptions` only derives a
 * field when it is `undefined`.
 * @param {object} checkOptions - The dialog's current, fully-resolved Check Options.
 * @param {Set<string>} touchedFields - The actor-derived field keys the user has edited in this dialog.
 * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
 * @returns {object} The options object to pass to `initialize<Type>CheckOptions`.
 */
export default function reinitializeCheckOptions(checkOptions, touchedFields, checkType) {
   /** @type {object} A shallow copy of the current options; untouched, guard-eligible derived fields are deleted. */
   const options = { ...checkOptions };
   for (const field of ACTOR_DERIVED_CHECK_OPTION_FIELDS[checkType] ?? []) {
      if (!touchedFields.has(field) && (ACTOR_DERIVED_FIELD_GUARDS[field]?.() ?? true)) {
         delete options[field];
      }
   }
   return options;
}

/**
 * Re-derives a check's actor-derived option fields from the live Actor, skipping every field the user has already
 * touched in the dialog. The single shared mechanism the dialog shell's re-derivation effect calls, so "re-derive
 * unless touched" is implemented once rather than once per check type.
 * @param {object} currentOptions - The dialog's current, fully-resolved Check Options.
 * @param {Set<string>} touchedFields - The actor-derived field keys the user has edited in this dialog.
 * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
 * @param {(options: object) => object} initialize - The live Actor's bound `initialize<Type>CheckOptions` method.
 * @returns {object|undefined} The re-derived options, or `undefined` if no derived field actually changed (so the
 * caller can skip writing back to the store — this is also what stops the effect from looping: writing back only on
 * a real change means the next run of an effect that reads the same store settles with `changed === false`).
 */
export function rederiveActorCheckOptionFields(currentOptions, touchedFields, checkType, initialize) {
   /** @type {object} The options re-derived from the live Actor. */
   const nextOptions = initialize(reinitializeCheckOptions(currentOptions, touchedFields, checkType));

   /** @type {boolean} Whether any of the check type's actor-derived fields actually changed. */
   const changed = (ACTOR_DERIVED_CHECK_OPTION_FIELDS[checkType] ?? [])
      .some((field) => nextOptions[field] !== currentOptions[field]);

   return changed ? nextOptions : undefined;
}
