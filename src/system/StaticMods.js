/** @type {string} Flag scope that stores the static modifier visibility. */
export const STATIC_MODS_FLAG_SCOPE = 'titan';

/** @type {string} Flag key that stores whether static modifier inputs are shown. */
export const STATIC_MODS_FLAG_KEY = 'showStaticMods';

/**
 * Reads whether an actor shows its static modifier inputs. A missing actor, scope or flag is hidden.
 * @param {foundry.documents.Actor | null | undefined} actor - The actor to read.
 * @returns {boolean} True only when the flag is the boolean true.
 */
export function areStaticModsShown(actor) {
   return actor?.flags?.[STATIC_MODS_FLAG_SCOPE]?.[STATIC_MODS_FLAG_KEY] === true;
}

/**
 * Stores whether an actor shows its static modifier inputs.
 * @param {foundry.documents.Actor} actor - The actor to update.
 * @param {boolean} shown - True to show the static modifier inputs.
 * @returns {Promise<foundry.documents.Actor>} The updated actor.
 */
export async function setStaticModsShown(actor, shown) {
   return actor.setFlag(STATIC_MODS_FLAG_SCOPE, STATIC_MODS_FLAG_KEY, shown);
}
