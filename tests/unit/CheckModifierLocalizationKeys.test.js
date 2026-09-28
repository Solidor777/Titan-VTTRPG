import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @type {string} This test file's directory. */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.resolve(__dirname, '../../lang/en.json'), 'utf-8'));

/**
 * The flat `LOCAL` keys the Advantage, Automatic Failure, situational-modifier, and check-dialog labels render through,
 * in alphabetical order.
 * @type {string[]}
 */
const LOCAL_KEYS = [
   'advantage.text',
   'automaticFailure.text',
];

describe('check-modifier localization keys', () => {
   it.each(LOCAL_KEYS)('LOCAL defines %s', (key) => {
      expect(lang.LOCAL[key]).toBeTypeOf('string');
      expect(lang.LOCAL[key].length).toBeGreaterThan(0);
   });
});

/**
 * The `SETTINGS.getCheckOptions` entries the setting's name, hint, and three choices render through.
 * @type {string[]}
 */
const CHECK_OPTIONS_SETTING_KEYS = [
   'label',
   'hint',
   'never',
   'situational',
   'always',
];

describe('check-options setting localization keys', () => {
   it.each(CHECK_OPTIONS_SETTING_KEYS)('SETTINGS.getCheckOptions defines %s', (key) => {
      expect(lang.SETTINGS.getCheckOptions[key]).toBeTypeOf('string');
      expect(lang.SETTINGS.getCheckOptions[key].length).toBeGreaterThan(0);
   });
});
