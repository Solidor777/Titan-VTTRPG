import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Recursively collects every string value in an object into a list of [keyPath, value] pairs.
 * @param {object} object - The object to walk.
 * @param {string} [prefix] - The accumulated key path.
 * @returns {Array<[string, string]>} The [keyPath, value] pairs for every string leaf.
 */
function collectStringValues(object, prefix = '') {
   /** @type {Array<[string, string]>} The accumulated string leaves. */
   const pairs = [];
   for (const [key, value] of Object.entries(object)) {
      /** @type {string} The dotted key path for this leaf. */
      const keyPath = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
         pairs.push([keyPath, value]);
      }
      else if (value && typeof value === 'object') {
         pairs.push(...collectStringValues(value, keyPath));
      }
   }

   return pairs;
}

describe('en.json localization values', () => {
   it('contains no value that is itself a LOCAL. key (double-localization)', () => {
      /** @type {object} The parsed English localization file. */
      const lang = JSON.parse(
         readFileSync(path.resolve(__dirname, '../../lang/en.json'), 'utf-8'),
      );

      /** @type {Array<[string, string]>} Every [keyPath, value] string leaf. */
      const pairs = collectStringValues(lang);

      /** @type {string[]} The offending "keyPath -> value" descriptions. */
      const offenders = pairs
         .filter(([, value]) => value.includes('LOCAL.'))
         .map(([keyPath, value]) => `${keyPath} -> ${value}`);

      expect(offenders, `Values containing 'LOCAL.':\n${offenders.join('\n')}`).toEqual([]);
   });
});
