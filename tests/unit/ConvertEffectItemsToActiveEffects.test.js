import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   buildEffectData,
   convertStoredActor,
   needsEffectItemConversion,
   needsInheritedConversionHidden,
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
 * Builds a fake stored-actor target exposing what convertStoredActor reads and recording its writes in order. Its
 * writes change its data as a stored write does: a creation keeps each effect's id, the deletion of an inherited
 * effect leaves a tombstone in its place, and an Item deletion removes the Item.
 * @param {object} [options] - The fake's contents.
 * @param {object[]} [options.items] - The Item data the actor holds itself, tombstones included.
 * @param {object[]} [options.effects] - The Active Effect data the actor holds itself, tombstones included.
 * @param {object[]} [options.inheritedEffects] - The Active Effect data the actor inherits and does not override.
 * @returns {object} The fake target; its calls array records [method, payload] pairs in order.
 */
function makeFakeTarget({ effects = [], inheritedEffects = [], items = [] } = {}) {
   /** @type {Array<[string, *]>} Recorded writes as [method, payload]. */
   const calls = [];

   /** @type {{effects: object[], inherited: object[], items: object[]}} The fake's current data. */
   const data = {
      effects: [...effects],
      inherited: [...inheritedEffects],
      items: [...items],
   };
   return {
      calls,
      createEffects: async (entries) => {
         calls.push([
            'createEffects',
            entries,
         ]);

         /** @type {object[]} The created effects, each keeping its id. */
         const created = entries.map((entry) => ({
            _id: entry._id,
            flags: entry.flags,
            type: entry.type,
         }));
         data.effects.push(...created);
         return created;
      },
      deleteEffects: async (ids) => {
         calls.push([
            'deleteEffects',
            ids,
         ]);
         data.inherited = data.inherited.filter((effect) => !ids.includes(effect._id));
         data.effects.push(...ids.map((id) => ({
            _id: id,
            _tombstone: true,
         })));
         return ids;
      },
      deleteItems: async (ids) => {
         calls.push([
            'deleteItems',
            ids,
         ]);
         data.items = data.items.filter((item) => !ids.includes(item._id));
         return ids;
      },
      readEffects: () => data.effects,
      readInheritedEffects: () => data.inherited,
      readItems: () => data.items,
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
      expect(result.transfer).toBe(false);
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

   it('gives the effect its source item id and stamps that id as the convertedFromItem provenance flag', () => {
      /** @type {object} - The Active Effect creation data produced by buildEffectData. */
      const result = buildEffectData(makeLegacyItemSource());

      expect(result._id).toBe('legacyitem000001');
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
 * @param {string} [id] - The effect's id: an older version's random id by default, its Item's id for a conversion of
 * this version.
 * @returns {object} The converted effect.
 */
function makeConverted(itemId, id = 'convertedfx00001') {
   return {
      _id: id,
      flags: {
         titan: {
            convertedFromItem: itemId,
         },
      },
      type: 'effect',
   };
}

/** @type {object} A tombstone of the default legacy Item in a token's delta: the token removed the inherited Item. */
const REMOVED_ITEM = {
   _id: 'legacyitem000001',
   _tombstone: true,
};

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

describe('needsInheritedConversionHidden', () => {
   it('reports an inherited conversion of an Item the token removed', () => {
      expect(needsInheritedConversionHidden({
         effects: [],
         inheritedEffects: [makeConverted('legacyitem000001', 'legacyitem000001')],
         items: [REMOVED_ITEM],
      })).toBe(true);
   });

   it('reports an inherited conversion of an Item the token overrides', () => {
      expect(needsInheritedConversionHidden({
         effects: [],
         inheritedEffects: [makeConverted('legacyitem000001')],
         items: [makeLegacyItemSource()],
      })).toBe(true);
   });

   it('reports an inherited conversion of an Item whose conversion the token holds itself', () => {
      expect(needsInheritedConversionHidden({
         effects: [makeConverted('legacyitem000001', 'legacyitem000001')],
         inheritedEffects: [makeConverted('legacyitem000001')],
         items: [],
      })).toBe(true);
   });

   it('reports nothing for an inherited conversion the token does not claim, nor without inherited effects', () => {
      expect(needsInheritedConversionHidden({
         effects: [],
         inheritedEffects: [makeConverted('otheritem0000001')],
         items: [REMOVED_ITEM],
      })).toBe(false);
      expect(needsInheritedConversionHidden({
         effects: [],
         items: [REMOVED_ITEM],
      })).toBe(false);
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

   it('converts a legacy Item a token overrides into its own effect, hiding the base actor\'s conversion first',
      async () => {
         /** @type {object} A token target whose delta overrides an Item its base actor already converted. */
         const target = makeFakeTarget({
            inheritedEffects: [makeConverted('legacyitem000001', 'legacyitem000001')],
            items: [makeLegacyItemSource()],
         });
         expect(await convertStoredActor(target)).toBe(true);
         expect(target.calls).toEqual([
            [
               'deleteEffects',
               ['legacyitem000001'],
            ],
            [
               'createEffects',
               [buildEffectData(makeLegacyItemSource())],
            ],
            [
               'deleteItems',
               ['legacyitem000001'],
            ],
         ]);
      });

   it('hides an older version\'s conversion (another id) of an Item the token overrides', async () => {
      /** @type {object} A token target whose base actor converted the overridden Item with a random id. */
      const target = makeFakeTarget({
         inheritedEffects: [makeConverted('legacyitem000001')],
         items: [makeLegacyItemSource()],
      });
      await convertStoredActor(target);
      expect(target.calls).toEqual([
         [
            'deleteEffects',
            ['convertedfx00001'],
         ],
         [
            'createEffects',
            [buildEffectData(makeLegacyItemSource())],
         ],
         [
            'deleteItems',
            ['legacyitem000001'],
         ],
      ]);
   });

   it('hides the inherited conversion of an Item the token removed, creating nothing', async () => {
      /** @type {object} A token target that removed an inherited Item its base actor converted. */
      const target = makeFakeTarget({
         inheritedEffects: [
            makeConverted('legacyitem000001', 'legacyitem000001'),
            makeConverted('otheritem0000001', 'otherfx000000001'),
         ],
         items: [REMOVED_ITEM],
      });
      expect(await convertStoredActor(target)).toBe(true);
      expect(target.calls).toEqual([
         [
            'deleteEffects',
            ['legacyitem000001'],
         ],
      ]);
   });

   it('hides an inherited conversion of an Item whose conversion the token holds itself', async () => {
      /** @type {object} A token target holding its own conversion beside an older-id inherited one. */
      const target = makeFakeTarget({
         effects: [makeConverted('legacyitem000001', 'legacyitem000001')],
         inheritedEffects: [makeConverted('legacyitem000001')],
      });
      expect(await convertStoredActor(target)).toBe(true);
      expect(target.calls).toEqual([
         [
            'deleteEffects',
            ['convertedfx00001'],
         ],
      ]);
   });

   it('converts nothing over an inherited conversion whose hide a hook vetoed, keeping the Item', async () => {
      /** @type {object} A token target whose deletion of the inherited conversion is vetoed. */
      const target = makeFakeTarget({
         inheritedEffects: [makeConverted('legacyitem000001', 'legacyitem000001')],
         items: [makeLegacyItemSource()],
      });
      target.deleteEffects = async (ids) => {
         target.calls.push([
            'deleteEffects',
            ids,
         ]);
         return [];
      };
      expect(await convertStoredActor(target)).toBe(false);
      expect(target.calls).toEqual([
         [
            'deleteEffects',
            ['legacyitem000001'],
         ],
      ]);
   });

   it('converts nothing over an older version\'s inherited conversion whose hide a hook vetoed, keeping the Item',
      async () => {
         /** @type {object} A token target whose deletion of the older-id inherited conversion is vetoed. */
         const target = makeFakeTarget({
            inheritedEffects: [makeConverted('legacyitem000001')],
            items: [makeLegacyItemSource()],
         });
         target.deleteEffects = async (ids) => {
            target.calls.push([
               'deleteEffects',
               ids,
            ]);
            return [];
         };
         expect(await convertStoredActor(target)).toBe(false);
         expect(target.calls).toEqual([
            [
               'deleteEffects',
               ['convertedfx00001'],
            ],
         ]);
      });

   it('keeps a legacy Item whose id an effect that is not its conversion takes, and throws after the rest',
      async () => {
         /** @type {object} A second legacy source, free to convert. */
         const fresh = makeLegacyItemSource({
            _id: 'legacyitem000002',
            name: 'Second Legacy Effect',
         });

         /** @type {object} The fake target holding an unstamped effect with the first source's id. */
         const target = makeFakeTarget({
            effects: [
               {
                  _id: 'legacyitem000001',
                  flags: {},
                  type: 'effect',
               },
            ],
            items: [
               makeLegacyItemSource(),
               fresh,
            ],
         });
         await expect(convertStoredActor(target)).rejects.toThrow('[legacyitem000001]');
         expect(target.calls).toEqual([
            [
               'createEffects',
               [buildEffectData(fresh)],
            ],
            [
               'deleteItems',
               ['legacyitem000002'],
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
