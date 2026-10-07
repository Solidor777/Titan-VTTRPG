import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// The turn-start report's condition entries on a bare CharacterDataModel. The model is imported after the Foundry
// stand-ins are installed; dynamic import in beforeAll is permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.Actor;
   delete globalThis.CONST;
});

describe('_getConditionReportData', () => {
   it('lists a condition whose description was edited with that text and no localization key', () => {
      /** @type {object} A bare Character. */
      const model = Object.create(CharacterDataModel.prototype);
      expect(model._getConditionReportData([
         {
            description: '<p>edited text</p>',
            img: 'blinded.svg',
            name: 'Blinded',
            statuses: new Set(['blinded']),
            type: 'condition',
         },
         {
            description: '<p></p>',
            img: 'prone.svg',
            name: 'Prone',
            statuses: new Set(['prone']),
            type: 'condition',
         },
      ])).toEqual([
         {
            description: '<p>edited text</p>',
            img: 'blinded.svg',
            label: 'Blinded',
         },
         {
            descriptionKey: 'prone.desc',
            img: 'prone.svg',
            label: 'Prone',
         },
      ]);
   });

   it('lists conditions by name with their descriptions\' localization keys, never stored text', () => {
      /** @type {object} A bare Character. */
      const model = Object.create(CharacterDataModel.prototype);
      expect(model._getConditionReportData([
         {
            flags: {
               titan: {
                  description: 'stale stored text',
               },
            },
            img: 'prone.svg',
            name: 'Prone',
            statuses: new Set(['prone']),
            type: 'condition',
         },
         {
            flags: {},
            img: 'blinded.svg',
            name: 'Blinded',
            statuses: new Set(['blinded']),
            type: 'condition',
         },
         {
            flags: {},
            img: 'custom.svg',
            name: 'Custom',
            statuses: new Set(['customStatus']),
            type: 'condition',
         },
      ])).toEqual([
         {
            descriptionKey: 'blinded.desc',
            img: 'blinded.svg',
            label: 'Blinded',
         },
         {
            img: 'custom.svg',
            label: 'Custom',
         },
         {
            descriptionKey: 'prone.desc',
            img: 'prone.svg',
            label: 'Prone',
         },
      ]);
   });
});
