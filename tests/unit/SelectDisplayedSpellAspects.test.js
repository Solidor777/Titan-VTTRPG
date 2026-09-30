import { describe, it, expect } from 'vitest';
import selectDisplayedSpellAspects from '~/document/types/item/types/spell/SelectDisplayedSpellAspects.js';

describe('selectDisplayedSpellAspects', () => {
   it('lists enabled standard aspects, then custom aspects, each with label, localization flag and cost', () => {
      /** @type {object[]} Standard aspects: enabled, disabled, enabled with a unit. */
      const aspects = [
         {
            label: 'damage',
            enabled: true,
            cost: 3,
         },
         {
            label: 'inflictCondition',
            enabled: false,
            cost: 0,
         },
         {
            label: 'duration',
            unit: 'minutes',
            enabled: true,
            cost: 2,
         },
      ];

      /** @type {object[]} Custom aspects. */
      const customAspects = [
         {
            uuid: 'custom-1',
            label: 'My Effect',
            cost: 5,
         },
      ];

      expect(selectDisplayedSpellAspects(aspects, customAspects).map((entry) => ({
         key: entry.key,
         isCustom: entry.isCustom,
         index: entry.index,
         label: entry.label,
         isLocalized: entry.isLocalized,
         cost: entry.cost,
      }))).toEqual([
         {
            key: 'damage',
            isCustom: false,
            index: 0,
            label: 'damage',
            isLocalized: true,
            cost: 3,
         },
         {
            key: 'duration',
            isCustom: false,
            index: 2,
            label: 'minutes',
            isLocalized: true,
            cost: 2,
         },
         {
            key: 'custom-1',
            isCustom: true,
            index: 0,
            label: 'My Effect',
            isLocalized: false,
            cost: 5,
         },
      ]);
   });

   it('indexes each custom aspect within the custom list and keeps their order', () => {
      /** @type {object[]} Three custom aspects. */
      const customAspects = [
         {
            uuid: 'custom-a',
            label: 'First',
            cost: 1,
         },
         {
            uuid: 'custom-b',
            label: 'Second',
            cost: 2,
         },
         {
            uuid: 'custom-c',
            label: 'Third',
            cost: 3,
         },
      ];

      /** @type {object[]} One enabled standard aspect ahead of them. */
      const aspects = [
         {
            label: 'damage',
            enabled: true,
            cost: 4,
         },
      ];

      expect(selectDisplayedSpellAspects(aspects, customAspects).map((entry) => ({
         key: entry.key,
         isCustom: entry.isCustom,
         index: entry.index,
      }))).toEqual([
         {
            key: 'damage',
            isCustom: false,
            index: 0,
         },
         {
            key: 'custom-a',
            isCustom: true,
            index: 0,
         },
         {
            key: 'custom-b',
            isCustom: true,
            index: 1,
         },
         {
            key: 'custom-c',
            isCustom: true,
            index: 2,
         },
      ]);
   });

   it('lists custom aspects when no standard aspect is enabled', () => {
      /** @type {object[]} Standard aspects, all disabled. */
      const aspects = [
         {
            label: 'damage',
            enabled: false,
            cost: 0,
         },
         {
            label: 'range',
            enabled: false,
            cost: 0,
         },
      ];

      /** @type {object[]} Custom aspects. */
      const customAspects = [
         {
            uuid: 'custom-a',
            label: 'Only',
            cost: 2,
         },
         {
            uuid: 'custom-b',
            label: 'Other',
            cost: 3,
         },
      ];

      expect(selectDisplayedSpellAspects(aspects, customAspects).map((entry) => entry.label)).toEqual([
         'Only',
         'Other',
      ]);
      expect(selectDisplayedSpellAspects([], customAspects)).toHaveLength(2);
   });

   it('returns the source aspect objects and an empty list when nothing is enabled', () => {
      /** @type {object} A disabled aspect. */
      const disabled = {
         label: 'damage',
         enabled: false,
         cost: 0,
      };
      expect(selectDisplayedSpellAspects([disabled], [])).toEqual([]);

      /** @type {object} A custom aspect. */
      const custom = {
         uuid: 'c',
         label: 'x',
         cost: 1,
      };
      expect(selectDisplayedSpellAspects([], [custom])[0].aspect).toBe(custom);
   });
});
