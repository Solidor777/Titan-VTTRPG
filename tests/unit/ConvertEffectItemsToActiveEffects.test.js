import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
   buildEffectData,
   convertActor,
} from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';

// The converter module imports only log/error at module scope, so a static import is safe. The shared test setup
// (tests/setup.js) provides a minimal globalThis.foundry without utils.deepClone, and no ui global; this suite
// installs scoped stand-ins for both (deepClone backs buildEffectData's field copies; ui.notifications.error backs
// the error() helper exercised by the isolation tests) and removes them so later suites keep the shared minimal mock.

/** @type {string[]} - Messages recorded by the ui.notifications.error stand-in (reset after each test). */
const uiErrors = [];

beforeAll(() => {
   // Stand-in for foundry.utils.deepClone, used by buildEffectData to copy the four migrated system fields.
   globalThis.foundry.utils.deepClone = (value) => structuredClone(value);

   // Recording stand-in for the ui global, used by the error() helper on the isolation paths.
   globalThis.ui = {
      notifications: {
         error: (message) => {
            uiErrors.push(message);
         },
      },
   };
});

afterEach(() => {
   // Reset the recorded error messages so assertions never see another test's errors.
   uiErrors.length = 0;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.utils.deepClone;
   delete globalThis.ui;
});

/**
 * Builds a raw legacy effect-Item source entry (the shape of an actor._source.items element).
 * @param {object} [overrides] - Field overrides merged shallowly over the defaults.
 * @returns {object} The raw item source fixture.
 */
function makeLegacyItemSource(overrides = {}) {
   return {
      _id: 'legacyitem000001',
      name: 'Legacy Effect',
      type: 'effect',
      img: 'icons/legacy.webp',
      system: {
         description: '<p>Legacy.</p>',
         active: true,
         duration: {
            type: 'turnStart',
            remaining: 2,
            initiative: 7,
            custom: '',
         },
         rulesElement: [
            {
               operation: 'flatModifier',
            },
         ],
         check: [],
         customTrait: [],
      },
      ...overrides,
   };
}

/**
 * Builds a fake actor exposing only what convertActor reads: raw _source.items, the effects array, and recording
 * embedded-CRUD stubs.
 * @param {object} [options] - The fake's contents.
 * @param {object[]} [options.items] - Raw item source entries for _source.items.
 * @param {object[]} [options.effects] - Active Effect stand-ins for the actor.effects array.
 * @returns {object} The fake actor; its calls array records [method, embeddedName, payload] triples in order.
 */
function makeFakeActor({ items = [], effects = [] } = {}) {
   /** @type {Array<[string, string, *]>} - Recorded embedded-CRUD calls as [method, embeddedName, payload]. */
   const calls = [];

   return {
      name: 'Fake Actor',
      id: 'fakeactor0000001',
      _source: {
         items,
      },
      effects,
      calls,
      createEmbeddedDocuments: async (embeddedName, data) => {
         calls.push(['create', embeddedName, data]);
      },
      deleteEmbeddedDocuments: async (embeddedName, ids) => {
         calls.push(['delete', embeddedName, ids]);
      },
   };
}

describe('buildEffectData (raw source contract)', () => {
   it('maps the core raw source fields onto effect AE creation data', () => {
      const result = buildEffectData(makeLegacyItemSource());

      expect(result.name).toBe('Legacy Effect');
      expect(result.img).toBe('icons/legacy.webp');
      expect(result.type).toBe('effect');
      expect(result.description).toBe('<p>Legacy.</p>');
      expect(result.disabled).toBe(false);
      expect(result.system).toEqual({
         rulesElement: [
            {
               operation: 'flatModifier',
            },
         ],
         duration: {
            type: 'turnStart',
            remaining: 2,
            initiative: 7,
            custom: '',
         },
         check: [],
         customTrait: [],
      });
   });

   it('starts disabled only for explicitly-deactivated permanent effects', () => {
      /** @type {object} - A permanent, explicitly-deactivated legacy item source. */
      const inactivePermanent = makeLegacyItemSource();
      inactivePermanent.system.duration.type = 'permanent';
      inactivePermanent.system.active = false;

      /** @type {object} - A permanent, active legacy item source. */
      const activePermanent = makeLegacyItemSource();
      activePermanent.system.duration.type = 'permanent';
      activePermanent.system.active = true;

      /** @type {object} - A non-permanent, deactivated legacy item source (still starts enabled). */
      const inactiveTimed = makeLegacyItemSource();
      inactiveTimed.system.active = false;

      expect(buildEffectData(inactivePermanent).disabled).toBe(true);
      expect(buildEffectData(activePermanent).disabled).toBe(false);
      expect(buildEffectData(inactiveTimed).disabled).toBe(false);
   });

   it('deep-clones the migrated system fields and defaults a missing description to an empty string', () => {
      /** @type {object} - A legacy item source without a description. */
      const source = makeLegacyItemSource();
      delete source.system.description;

      const result = buildEffectData(source);
      result.system.duration.remaining = 99;

      expect(result.description).toBe('');
      expect(source.system.duration.remaining).toBe(2);
   });
});
