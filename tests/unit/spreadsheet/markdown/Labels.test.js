import { describe, it, expect } from 'vitest';
import { createLabels, PLURAL_TYPE_LABELS, TYPE_ORDER } from '~/spreadsheet/markdown/Labels.js';

describe('PLURAL_TYPE_LABELS and TYPE_ORDER', () => {
   it('lists the plural/capitalized fallback for every Item pack type', () => {
      expect(PLURAL_TYPE_LABELS).toEqual({
         weapon: [
            'weapons',
            'Weapons',
         ],
         armor: [
            'armor',
            'Armor',
         ],
         shield: [
            'shields',
            'Shields',
         ],
         equipment: [
            'equipment',
            'Equipment',
         ],
         commodity: [
            'commodities',
            'Commodities',
         ],
         ability: [
            'abilities',
            'Abilities',
         ],
         spell: [
            'spells',
            'Spells',
         ],
      });
   });

   it('fixes the type rendering order', () => {
      expect(TYPE_ORDER).toEqual([
         'weapon',
         'armor',
         'shield',
         'equipment',
         'commodity',
         'ability',
         'spell',
      ]);
   });
});

describe('createLabels', () => {
   it('resolves a key present in LOCAL as "<key>.text"', () => {
      const label = createLabels({ LOCAL: { 'body.text': 'Body' } });
      expect(label('body')).toBe('Body');
   });

   it('falls back to the key itself when no fallback is given and the key is missing', () => {
      const label = createLabels({ LOCAL: {} });
      expect(label('missingKey')).toBe('missingKey');
   });

   it('falls back to an explicit fallback when the key is missing', () => {
      const label = createLabels({ LOCAL: {} });
      expect(label('missingKey', 'Fallback Text')).toBe('Fallback Text');
   });

   it('treats a missing LOCAL map as an empty map', () => {
      const label = createLabels({});
      expect(label('anything', 'Default')).toBe('Default');
   });

   it('does not fall back when LOCAL holds an empty string for the key', () => {
      const label = createLabels({ LOCAL: { 'empty.text': '' } });
      expect(label('empty', 'Fallback')).toBe('');
   });
});
