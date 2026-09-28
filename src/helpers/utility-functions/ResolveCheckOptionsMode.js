/**
 * The choices the `getCheckOptions` setting offers.
 * @type {readonly string[]}
 */
const CHECK_OPTIONS_MODES = Object.freeze([
   'never',
   'situational',
   'always',
]);

/**
 * Resolves the stored `getCheckOptions` value to one of its choices. Client storage can hold a Boolean for this
 * setting, and a String-typed setting returns a stored Boolean as its JSON text: `true` (or `'true'`) maps to
 * `always`, and every other value outside the three choices — `false`, `'false'`, `undefined`, or an unknown string —
 * maps to the default `situational`, so a caller always receives a valid choice.
 * @param {*} value - The stored setting value.
 * @returns {string} The check-options mode: `never`, `situational`, or `always`.
 */
export default function resolveCheckOptionsMode(value) {
   if (value === true || value === 'true') {
      return 'always';
   }

   return CHECK_OPTIONS_MODES.includes(value) ? value : 'situational';
}
