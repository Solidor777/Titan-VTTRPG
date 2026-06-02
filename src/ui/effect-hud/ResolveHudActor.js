/**
 * Resolves which actor's effects the Effect HUD should display, via the user-specified
 * precedence ladder. Players prefer (in order) a selected token that is their assigned
 * character, then a selected token they own, then their assigned character if an owned
 * token of it is on the scene, then any owned token, then their assigned character even
 * with no token. GMs track only the first selected token.
 * @param {object} params - Resolution inputs.
 * @param {boolean} params.isGM - Whether the current user is a GM.
 * @param {Array<Actor>} params.selected - Character actors of selected tokens, in selection order.
 * @param {Array<Actor>} params.owned - Character actors the user owns on the scene, in placeable order.
 * @param {Actor | null} params.assigned - The user's assigned character, or null.
 * @returns {Actor | null} The actor to display, or null if none resolves.
 */
export default function resolveHudActor({ isGM, selected, owned, assigned }) {
   // GMs track only the first selected token.
   if (isGM) {
      return selected[0] ?? null;
   }

   // 1. A selected token that is the assigned character.
   const selectedAssigned = selected.find((actor) => actor.id === assigned?.id);
   if (selectedAssigned) {
      return selectedAssigned;
   }

   // 2. A selected token the user owns.
   const selectedOwned = selected.find((actor) => actor.isOwner);
   if (selectedOwned) {
      return selectedOwned;
   }

   // 3. The assigned character, when the user owns a token of it on the scene.
   if (assigned && owned.some((actor) => actor.id === assigned.id)) {
      return assigned;
   }

   // 4. Any owned token.
   if (owned.length > 0) {
      return owned[0];
   }

   // 5. The assigned character, even with no token on the scene.
   return assigned ?? null;
}
