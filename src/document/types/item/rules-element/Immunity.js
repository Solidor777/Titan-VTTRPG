import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import { CONDITION_IDS } from '~/system/Conditions.js';

/**
 * A Rules Element making a Character immune to a condition or to an effect. While it applies, creating a matching
 * condition or effect on the Character is refused, and an existing one is removed or suppressed as the Immunity
 * Handling setting chooses: Remove (the default) deletes it, except that effects each immune to another in a ring
 * stay suppressed; Suppress keeps it until the immunity ends, its modifiers stop applying, and immunities it grants
 * still apply. An immunity never covers the effect granting it.
 * @typedef {object} ImmunityElement
 * @property {string} operation - The operation to be performed by the Rules Element (immunity).
 * @property {string} selector - What the immunity blocks: 'condition' or 'effect'.
 * @property {string} key - A condition id (condition selector), or an effect name matched in camel case (effect
 * selector).
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * What an immunity can block, in editor display order.
 * @type {readonly string[]}
 */
export const IMMUNITY_SELECTORS = Object.freeze([
   'condition',
   'effect',
]);

/**
 * Creates an empty set of immunities: one Map per immunity selector, each mapping a key (a condition id, or a
 * camel-case effect name) to the sources granting that immunity. Every immunities object is built here, so the
 * selector list has one source.
 * @returns {Record<string, Map<string, {id: string, name: string}[]>>} The empty immunities, keyed by
 * IMMUNITY_SELECTORS; each source is the granting document's id and name.
 */
export function createEmptyImmunities() {
   return Object.fromEntries(IMMUNITY_SELECTORS.map((selector) => [
      selector,
      new Map(),
   ]));
}

/**
 * Creates a Rules Element making a Character immune to a condition.
 * @param {object} [options] - Options for the rules element.
 * @param {string} [options.uuid] - The uuid to keep (the element being replaced).
 * @returns {ImmunityElement} The new Rules Element.
 */
export default function createImmunityElement(options) {
   return {
      operation: 'immunity',
      selector: 'condition',
      key: CONDITION_IDS[0],
      uuid: options?.uuid ?? generateUUID(),
   };
}
