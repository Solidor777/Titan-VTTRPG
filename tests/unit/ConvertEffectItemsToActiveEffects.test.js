import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   buildEffectData,
   convertStoredActor,
   needsEffectItemConversion,
} from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';

// The converter module imports nothing at module scope. The shared test setup (tests/setup.js) provides a minimal
// globalThis.foundry without utils.deepClone; this suite installs a scoped stand-in (deepClone backs buildEffectData's
// field copies) and removes it so later suites keep the shared minimal mock.

beforeAll(() => {
   // Stand-in for foundry.utils.deepClone, used by buildEffectData to copy the four migrated system fields.
   globalThis.foundry.utils.deepClone = (value) => structuredClone(value);
});

afterAll(() => {
   // Remove the stand-in so later suites keep the shared minimal mock.
   delete globalThis.foundry.utils.deepClone;
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
 * Builds a fake stored-actor target exposing what convertStoredActor reads and recording its writes in order. The
 * create stub resolves the created effects' data, as a StoredActorTarget does, so stamp verification sees them.
 * @param {object} [options] - The fake's contents.
 * @param {object[]} [options.items] - The Item data the actor holds itself.
 * @param {object[]} [options.effects] - The Active Effect data the actor holds itself.
 * @param {object[]} [options.heldEffects] - Every Active Effect's data the actor has; defaults to `effects`.
 * @returns {object} The fake target; its calls array records [method, payload] pairs in order.
 */
function makeFakeTarget({ items = [], effects = [], heldEffects = effects } = {}) {
   /** @type {Array<[string, *]>} Recorded writes as [method, payload]. */
   const calls = [];
   return {
      calls,
      createEffects: async (data) => {
         calls.push([
            'createEffects',
            data,
         ]);
         return data.map((entry, index) => ({
            _id: `createdfx${String(index).padStart(8, '0')}`,
            flags: entry.flags,
            type: entry.type,
         }));
      },
      deleteItems: async (ids) => {
         calls.push([
            'deleteItems',
            ids,
         ]);
         return ids;
      },
      readHeldEffects: () => heldEffects,
      readItems: () => items,
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

/**
 * Builds a converted effect's stored data, stamped with its source Item.
 * @param {string} itemId - The source Item id.
 * @returns {object} The converted effect.
 */
function makeConverted(itemId) {
   return {
      _id: 'convertedfx00001',
      flags: {
         titan: {
            convertedFromItem: itemId,
         },
      },
      type: 'effect',
   };
}

describe('needsEffectItemConversion', () => {
   it('reports a legacy effect Item the actor holds itself', () => {
      expect(needsEffectItemConversion([makeLegacyItemSource()])).toBe(true);
   });

   it('reports nothing for modern Items', () => {
      expect(needsEffectItemConversion([
         makeLegacyItemSource({
            _id: 'weaponitem000001',
            type: 'weapon',
         }),
      ])).toBe(false);
   });
});

describe('convertStoredActor', () => {
   it('converts only legacy effect entries: creates replacement effects, then deletes the source Items', async () => {
      /** @type {object} A legacy effect Item expected to convert. */
      const legacy = makeLegacyItemSource();

      /** @type {object} The fake target carrying one legacy and one modern Item. */
      const target = makeFakeTarget({
         items: [
            legacy,
            makeLegacyItemSource({
               _id: 'weaponitem000001',
               type: 'weapon',
            }),
         ],
      });
      expect(await convertStoredActor(target)).toBe(true);
      expect(target.calls).toEqual([
         [
            'createEffects',
            [buildEffectData(legacy)],
         ],
         [
            'deleteItems',
            ['legacyitem000001'],
         ],
      ]);
   });

   it('writes nothing and reports no change when there are no legacy Items', async () => {
      /** @type {object} A fake target with only modern content. */
      const target = makeFakeTarget({
         effects: [makeConverted('legacyitem000009')],
         items: [
            makeLegacyItemSource({
               _id: 'weaponitem000001',
               type: 'weapon',
            }),
         ],
      });
      expect(await convertStoredActor(target)).toBe(false);
      expect(target.calls).toEqual([]);
   });

   it('skips creating a replacement whose source already has a converted effect, but still deletes the Item',
      async () => {
         /** @type {object} The fake target stuck mid-conversion: replacement exists, legacy Item still present. */
         const target = makeFakeTarget({
            effects: [makeConverted('legacyitem000001')],
            items: [makeLegacyItemSource()],
         });
         await convertStoredActor(target);
         expect(target.calls).toEqual([
            [
               'deleteItems',
               ['legacyitem000001'],
            ],
         ]);
      });

   it('counts a converted effect an unlinked token inherits as the replacement', async () => {
      /** @type {object} A token target whose delta holds the legacy Item and whose base actor holds the replacement. */
      const target = makeFakeTarget({
         effects: [],
         heldEffects: [makeConverted('legacyitem000001')],
         items: [makeLegacyItemSource()],
      });
      await convertStoredActor(target);
      expect(target.calls).toEqual([
         [
            'deleteItems',
            ['legacyitem000001'],
         ],
      ]);
   });

   it('creates only the not-yet-converted sources when some replacements already exist', async () => {
      /** @type {object} A second legacy source with no surviving replacement. */
      const fresh = makeLegacyItemSource({
         _id: 'legacyitem000002',
         name: 'Second Legacy Effect',
      });

      /** @type {object} The fake target with one converted and one unconverted legacy Item. */
      const target = makeFakeTarget({
         effects: [makeConverted('legacyitem000001')],
         items: [
            makeLegacyItemSource(),
            fresh,
         ],
      });
      await convertStoredActor(target);
      expect(target.calls).toEqual([
         [
            'createEffects',
            [buildEffectData(fresh)],
         ],
         [
            'deleteItems',
            [
               'legacyitem000001',
               'legacyitem000002',
            ],
         ],
      ]);
   });

   it('keeps a legacy source whose creation is vetoed and reports no change', async () => {
      /** @type {object} The fake target carrying one legacy source whose creation will be vetoed. */
      const target = makeFakeTarget({ items: [makeLegacyItemSource()] });
      target.createEffects = async (data) => {
         target.calls.push([
            'createEffects',
            data,
         ]);
         return [];
      };
      expect(await convertStoredActor(target)).toBe(false);
      expect(target.calls).toEqual([
         [
            'createEffects',
            [buildEffectData(makeLegacyItemSource())],
         ],
      ]);
   });

   it('deletes only the sources whose replacements were created (partial veto)', async () => {
      /** @type {object} A second fresh legacy source alongside the default one. */
      const fresh = makeLegacyItemSource({
         _id: 'legacyitem000002',
         name: 'Second Legacy Effect',
      });

      /** @type {object} The fake target carrying two fresh legacy sources. */
      const target = makeFakeTarget({
         items: [
            makeLegacyItemSource(),
            fresh,
         ],
      });
      target.createEffects = async (data) => {
         target.calls.push([
            'createEffects',
            data,
         ]);
         return data.slice(0, 1).map((entry) => ({
            _id: 'createdfx00000000',
            flags: entry.flags,
            type: entry.type,
         }));
      };
      await convertStoredActor(target);
      expect(target.calls).toEqual([
         [
            'createEffects',
            [
               buildEffectData(makeLegacyItemSource()),
               buildEffectData(fresh),
            ],
         ],
         [
            'deleteItems',
            ['legacyitem000001'],
         ],
      ]);
   });
});
