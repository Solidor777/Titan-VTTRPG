/**
 * Gets the trackable attributes for the Titan system.
 * @returns {object} The trackable attributes.
 */
export default function getTrackableAttributes() {
   /**
    *
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

   return {
      player: getCharacterTrackableAttributes(),
      npc: getCharacterTrackableAttributes(),
   };
}
