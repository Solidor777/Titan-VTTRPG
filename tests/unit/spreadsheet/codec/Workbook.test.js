import { describe, it, expect } from 'vitest';
import { FIXED_COLUMNS, FIXED_COLUMN_TYPES, normalizePath, createEmptySheet } from '~/spreadsheet/codec/Workbook.js';

describe('Workbook constants and utilities', () => {
   it('lists the fixed leading columns in order', () => {
      expect(FIXED_COLUMNS).toEqual(['_id', '_parentId', '_folder', 'name', 'type', 'img', 'sort']);
   });

   it('gives every fixed column a type entry', () => {
      for (const column of FIXED_COLUMNS) {
         expect(FIXED_COLUMN_TYPES[column]).toBeDefined();
      }
      expect(FIXED_COLUMN_TYPES.sort).toEqual({ type: 'number', nullable: false });
      expect(FIXED_COLUMN_TYPES._parentId).toEqual({ type: 'string', nullable: true });
   });

   it('normalizePath replaces numeric segments with a wildcard', () => {
      expect(normalizePath('system.attack.0.trait.1.name')).toBe('system.attack.*.trait.*.name');
      expect(normalizePath('system.rarity')).toBe('system.rarity');
   });

   it('createEmptySheet builds an empty sheet with the given name', () => {
      expect(createEmptySheet('weapon')).toEqual({ name: 'weapon', columns: [], rows: [] });
   });
});
