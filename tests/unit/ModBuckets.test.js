import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

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
 * @returns {{mod: Record<string, number>}} The stat.
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
