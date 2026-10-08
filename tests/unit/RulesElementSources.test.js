import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// Which items and Active Effects contribute rules elements, to which mod bucket, and in what order, exercised on a
// bare CharacterDataModel through the real `_applyRulesElements`.

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
 * Builds a source's two elements: a flat Melee modifier worth `value` and an Advantage situation keyed by `situation`.
 * @param {number} value - The flat Melee modifier (a distinct power of two per source).
 * @param {string} situation - The situation key naming the source.
 * @returns {object[]} The elements.
 */
function sourceElements(value, situation) {
   return [
      {
         key: 'melee',
         operation: 'flatModifier',
         selector: 'rating',
         uuid: `${situation}-flat`,
         value,
      },
      {
         checkType: 'any',
         key: situation,
         modifierType: 'advantage',
         operation: 'conditionalCheckModifier',
         selector: 'situation',
         skill: '',
         uuid: `${situation}-situation`,
         value: 1,
      },
   ];
}

/**
 * Builds a fake owned item.
 * @param {string} id - The item id.
 * @param {string} type - The item type.
 * @param {number} value - The flat Melee modifier.
 * @param {object} [system] - Extra system data (equipped, trait).
 * @returns {object} The fake item.
 */
function item(id, type, value, system = {}) {
   return {
      _id: id,
      id,
      name: id,
      system: {
         rulesElement: sourceElements(value, `from ${id}`),
         ...system,
      },
      type,
   };
}

/**
 * Builds a fake Active Effect.
 * @param {string} id - The effect id.
 * @param {string} type - The effect subtype (effect or condition).
 * @param {number} value - The flat Melee modifier.
 * @param {boolean} disabled - Whether the effect is disabled.
 * @returns {object} The fake effect.
 */
function activeEffect(id, type, value, disabled) {
   return {
      disabled,
      id,
      name: id,
      system: {
         rulesElement: sourceElements(value, `from ${id}`),
      },
      type,
   };
}

/**
 * Builds a bare Character owning one applying and one non-applying source of every kind, with Melee at base 0.
 * @returns {object} The model.
 */
function createSourcedCharacter() {
   /** @type {object[]} The owned items, in item order. */
   const items = [
      item('ability', 'ability', 1),
      item('armorEquipped', 'armor', 2, {
         trait: [
            {
               name: 'loud',
               value: true,
            },
         ],
      }),
      item('armorUnequipped', 'armor', 4, { trait: [] }),
      item('shieldEquipped', 'shield', 8),
      item('shieldUnequipped', 'shield', 16),
      item('weaponEquipped', 'weapon', 32, { equipped: true }),
      item('weaponUnequipped', 'weapon', 64, { equipped: false }),
      item('equipmentEquipped', 'equipment', 128, { equipped: true }),
      item('equipmentUnequipped', 'equipment', 256, { equipped: false }),
   ];

   /** @type {object[]} The Active Effects. */
   const effects = [
      activeEffect('effectEnabled', 'effect', 512, false),
      activeEffect('effectDisabled', 'effect', 1024, true),
      activeEffect('conditionEnabled', 'condition', 2048, false),
      activeEffect('conditionDisabled', 'condition', 4096, true),
   ];

   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      effects: new Map(effects.map((effect) => [
         effect.id,
         effect,
      ])),
      items: new Map(items.map((entry) => [
         entry.id,
         entry,
      ])),
      rulesElementsCache: {},
   };
   model.equipped = {
      armor: 'armorEquipped',
      shield: 'shieldEquipped',
   };
   model.rating = {
      melee: {
         baseValue: 0,
         mod: {
            static: 0,
            equipment: 0,
            effect: 0,
            ability: 0,
            condition: 0,
         },
      },
   };
   return model;
}

describe('rules-element sources', () => {
   it('fills each bucket from exactly the applying sources', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();
      model._applyRulesElements();
      expect(model.rating.melee.mod).toEqual({
         static: 0,
         equipment: 2 + 8 + 32 + 128,
         effect: 512,
         ability: 1,
         condition: 2048,
      });
   });

   it('gathers items in item order, then the armor\'s traits, then effects, then conditions', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();
      model._applyRulesElements();
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'stealth' }).map((entry) => [
         entry.key,
         entry.sources,
      ])).toEqual([
         [
            'fromAbility',
            ['ability'],
         ],
         [
            'fromArmorEquipped',
            ['armorEquipped'],
         ],
         [
            'fromShieldEquipped',
            ['shieldEquipped'],
         ],
         [
            'fromWeaponEquipped',
            ['weaponEquipped'],
         ],
         [
            'fromEquipmentEquipped',
            ['equipmentEquipped'],
         ],
         [
            'remainUndetectedByHearing',
            ['armorEquipped'],
         ],
         [
            'fromEffectEnabled',
            ['effectEnabled'],
         ],
         [
            'fromConditionEnabled',
            ['conditionEnabled'],
         ],
      ]);
   });
});

describe('_getRulesElementSources', () => {
   it('lists each applying source with its bucket, id, name, and owning effect', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();

      /** @type {RulesElementSource[]} The sources. */
      const sources = model._getRulesElementSources();
      expect(sources.map((source) => [
         source.type,
         source.id,
         source.name,
         source.effect?.id,
      ])).toEqual([
         [
            'ability',
            'ability',
            'ability',
            undefined,
         ],
         [
            'equipment',
            'armorEquipped',
            'armorEquipped',
            undefined,
         ],
         [
            'equipment',
            'shieldEquipped',
            'shieldEquipped',
            undefined,
         ],
         [
            'equipment',
            'weaponEquipped',
            'weaponEquipped',
            undefined,
         ],
         [
            'equipment',
            'equipmentEquipped',
            'equipmentEquipped',
            undefined,
         ],
         [
            'equipment',
            'armorEquipped',
            'armorEquipped',
            undefined,
         ],
         [
            'effect',
            'effectEnabled',
            'effectEnabled',
            'effectEnabled',
         ],
         [
            'condition',
            'conditionEnabled',
            'conditionEnabled',
            'conditionEnabled',
         ],
      ]);
   });

   it('omits the armor trait source when the armor\'s traits impose nothing', () => {
      /** @type {object} The model. */
      const model = createSourcedCharacter();
      model.parent.items.get('armorEquipped').system.trait = [];
      expect(model._getRulesElementSources().filter((source) => source.id === 'armorEquipped')).toHaveLength(1);
   });

   it('gathers an enabled Active Effect of every subtype system.json declares, into its own bucket', () => {
      /** @type {string[]} The Active Effect subtypes the system registers. */
      const subtypes = Object.keys(JSON.parse(readFileSync(
         path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../system.json'),
         'utf-8',
      )).documentTypes.ActiveEffect);
      expect(subtypes.length).toBeGreaterThan(0);

      /** @type {object} A model whose only sources are one enabled Active Effect per subtype. */
      const model = createSourcedCharacter();
      model.parent.items = new Map();
      model.equipped = {
         armor: null,
         shield: null,
      };
      model.parent.effects = new Map(subtypes.map((subtype) => [
         subtype,
         activeEffect(subtype, subtype, 1, false),
      ]));
      expect(model._getRulesElementSources().map((source) => source.type).sort()).toEqual([...subtypes].sort());
   });
});
