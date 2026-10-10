/** @type {string[]} The turn-produced report types the matrix covers (guarded against the report type directories). */
export const TURN_REPORT_TYPES = [
   'turnStartReport',
   'turnEndReport',
   'turnStartRevertReport',
   'turnEndRevertReport',
   'effectsExpiredReport',
];

/** @type {string[]} The three-valued turn settings the matrix runs through every value (guarded against the source). */
export const TURN_MODE_SETTINGS = [
   'autoApplyFastHealing',
   'autoApplyPersistentDamage',
   'autoRegainResolve',
   'autoRevertFastHealing',
   'autoRevertPersistentDamage',
   'autoRevertResolveRegain',
   'autoRemoveExpiredEffects',
];

/** @type {string[]} The values of every three-valued turn setting. */
export const MODES = [
   'enabled',
   'showButton',
   'disabled',
];

/** @type {string[]} The boolean turn settings the matrix runs both ways (guarded against the source). */
export const TURN_BOOLEAN_SETTINGS = [
   'autoDecreaseEffectDuration',
   'reportEffects',
];
