import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// The four effect report builders on a bare CharacterDataModel, computing entries from given effect-shaped inputs: the
// fields each entry carries, when the description is included, and the name order. Which entries a live turn report
// marks as suppressed is pinned on live documents (tests/e2e/immunity-display.spec.js). The model is imported after
// the Foundry stand-ins are installed; dynamic import in beforeAll is permitted in tests.

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

/**
 * Builds an effect-shaped input with every duration field set.
 * @param {string} name - The name the effect carries, which also names its image.
 * @param {string} description - The effect's description HTML.
 * @returns {object} The effect-shaped input.
 */
function effect(name, description) {
   return {
      description,
      img: `${name}.webp`,
      name,
      system: {
         duration: {
            custom: 'hours',
            initiative: 12,
            remaining: 2,
            type: 'custom',
         },
      },
      type: 'effect',
   };
}

/**
 * Builds three effects out of name order: one with a description, one with none, one with an empty paragraph.
 * @returns {object[]} The three effects, out of name order.
 */
function effects() {
   return [
      effect('Zeal', '<p>Burning zeal.</p>'),
      effect('Aegis', ''),
      effect('Mist', '<p></p>'),
   ];
}

/**
 * The entries every builder shares for `effects()`, sorted by name, each with the given extra fields.
 * @param {object} extra - The builder's duration fields.
 * @returns {object[]} The entries sorted by name, each carrying the extra fields.
 */
function expectedEntries(extra) {
   return [
      {
         img: 'Aegis.webp',
         label: 'Aegis',
         ...extra,
      },
      {
         img: 'Mist.webp',
         label: 'Mist',
         ...extra,
      },
      {
         description: '<p>Burning zeal.</p>',
         img: 'Zeal.webp',
         label: 'Zeal',
         ...extra,
      },
   ];
}

describe('effect report builders', () => {
   it('_getEffectReportData lists effects by name with a description only when it is not blank', () => {
      /** @type {object} A bare Character. */
      const model = Object.create(CharacterDataModel.prototype);
      expect(model._getEffectReportData(effects())).toEqual(expectedEntries({}));
   });

   it('_getTurnEffectReportData adds the remaining duration', () => {
      /** @type {object} A bare Character. */
      const model = Object.create(CharacterDataModel.prototype);
      expect(model._getTurnEffectReportData(effects())).toEqual(expectedEntries({ remaining: 2 }));
   });

   it('_getInitiativeEffectReportData adds the remaining duration and the initiative', () => {
      /** @type {object} A bare Character. */
      const model = Object.create(CharacterDataModel.prototype);
      expect(model._getInitiativeEffectReportData(effects())).toEqual(expectedEntries({
         initiative: 12,
         remaining: 2,
      }));
   });

   it('_getCustomEffectReportData adds the remaining duration and the custom unit', () => {
      /** @type {object} A bare Character. */
      const model = Object.create(CharacterDataModel.prototype);
      expect(model._getCustomEffectReportData(effects())).toEqual(expectedEntries({
         custom: 'hours',
         remaining: 2,
      }));
   });
});
