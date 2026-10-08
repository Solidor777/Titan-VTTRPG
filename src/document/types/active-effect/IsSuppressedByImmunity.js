/**
 * Decides whether an Active Effect is suppressed by its Character's immunities. Core treats an effect as suppressed
 * when its data model's `isSuppressed` is true, or, when that is undefined, when its duration has expired
 * (`ActiveEffect#isSuppressed`), so returning undefined when not immune leaves core's expiry test in charge. A
 * suppressed effect is inactive (core leaves it out of `actor.statuses`): its modifiers stop applying; immunities it
 * grants still apply. It returns untouched when the immunity ends, and its duration keeps running meanwhile.
 * @param {TitanActiveEffect} effect - The Active Effect.
 * @returns {true|undefined} True while the effect's Character is immune to it; otherwise undefined.
 */
export default function isSuppressedByImmunity(effect) {
   /** @type {object|undefined} The owning document's system data. */
   const system = effect?.parent?.system;
   if (!system?.isCharacter) {
      return undefined;
   }
   return system.getImmunitySources(effect).length > 0 ? true : undefined;
}
