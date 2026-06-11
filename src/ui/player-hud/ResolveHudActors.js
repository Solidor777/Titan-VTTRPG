/**
 * Resolves which character actors the Player HUD should display.
 * GMs get all selected characters with no fallback. Players get all selected owned characters
 * (assigned character first when present); with no selection, the single-actor precedence ladder
 * applies: assigned-with-owned-token-on-scene, then first owned token, then the assigned character
 * even with no token.
 * @param {object} params - Resolution inputs.
 * @param {boolean} params.isGM - Whether the current user is a GM.
 * @param {Array<Actor>} params.selected - Character actors of selected tokens, in selection order.
 * @param {Array<Actor>} params.owned - Character actors the user owns on the scene, in placeable order.
 * @param {Actor | null} params.assigned - The user's assigned character, or null.
 * @returns {{actors: Array<Actor>, primary: Actor | null}} The resolved actors and the primary.
 */
export default function resolveHudActors({ isGM, selected, owned, assigned }) {
   /**
    * Wraps an actor list as the resolution result.
    * @param {Array<Actor>} actors - The resolved actors.
    * @returns {{actors: Array<Actor>, primary: Actor | null}} The result shape.
    */
   const result = (actors) => {
      return { actors, primary: actors[0] ?? null };
   };

   // GMs track the selection only.
   if (isGM) {
      return result(selected);
   }

   /** @type {Array<Actor>} The selected characters the user owns, in selection order. */
   const selectedOwned = selected.filter((actor) => actor.isOwner);

   // Players: all selected owned characters, with the assigned character promoted to primary.
   if (selectedOwned.length > 0) {
      /** @type {number} The assigned character's index within the owned selection, or -1. */
      const assignedIdx = selectedOwned.findIndex((actor) => actor.id === assigned?.id);
      if (assignedIdx > 0) {
         selectedOwned.unshift(selectedOwned.splice(assignedIdx, 1)[0]);
      }
      return result(selectedOwned);
   }

   // No selection: the assigned character, when the user owns a token of it on the scene.
   if (assigned && owned.some((actor) => actor.id === assigned.id)) {
      return result([assigned]);
   }

   // No selection: any owned token.
   if (owned.length > 0) {
      return result([owned[0]]);
   }

   // No selection: the assigned character, even with no token.
   return result(assigned ? [assigned] : []);
}
