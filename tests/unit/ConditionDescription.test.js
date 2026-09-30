import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import setupConditions, {
   buildConditionDefinitions,
   findConditionDefinition,
   getConditionDescription,
   getConditionDescriptionKey,
} from '~/system/Conditions.js';

beforeEach(() => {
   // Localization echoes the key with a marker, so a test can tell a localized lookup from stored text.
   globalThis.game = {
      i18n: {
         localize: (key) => `localized ${key}`,
      },
   };
});

afterEach(() => {
   delete globalThis.game;
   delete globalThis.CONFIG;
});

describe('findConditionDefinition', () => {
   it('finds the system condition a single-status effect applies, from a Set or an array', () => {
      expect(findConditionDefinition(new Set(['blinded']))).toEqual(buildConditionDefinitions()
         .find((condition) => condition.id === 'blinded'));
      expect(findConditionDefinition(['prone'])?.id).toBe('prone');
   });

   it('finds nothing for a custom status, several statuses, or none', () => {
      expect(findConditionDefinition(['customStatus'])).toBeUndefined();
      expect(findConditionDefinition([
         'blinded',
         'prone',
      ])).toBeUndefined();
      expect(findConditionDefinition([])).toBeUndefined();
   });
});

describe('getConditionDescriptionKey', () => {
   it('is the localization key of the definition\'s description, whatever the effect stores', () => {
      expect(getConditionDescriptionKey({
         flags: {
            titan: {
               description: 'stale stored text',
            },
         },
         statuses: new Set(['blinded']),
      })).toBe('blinded.desc');
   });

   it('is empty for a missing effect or an effect applying no system condition', () => {
      expect(getConditionDescriptionKey(undefined)).toBe('');
      expect(getConditionDescriptionKey({ statuses: new Set(['customStatus']) })).toBe('');
   });
});

describe('getConditionDescription', () => {
   it('localizes the definition\'s description on this client and ignores a stored description', () => {
      expect(getConditionDescription({
         flags: {
            titan: {
               description: 'stale stored text',
            },
         },
         statuses: new Set(['blinded']),
      })).toBe('localized LOCAL.blinded.desc.text');
   });

   it('is empty for a missing effect or an effect applying no system condition', () => {
      expect(getConditionDescription(undefined)).toBe('');
      expect(getConditionDescription({ statuses: new Set(['customStatus']) })).toBe('');
   });
});

describe('setupConditions', () => {
   it('flags every status effect as a condition and stores no description', () => {
      globalThis.CONFIG = {};
      setupConditions();
      expect(CONFIG.statusEffects.map((condition) => condition.id).sort())
         .toEqual(buildConditionDefinitions().map((condition) => condition.id).sort());
      for (const condition of CONFIG.statusEffects) {
         expect(condition.flags, condition.id).toEqual({
            titan: {
               type: 'condition',
            },
         });
      }
   });
});
