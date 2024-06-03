/**
 * Gets the trackable attributes for the Titan system.
 * @returns {object} The trackable attributes for the Titan system..
 */
export default function getTrackableAttributes() {
   return {
      player: getCharacterTrackableAttributes(),
      npc: getCharacterTrackableAttributes(),
   };
}

/**
 * Creates a trackable attributes object for a Character.
 * @returns {object} The newly created trackable attributes object for a Character.
 */
function getCharacterTrackableAttributes() {
   return {
      bar: ['resource.stamina', 'resource.resolve', 'resource.wounds'],
      value: [
         'mod.armor.value', 'rating.awareness.value', 'rating.defense.value', 'rating.melee.value',
         'rating.accuracy.value',
      ],
   };
}
