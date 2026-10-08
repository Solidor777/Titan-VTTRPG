import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DURATION_PERMANENT, DURATION_TURN_END, DURATION_TURN_START } from '~/system/DurationTypes.js';
import getEffectCreationChanges from '~/helpers/utility-functions/GetEffectCreationChanges.js';

/** @type {Readonly<{NEVER: number, CONDITIONAL: number, ALWAYS: number}>} Core's status-icon modes. */
const SHOW_ICON = Object.freeze({
   ALWAYS: 2,
   CONDITIONAL: 1,
   NEVER: 0,
});

beforeAll(() => {
   // Stand-in for core's CONST, which only the Foundry client defines.
   globalThis.CONST = { ACTIVE_EFFECT_SHOW_ICON: SHOW_ICON };
});

afterAll(() => {
   delete globalThis.CONST;
});

/**
 * Builds the fields of a constructed `effect`-subtype Active Effect that the rule reads.
 * @param {object} [fields] - Overrides of the defaults, a running timed effect with a conditional icon.
 * @param {boolean} [fields.disabled] - Whether it is disabled.
 * @param {string} [fields.durationType] - Its duration type.
 * @param {number} [fields.remaining] - Its remaining duration.
 * @param {number} [fields.showIcon] - Its status-icon mode.
 * @returns {object} The effect's fields.
 */
function makeEffect({
   disabled = false,
   durationType = DURATION_TURN_START,
   remaining = 1,
   showIcon = SHOW_ICON.CONDITIONAL,
} = {}) {
   return {
      disabled,
      showIcon,
      system: {
         duration: {
            remaining,
            type: durationType,
         },
      },
      type: 'effect',
   };
}

describe('getEffectCreationChanges', () => {
   it('shows the status icon and disables a timed effect with no time remaining', () => {
      expect(getEffectCreationChanges(makeEffect({ remaining: 0 }))).toEqual({
         disabled: true,
         showIcon: SHOW_ICON.ALWAYS,
      });
   });

   it('enables a timed effect with time remaining, even one stored disabled', () => {
      expect(getEffectCreationChanges(makeEffect({
         disabled: true,
         durationType: DURATION_TURN_END,
         remaining: 2,
         showIcon: SHOW_ICON.ALWAYS,
      }))).toEqual({ disabled: false });
   });

   it('keeps a permanent effect\'s disabled state, a manual toggle', () => {
      expect(getEffectCreationChanges(makeEffect({
         disabled: true,
         durationType: DURATION_PERMANENT,
         remaining: 0,
      }))).toEqual({ showIcon: SHOW_ICON.ALWAYS });
   });

   it('changes nothing on another subtype', () => {
      expect(getEffectCreationChanges({
         showIcon: SHOW_ICON.CONDITIONAL,
         type: 'condition',
      })).toEqual({});
   });
});
