/**
 * Gets the immunities suppressing an Active Effect: the sources of its Character's immunities to it. A suppressed
 * effect is inactive (core leaves it out of `actor.statuses`): its modifiers stop applying; immunities it grants still
 * apply. It returns untouched when the immunity ends, and its duration keeps running meanwhile. The sheet's effect
 * rows, the Player HUD effects panel, and the turn reports name these sources.
 * @param {TitanActiveEffect} [effect] - The Active Effect; undefined in a row's mid-deletion frame.
 * @returns {ImmunitySource[]} The sources suppressing it, each once; empty when the effect is missing, its parent
 * is not a Character, or the Character is not immune to it.
 */
export function getSuppressingImmunitySources(effect) {
   /** @type {object|undefined} The owning document's system data. */
   const system = effect?.parent?.system;
   if (!system?.isCharacter) {
      return [];
   }
   return system.getImmunitySources(effect);
}

/**
 * Decides whether an Active Effect is suppressed by its Character's immunities. Core treats an effect as suppressed
 * when its data model's `isSuppressed` is true, or, when that is undefined, when its duration has expired
 * (`ActiveEffect#isSuppressed`), so returning undefined when not immune leaves core's expiry test in charge.
 * @param {TitanActiveEffect} effect - The Active Effect.
 * @returns {true|undefined} True while the effect's Character is immune to it; otherwise undefined.
 */
export default function isSuppressedByImmunity(effect) {
   return getSuppressingImmunitySources(effect).length > 0 ? true : undefined;
}
