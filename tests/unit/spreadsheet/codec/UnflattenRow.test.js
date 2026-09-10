import { describe, it, expect } from 'vitest';
import { unflattenRow, ABSENT } from '~/spreadsheet/codec/UnflattenRow.js';

describe('unflattenRow', () => {
   it('rebuilds nested objects and drops ABSENT leaves entirely', () => {
      expect(unflattenRow({
         name: 'Sword',
         'system.rarity': ABSENT,
         'system.value': 5,
      })).toEqual({ name: 'Sword', system: { value: 5 } });
   });

   it('preserves explicit null and empty-string values', () => {
      expect(unflattenRow({ 'system.equipped.armor': null, name: '' })).toEqual({
         system: { equipped: { armor: null } }, name: '',
      });
   });

   it('rebuilds an array and compacts a gap, dropping a fully-blank element', () => {
      expect(unflattenRow({
         'system.attack.0.label': 'Slash',
         'system.attack.0.damage': 5,
         'system.attack.1.label': ABSENT,
         'system.attack.1.damage': ABSENT,
         'system.attack.2.label': 'Stab',
         'system.attack.2.damage': 3,
      })).toEqual({
         system: {
            attack: [
               { label: 'Slash', damage: 5 },
               { label: 'Stab', damage: 3 },
            ],
         },
      });
   });

   it('treats an element with only blank (null/empty-string) leaves as blank, dropping it', () => {
      expect(unflattenRow({
         'system.attack.0.label': '',
         'system.attack.0.damage': ABSENT,
         'system.attack.1.label': 'Stab',
         'system.attack.1.damage': 3,
      })).toEqual({ system: { attack: [{ label: 'Stab', damage: 3 }] } });
   });

   it('rebuilds nested arrays (trait array inside an attack array)', () => {
      expect(unflattenRow({
         'system.attack.0.label': 'Slash',
         'system.attack.0.trait.0.name': 'Reach',
         'system.attack.0.trait.1.name': ABSENT,
      })).toEqual({ system: { attack: [{ label: 'Slash', trait: [{ name: 'Reach' }] }] } });
   });

   it('returns an empty object for an all-ABSENT input', () => {
      expect(unflattenRow({ name: ABSENT, 'system.rarity': ABSENT })).toEqual({});
   });
});
