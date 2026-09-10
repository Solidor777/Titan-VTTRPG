import createCharacterSystemTemplate from '~/document/types/actor/types/character/CharacterSystemTemplate.js';

/**
 * Creates the canonical plain-object shape of a Player's `system` data, mirroring
 * `PlayerDataModel._defineDocumentSchema()`. Built by spreading the shared Character shape template,
 * then adding the Player-specific fields.
 * @returns {object} The Player `system` shape template.
 */
export default function createPlayerSystemTemplate() {
   return {
      ...createCharacterSystemTemplate(),

      // Experience points: earned total, initial 0. Available XP is computed in prepareDerivedData.
      xp: {
         earned: 0,
      },

      // Whether the Player currently has Inspiration.
      inspiration: false,
   };
}
