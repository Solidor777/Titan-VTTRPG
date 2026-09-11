import { describe, it, expect } from 'vitest';
import { flattenDocument } from '~/spreadsheet/codec/FlattenDocument.js';

describe('flattenDocument', () => {
   it('flattens top-level scalars and nested objects with dotted paths', () => {
      const source = {
         _id: 'a'.repeat(16),
         name: 'Sword',
         type: 'weapon',
         img: 'icons/sword.svg',
         sort: 100000,
         system: {
            rarity: 'common',
            castingCheck: { difficulty: 4 } 
         },
      };
      expect(flattenDocument(source)).toEqual({
         _id: 'a'.repeat(16),
         name: 'Sword',
         type: 'weapon',
         img: 'icons/sword.svg',
         sort: 100000,
         'system.rarity': 'common',
         'system.castingCheck.difficulty': 4,
      });
   });

   it('flattens arrays with numeric-index segments, including nested arrays', () => {
      const source = {
         system: {
            attack: [
               {
                  label: 'Slash',
                  trait: [{ name: 'Reach' }] 
               },
            ],
         },
      };
      expect(flattenDocument(source)).toEqual({
         'system.attack.0.label': 'Slash',
         'system.attack.0.trait.0.name': 'Reach',
      });
   });

   it('preserves an explicit null value (e.g. an unequipped nullable id field)', () => {
      expect(flattenDocument({ system: { equipped: { armor: null } } })).toEqual({
         'system.equipped.armor': null,
      });
   });

   it('produces no columns for an empty array', () => {
      expect(flattenDocument({ system: { rulesElement: [] } })).toEqual({});
   });

   it('excludes _stats, ownership, items, effects, and folder', () => {
      const source = {
         name: 'Goblin',
         _stats: { compendiumSource: null },
         ownership: { default: 0 },
         folder: 'someFolderId',
         items: [{ name: 'Dagger' }],
         effects: [{ name: 'Poisoned' }],
      };
      expect(flattenDocument(source)).toEqual({ name: 'Goblin' });
   });
});
