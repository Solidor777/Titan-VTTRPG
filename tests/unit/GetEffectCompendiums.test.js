import { describe, expect, it } from 'vitest';
import getEffectCompendiums from '../../src/sidebar/tray/GetEffectCompendiums.js';

/**
 * Builds a fake pack-collection entry mimicking a Foundry CompendiumCollection.
 * @param {string} collection - The pack collection id.
 * @param {string} type - The document type the pack holds (e.g. 'ActiveEffect').
 * @param {boolean} visible - Whether the pack is visible to the current user.
 * @param {string} packageType - The owning package type ('system' or 'world').
 * @returns {object} The fake pack.
 */
const pack = (collection, type, visible, packageType) => ({
   collection,
   metadata: {
      type,
      label: collection,
      packageType,
   },
   visible,
});

describe('getEffectCompendiums', () => {
   it('keeps only visible ActiveEffect packs, TITAN (system) first then alphabetical', () => {
      globalThis.game = {
         packs: [
            pack('world.zeffects', 'ActiveEffect', true, 'world'),
            pack('titan.effects', 'ActiveEffect', true, 'system'),
            pack('world.actors', 'Actor', true, 'world'),
            pack('world.hidden', 'ActiveEffect', false, 'world'),
            pack('world.aeffects', 'ActiveEffect', true, 'world'),
         ],
      };
      expect(getEffectCompendiums().map((p) => p.collection))
         .toEqual(['titan.effects', 'world.aeffects', 'world.zeffects']);
   });

   it('returns an empty array when no ActiveEffect packs are visible', () => {
      globalThis.game = {
         packs: [pack('world.actors', 'Actor', true, 'world')],
      };
      expect(getEffectCompendiums()).toEqual([]);
   });
});
