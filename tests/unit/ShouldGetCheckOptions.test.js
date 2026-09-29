import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';
import resolveCheckOptionsMode from '~/helpers/utility-functions/ResolveCheckOptionsMode.js';
import shouldGetCheckOptions from '~/helpers/utility-functions/ShouldGetCheckOptions.js';

vi.mock('~/helpers/utility-functions/IsModifierActive.js', () => ({
   default: vi.fn(),
}));

/** @type {*} The value the stubbed `getCheckOptions` setting returns. */
let storedMode;

beforeEach(() => {
   globalThis.game = {
      settings: {
         get: () => storedMode,
      },
   };
});

afterEach(() => {
   delete globalThis.game;
   vi.mocked(isModifierActive).mockReset();
});

describe('shouldGetCheckOptions', () => {
   it.each([
      {
         mode: 'never',
         situational: false,
         modifier: false,
         dialog: false,
      },
      {
         mode: 'never',
         situational: true,
         modifier: false,
         dialog: false,
      },
      {
         mode: 'never',
         situational: false,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'never',
         situational: true,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'situational',
         situational: false,
         modifier: false,
         dialog: false,
      },
      {
         mode: 'situational',
         situational: true,
         modifier: false,
         dialog: true,
      },
      {
         mode: 'situational',
         situational: false,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'situational',
         situational: true,
         modifier: true,
         dialog: true,
      },
      {
         mode: 'always',
         situational: false,
         modifier: false,
         dialog: true,
      },
      {
         mode: 'always',
         situational: true,
         modifier: false,
         dialog: true,
      },
      {
         mode: 'always',
         situational: false,
         modifier: true,
         dialog: false,
      },
      {
         mode: 'always',
         situational: true,
         modifier: true,
         dialog: true,
      },
   ])('$mode, situational $situational, modifier key $modifier → dialog $dialog', ({
      mode,
      situational,
      modifier,
      dialog,
   }) => {
      storedMode = mode;
      vi.mocked(isModifierActive).mockReturnValue(modifier);
      expect(shouldGetCheckOptions(situational)).toBe(dialog);
   });

   it.each([
      true,
      'true',
   ])('reads a stored %j as always', (stored) => {
      vi.mocked(isModifierActive).mockReturnValue(false);
      storedMode = stored;
      expect(shouldGetCheckOptions(false)).toBe(true);
   });

   it.each([
      false,
      'false',
   ])('reads a stored %j as situational', (stored) => {
      vi.mocked(isModifierActive).mockReturnValue(false);
      storedMode = stored;
      expect(shouldGetCheckOptions(false)).toBe(false);
      expect(shouldGetCheckOptions(true)).toBe(true);
   });
});

describe('resolveCheckOptionsMode', () => {
   it.each([
      {
         value: true,
         mode: 'always',
      },
      {
         value: 'true',
         mode: 'always',
      },
      {
         value: false,
         mode: 'situational',
      },
      {
         value: 'false',
         mode: 'situational',
      },
      {
         value: 'never',
         mode: 'never',
      },
      {
         value: 'situational',
         mode: 'situational',
      },
      {
         value: 'always',
         mode: 'always',
      },
      {
         value: undefined,
         mode: 'situational',
      },
      {
         value: null,
         mode: 'situational',
      },
      {
         value: '',
         mode: 'situational',
      },
      {
         value: 'sometimes',
         mode: 'situational',
      },
      {
         value: 1,
         mode: 'situational',
      },
   ])('$value resolves to $mode', ({ value, mode }) => {
      expect(resolveCheckOptionsMode(value)).toBe(mode);
   });
});
