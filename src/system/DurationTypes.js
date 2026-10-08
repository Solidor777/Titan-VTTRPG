/** @type {string} The duration type of an effect that counts down at the end of its bearer's turn. */
export const DURATION_TURN_END = 'turnEnd';

/** @type {string} The duration type of an effect that counts down at the start of its bearer's turn. */
export const DURATION_TURN_START = 'turnStart';

/** @type {string} The duration type of an effect that counts down when combat initiative passes its captured value. */
export const DURATION_INITIATIVE = 'initiative';

/** @type {string} The duration type of an effect that never counts down and never expires. */
export const DURATION_PERMANENT = 'permanent';

/** @type {string} The duration type of an effect whose duration is a free-text label that nothing counts down. */
export const DURATION_CUSTOM = 'custom';

/**
 * Every effect duration type (`system.duration.type` of an `effect` Active Effect), in the order the effect sheet's
 * duration select offers them. The effect sheet header, the compendium source lint and the report tag lint read this
 * list.
 * @type {readonly string[]}
 */
export const DURATION_TYPES = Object.freeze([
   DURATION_TURN_END,
   DURATION_TURN_START,
   DURATION_INITIATIVE,
   DURATION_PERMANENT,
   DURATION_CUSTOM,
]);

/**
 * The duration types that count down on a combatant's turn. The same strings are the `selector` of the turn rules
 * elements (turn message, fast healing, persistent damage), which fire at the matching turn boundary.
 * @type {readonly string[]}
 */
export const TURN_DURATION_TYPES = Object.freeze([
   DURATION_TURN_START,
   DURATION_TURN_END,
]);
