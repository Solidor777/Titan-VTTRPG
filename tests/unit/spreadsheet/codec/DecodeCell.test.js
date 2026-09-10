import { describe, it, expect } from 'vitest';
import { decodeCell, lookupFieldSchema, decodeRow, ABSENT } from '~/spreadsheet/codec/DecodeCell.js';

describe('decodeCell — typed (schema-known) fields', () => {
   const numberField = { type: 'number', nullable: false };
   const stringField = { type: 'string', nullable: false };
   const nullableStringField = { type: 'string', nullable: true };
   const booleanField = { type: 'boolean', nullable: false };

   it('decodes a non-blank value per its declared type', () => {
      expect(decodeCell('5', numberField)).toBe(5);
      expect(decodeCell(5, numberField)).toBe(5);
      expect(decodeCell('true', booleanField)).toBe(true);
      expect(decodeCell(false, booleanField)).toBe(false);
      expect(decodeCell('Sword', stringField)).toBe('Sword');
   });

   it('throws on an unparseable typed value', () => {
      expect(() => decodeCell('not-a-number', numberField)).toThrow();
      expect(() => decodeCell('maybe', booleanField)).toThrow();
   });

   it('decodes a blank cell per nullability/type: null, empty string, or ABSENT', () => {
      expect(decodeCell(undefined, nullableStringField)).toBe(null);
      expect(decodeCell('', nullableStringField)).toBe(null);
      expect(decodeCell(undefined, stringField)).toBe('');
      expect(decodeCell(undefined, numberField)).toBe(ABSENT);
      expect(decodeCell(undefined, booleanField)).toBe(ABSENT);
   });
});

describe('decodeCell — untyped bag (no fieldSchema)', () => {
   it('auto-detects booleans, numbers, and null from CSV text', () => {
      expect(decodeCell('true', undefined)).toBe(true);
      expect(decodeCell('false', undefined)).toBe(false);
      expect(decodeCell('5', undefined)).toBe(5);
      expect(decodeCell('null', undefined)).toBe(null);
      expect(decodeCell('Reach', undefined)).toBe('Reach');
   });

   it('passes through an already-typed XLSX value unchanged', () => {
      expect(decodeCell(5, undefined)).toBe(5);
      expect(decodeCell(true, undefined)).toBe(true);
   });

   it('unwraps a double-quoted cell to force a literal string', () => {
      expect(decodeCell('"5"', undefined)).toBe('5');
      expect(decodeCell('"true"', undefined)).toBe('true');
   });

   it('decodes a blank cell to ABSENT', () => {
      expect(decodeCell(undefined, undefined)).toBe(ABSENT);
      expect(decodeCell('', undefined)).toBe(ABSENT);
   });
});

describe('lookupFieldSchema', () => {
   it('matches a fixed column by its literal name', () => {
      expect(lookupFieldSchema({}, 'sort')).toEqual({ type: 'number', nullable: false });
   });

   it('matches a schema-typed path after normalizing array indices', () => {
      const fieldTypes = { 'system.attack.*.range': { type: 'number', nullable: false } };
      expect(lookupFieldSchema(fieldTypes, 'system.attack.2.range')).toEqual({ type: 'number', nullable: false });
   });

   it('returns undefined for a path with no schema entry', () => {
      expect(lookupFieldSchema({}, 'system.rulesElement.0.value')).toBeUndefined();
   });
});

describe('decodeRow', () => {
   it('decodes every column using its resolved field schema', () => {
      const row = { _id: 'a'.repeat(16), sort: '100000', 'system.value': '5' };
      const fieldTypes = { 'system.value': { type: 'number', nullable: false } };
      expect(decodeRow(row, ['_id', 'sort', 'system.value'], fieldTypes)).toEqual({
         _id: 'a'.repeat(16), sort: 100000, 'system.value': 5,
      });
   });
});
