import createCharacterSystemTemplate from '~/document/types/actor/types/character/CharacterSystemTemplate.js';

/**
 * Creates the canonical plain-object shape of an NPC's `system` data, mirroring
 * `NPCDataModel._defineDocumentSchema()`. Built by spreading the shared Character shape template,
 * extending its `bio` sub-shape with a `type` field, then adding the NPC-specific `role` field.
 * @returns {object} The NPC `system` shape template.
 */
export default function createNPCSystemTemplate() {
   const character = createCharacterSystemTemplate();

   return {
      ...character,

      // Extend the shared bio shape with the NPC's type (e.g. beast, humanoid).
      bio: {
         ...character.bio,
         type: '',
      },

      // The NPC's role, governing its resource scaling (minion, warrior, elite, champion).
      role: 'warrior',
   };
}
