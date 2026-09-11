import { describe, it, expect } from 'vitest';
import { escapeText, statLine, heading } from '~/spreadsheet/markdown/MarkdownText.js';

describe('escapeText', () => {
   it('escapes a leading # so it cannot read as a heading marker', () => {
      expect(escapeText('#tag')).toBe('\\#tag');
   });

   it('does not escape a # that is not the first character', () => {
      expect(escapeText('a#b')).toBe('a#b');
   });

   it('backslash-escapes the Markdown specials \\ * _ ` [ ]', () => {
      expect(escapeText('\\')).toBe('\\\\');
      expect(escapeText('*')).toBe('\\*');
      expect(escapeText('_')).toBe('\\_');
      expect(escapeText('`')).toBe('\\`');
      expect(escapeText('[')).toBe('\\[');
      expect(escapeText(']')).toBe('\\]');
   });

   it('always escapes +', () => {
      expect(escapeText('2 + 1')).toBe('2 \\+ 1');
      expect(escapeText('+1')).toBe('\\+1');
   });

   it('escapes a - immediately followed by a digit', () => {
      expect(escapeText('-3')).toBe('\\-3');
      expect(escapeText('a-3')).toBe('a\\-3');
   });

   it('does not escape a - not followed by a digit', () => {
      expect(escapeText('a-b')).toBe('a-b');
      expect(escapeText('trailing-')).toBe('trailing-');
   });

   it('escapes every occurrence, not just the first', () => {
      expect(escapeText('*a* *b*')).toBe('\\*a\\* \\*b\\*');
   });

   it('coerces null/undefined to an empty string', () => {
      expect(escapeText(null)).toBe('');
      expect(escapeText(undefined)).toBe('');
   });

   it('leaves ordinary text untouched', () => {
      expect(escapeText('Battle Axe')).toBe('Battle Axe');
   });
});

describe('statLine', () => {
   it('renders a bold label, the value, and a trailing hard break', () => {
      expect(statLine('Value', 135)).toBe('**Value:** 135  ');
   });

   it('renders the value as written, without escaping', () => {
      expect(statLine('Damage', '2 + ES')).toBe('**Damage:** 2 + ES  ');
   });
});

describe('heading', () => {
   it('renders H1 as plain text', () => {
      expect(heading(1, 'Weapons', 'weapons')).toBe('# Weapons {#weapons}');
   });

   it('renders H2 as plain text', () => {
      expect(heading(2, 'Melee Weapons', 'melee-weapons')).toBe('## Melee Weapons {#melee-weapons}');
   });

   it('renders H3 in bold', () => {
      expect(heading(3, 'Fire', 'fire')).toBe('### **Fire** {#fire}');
   });

   it('renders H4 in bold-italic', () => {
      expect(heading(4, 'Battle Axe', 'battle-axe')).toBe('#### ***Battle Axe*** {#battle-axe}');
   });

   it('renders H5 in bold-italic', () => {
      expect(heading(5, 'Slash (Melee)', 'slash-melee')).toBe('##### ***Slash (Melee)*** {#slash-melee}');
   });

   it('escapes heading text', () => {
      expect(heading(4, 'Weighted Gauntlet (+1)', 'weighted-gauntlet-1'))
         .toBe('#### ***Weighted Gauntlet (\\+1)*** {#weighted-gauntlet-1}');
   });

   it('throws for an unsupported level', () => {
      expect(() => heading(6, 'Name', 'name')).toThrow('Unsupported heading level: 6');
      expect(() => heading(0, 'Name', 'name')).toThrow('Unsupported heading level: 0');
   });
});
