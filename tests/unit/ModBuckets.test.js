import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';
import {
   DYNAMIC_MOD_BUCKETS,
   getInnateModTotal,
   INNATE_MOD_BUCKETS,
   MOD_BUCKET_LABELS,
} from '~/system/ModBuckets.js';

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
 * Builds a stored stat with only its persisted static bucket.
 * @returns {{mod: Record<string, number>}} A stat whose mod object holds only `static`, as persisted.
 */
function storedStat() {
   return {
      mod: {
         static: 0,
      },
   };
}

describe('_resetDynamicMods', () => {
   it('adds the dynamic buckets after static in equipment, effect, ability, condition order', () => {
      /** @type {object} A bare Character with one stat of every kind. */
      const model = Object.create(CharacterDataModel.prototype);
      model.attribute = { body: storedStat() };
      model.skill = {
         arcana: {
            expertise: storedStat(),
            training: storedStat(),
         },
      };
      model.resource = { stamina: storedStat() };
      model.resistance = { reflexes: storedStat() };
      model.rating = { defense: storedStat() };
      model.speed = { stride: storedStat() };
      model.mod = { armor: storedStat() };
      model._resetDynamicMods();
      for (const statData of [
         model.attribute.body,
         model.skill.arcana.training,
         model.skill.arcana.expertise,
         model.resource.stamina,
         model.resistance.reflexes,
         model.rating.defense,
         model.speed.stride,
         model.mod.armor,
      ]) {
         expect(Object.keys(statData.mod)).toEqual([
            'static',
            'equipment',
            'effect',
            'ability',
            'condition',
         ]);
      }
   });
});

/** @type {string} This test file's directory. */
const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.resolve(TEST_DIRECTORY, '../../lang/en.json'), 'utf-8'));

describe('mod buckets', () => {
   it('labels every dynamic bucket and static, in application order', () => {
      expect(Object.keys(MOD_BUCKET_LABELS)).toEqual([
         ...DYNAMIC_MOD_BUCKETS,
         'static',
      ]);
      for (const label of Object.values(MOD_BUCKET_LABELS)) {
         expect(lang.LOCAL[`${label}.text`], label).toBeTypeOf('string');
      }
   });

   it('sums only the innate buckets (abilities and equipment)', () => {
      expect(getInnateModTotal({
         ability: 2,
         condition: -3,
         effect: 4,
         equipment: 1,
         static: 5,
      })).toBe(3);
      expect(getInnateModTotal(undefined)).toBe(0);
   });

   it('draws the innate buckets from the dynamic buckets', () => {
      expect(INNATE_MOD_BUCKETS.length).toBeGreaterThan(0);
      expect(INNATE_MOD_BUCKETS.every((bucket) => DYNAMIC_MOD_BUCKETS.includes(bucket))).toBe(true);
   });

   it('lists every non-zero bucket in the tooltip, condition included, and leaves zero buckets out', () => {
      /** @type {string} The tooltip HTML. */
      const tooltip = createModifiableStatTooltip(8, {
         ability: 0,
         condition: -2,
         effect: 1,
         equipment: 0,
         static: 3,
      }, 0, 'Defense base');
      expect(tooltip).toBe('<p>Defense base</p><p>LOCAL.base.text: 8</p><p>LOCAL.effects.text: 1</p>' +
         '<p>LOCAL.conditions.text: -2</p><p>LOCAL.temp.text: 3</p>');
   });

   it('adds other modifiers last', () => {
      expect(createModifiableStatTooltip(2, { static: 0 }, -1, undefined))
         .toBe('<p>LOCAL.base.text: 2</p><p>LOCAL.otherModifiers.text: -1</p>');
   });
});

describe('no UI source hand-lists the modifier buckets', () => {
   /**
    * Every Svelte source under src.
    * @type {string[]}
    */
   const SVELTE_SOURCES = readdirSync(path.resolve(TEST_DIRECTORY, '../../src'), { recursive: true })
      .filter((fileName) => String(fileName).endsWith('.svelte'))
      .map((fileName) => path.resolve(TEST_DIRECTORY, '../../src', String(fileName)));

   /**
    * A read of a dynamic bucket through a stat's `mod` object, dotted, optional-chained, or bracketed with a string
    * key (`.mod.condition`, `.mod?.condition`, `.mod['condition']`). Built from DYNAMIC_MOD_BUCKETS, so a bucket added
    * later is guarded too. `static` is left out: it is the persisted manual modifier the sheets' inputs bind
    * (`.mod.static`), not a breakdown bucket.
    * @type {RegExp}
    */
   const DYNAMIC_BUCKET_READ = new RegExp(
      `\\.mod(\\?\\.|\\.)(${DYNAMIC_MOD_BUCKETS.join('|')})\\b` +
      `|\\.mod(\\?\\.)?\\[['"\`](${DYNAMIC_MOD_BUCKETS.join('|')})['"\`]\\]`,
   );

   /**
    * A per-bucket label prop (`staticMod=`, `conditionMod=`), for every bucket MOD_BUCKET_LABELS lists.
    * @type {RegExp}
    */
   const BUCKET_PROP = new RegExp(`\\b(${Object.keys(MOD_BUCKET_LABELS).join('|')})Mod=`);

   it('finds the Svelte sources', () => {
      expect(SVELTE_SOURCES.length).toBeGreaterThan(100);
   });

   it('builds its patterns from the bucket lists', () => {
      expect(DYNAMIC_BUCKET_READ.test('stat.mod.condition')).toBe(true);
      expect(DYNAMIC_BUCKET_READ.test('stat.mod?.condition')).toBe(true);
      expect(DYNAMIC_BUCKET_READ.test('stat.mod[\'condition\']')).toBe(true);
      expect(DYNAMIC_BUCKET_READ.test('stat.mod?.["effect"]')).toBe(true);
      expect(DYNAMIC_BUCKET_READ.test('stat.mod.static')).toBe(false);
      expect(DYNAMIC_BUCKET_READ.test('stat.mod?.[\'static\']')).toBe(false);
      expect(BUCKET_PROP.test('<Label staticMod={0}')).toBe(true);
   });

   it('reads no dynamic bucket by name and passes no per-bucket label props', () => {
      /** @type {string[]} The offending files. */
      const offenders = SVELTE_SOURCES.filter((file) => {
         /** @type {string} The component source. */
         const source = readFileSync(file, 'utf-8');
         return DYNAMIC_BUCKET_READ.test(source) || BUCKET_PROP.test(source);
      });
      expect(offenders).toEqual([]);
   });
});
