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

// Scaffolding for Tasks 2-3: used by the convertActor suites added in those tasks.
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
      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
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

      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(source);
      result.system.duration.remaining = 99;
      result.system.rulesElement.push({});

      expect(result.description).toBe('');
      expect(source.system.duration.remaining).toBe(2);
      expect(source.system.rulesElement).toHaveLength(1);
   });
});

describe('buildEffectData (raw active normalization + provenance)', () => {
   it('normalizes template-era string active values like BooleanField casting would', () => {
      /** @type {object} - A permanent legacy source whose active value is the template-era string 'false'. */
      const stringFalse = makeLegacyItemSource();
      stringFalse.system.duration.type = 'permanent';
      stringFalse.system.active = 'false';

      /** @type {object} - A permanent legacy source whose active value is the template-era string 'true'. */
      const stringTrue = makeLegacyItemSource();
      stringTrue.system.duration.type = 'permanent';
      stringTrue.system.active = 'true';

      expect(buildEffectData(stringFalse).disabled).toBe(true);
      expect(buildEffectData(stringTrue).disabled).toBe(false);
   });

   it('defaults a missing active key to the schema default (enabled)', () => {
      /** @type {object} - A permanent legacy source with no active key at all (sparse pre-schema source). */
      const sparse = makeLegacyItemSource();
      sparse.system.duration.type = 'permanent';
      delete sparse.system.active;

      expect(buildEffectData(sparse).disabled).toBe(false);
   });

   it('treats an explicit null active as the schema default (enabled)', () => {
      /** @type {object} - Permanent source, null active: BooleanField cleans null to initial true; ?? true matches. */
      const nullActive = makeLegacyItemSource();
      nullActive.system.duration.type = 'permanent';
      nullActive.system.active = null;

      expect(buildEffectData(nullActive).disabled).toBe(false);
   });

   it('casts a numeric zero active to false like BooleanField._cast', () => {
      /** @type {object} - Permanent source, numeric 0 active: Boolean(0) is false, matching BooleanField._cast. */
      const zeroActive = makeLegacyItemSource();
      zeroActive.system.duration.type = 'permanent';
      zeroActive.system.active = 0;

      expect(buildEffectData(zeroActive).disabled).toBe(true);
   });

   it('passes missing check/customTrait through as undefined (filled by schema initials at creation)', () => {
      /** @type {object} - A template-era source lacking the later-added check and customTrait fields. */
      const sparse = makeLegacyItemSource();
      delete sparse.system.check;
      delete sparse.system.customTrait;

      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(sparse);

      expect(result.system.check).toBeUndefined();
      expect(result.system.customTrait).toBeUndefined();
   });

   it('stamps the source item id as the convertedFromItem provenance flag', () => {
      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(makeLegacyItemSource());

      expect(result.flags).toEqual({
         titan: {
            convertedFromItem: 'legacyitem000001',
         },
      });
   });
});

describe('convertActor (raw _source discovery)', () => {
   it('converts only legacy effect entries: creates replacement AEs, then deletes source items by _id', async () => {
      /** @type {object} - A legacy effect item source expected to convert. */
      const legacy = makeLegacyItemSource();

      /** @type {object} - A registered-subtype item source expected to be ignored. */
      const weapon = makeLegacyItemSource({
         _id: 'weaponitem000001',
         type: 'weapon',
      });

      /** @type {object} - The fake actor carrying one legacy and one modern item. */
      const actor = makeFakeActor({
         items: [
            legacy,
            weapon,
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(legacy)]],
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('is a no-op when there are no legacy items and no stale mirrors', async () => {
      /** @type {object} - A fake actor with only modern content. */
      const actor = makeFakeActor({
         items: [
            makeLegacyItemSource({
               _id: 'weaponitem000001',
               type: 'weapon',
            }),
         ],
         effects: [
            {
               id: 'modernfx00000001',
               type: 'effect',
               flags: {},
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([]);
   });

   it('deletes stale mirror AEs last, after item conversion', async () => {
      /** @type {object} - A stale cosmetic mirror AE (base subtype, titan effect flag). */
      const mirror = {
         id: 'mirrorfx00000001',
         type: 'base',
         flags: {
            titan: {
               type: 'effect',
            },
         },
      };

      /** @type {object} - The fake actor carrying one legacy item and one stale mirror. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
         effects: [mirror],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(makeLegacyItemSource())]],
         ['delete', 'Item', ['legacyitem000001']],
         ['delete', 'ActiveEffect', ['mirrorfx00000001']],
      ]);
   });

   it('removes stale mirrors even when no legacy items remain', async () => {
      /** @type {object} - The fake actor carrying only a stale mirror. */
      const actor = makeFakeActor({
         effects: [
            {
               id: 'mirrorfx00000001',
               type: 'base',
               flags: {
                  titan: {
                     type: 'effect',
                  },
               },
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['delete', 'ActiveEffect', ['mirrorfx00000001']],
      ]);
   });

   it('skips creating a replacement whose source already has a converted AE, but still deletes the item', async () => {
      /** @type {object} - A surviving converted AE stamped with the legacy source id (interrupted prior run). */
      const survivor = {
         id: 'convertedfx00001',
         type: 'effect',
         flags: {
            titan: {
               convertedFromItem: 'legacyitem000001',
            },
         },
      };

      /** @type {object} - The fake actor stuck mid-conversion: replacement exists, legacy item still present. */
      const actor = makeFakeActor({
         items: [makeLegacyItemSource()],
         effects: [survivor],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['delete', 'Item', ['legacyitem000001']],
      ]);
   });

   it('creates only the not-yet-converted sources when some replacements already exist', async () => {
      /** @type {object} - A second legacy source with no surviving replacement. */
      const fresh = makeLegacyItemSource({
         _id: 'legacyitem000002',
         name: 'Second Legacy Effect',
      });

      /** @type {object} - The fake actor with one converted and one unconverted legacy item. */
      const actor = makeFakeActor({
         items: [
            makeLegacyItemSource(),
            fresh,
         ],
         effects: [
            {
               id: 'convertedfx00001',
               type: 'effect',
               flags: {
                  titan: {
                     convertedFromItem: 'legacyitem000001',
                  },
               },
            },
         ],
      });

      await convertActor(actor);

      expect(actor.calls).toEqual([
         ['create', 'ActiveEffect', [buildEffectData(fresh)]],
         ['delete', 'Item', ['legacyitem000001', 'legacyitem000002']],
      ]);
   });
});
