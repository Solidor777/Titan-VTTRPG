import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import { TYPED_KEY_SELECTORS } from '~/system/ConditionalCheckModifierTypes.js';
import isSuppressedByImmunity from '~/document/types/active-effect/IsSuppressedByImmunity.js';

// The immunity computations on given inputs: gathering immunities from a list of rules-element sources, matching an
// Active Effect's identity against them, and the Character gate of the suppression rule. Which live sources feed the
// list, the refusal of a creation and the suppression of an existing condition or effect are pinned on live documents
// (tests/e2e/immunity.spec.js).

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
 * Builds an immunity element.
 * @param {string} selector - 'condition' or 'effect'.
 * @param {string} key - The condition id or effect name.
 * @returns {object} The element.
 */
function immunity(selector, key) {
   return {
      key,
      operation: 'immunity',
      selector,
      uuid: `immunity-${selector}-${key}`,
   };
}

/**
 * Builds a rules-element source.
 * @param {string} id - The source id (its name is `<id> name`).
 * @param {object[]} elements - Its rules elements.
 * @returns {object} The source, holding the given id and elements.
 */
function source(id, elements) {
   return {
      elements,
      id,
      name: `${id} name`,
      type: 'ability',
   };
}

/**
 * Builds a bare Character model that gathers its rules elements from the given sources and derives its immunities.
 * @param {object[]} sources - The sources the model gathers its elements from.
 * @returns {object} The model, with its immunities on its parent as `prepareBaseData` stores them.
 */
function createDerived(sources) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {};
   model._getRulesElementSources = () => sources;
   model.parent.immunities = model._getImmunities();
   return model;
}

describe('immunity derivation', () => {
   it('derives nothing before the first preparation', () => {
      /** @type {object} The bare Character model under test. */
      const model = Object.create(CharacterDataModel.prototype);
      model.parent = {};
      expect(model.immunities.condition.size).toBe(0);
      expect(model.immunities.effect.size).toBe(0);
   });

   it('keys a condition by its id and names the granting source', () => {
      expect(createDerived([source('ward', [immunity('condition', 'blinded')])]).immunities.condition.get('blinded'))
         .toEqual([
            {
               id: 'ward',
               name: 'ward name',
            },
         ]);
   });

   it('keys effect immunities in camel case', () => {
      expect([...createDerived([source('ward', [immunity('effect', 'Poisoned Blade')])]).immunities.effect.keys()])
         .toEqual(['poisonedBlade']);
   });

   it.each(TYPED_KEY_SELECTORS.immunity)('camel-cases every typed %s key', (selector) => {
      expect([...createDerived([source('ward', [immunity(selector, 'Two Words')])]).immunities[selector].keys()])
         .toEqual(['twoWords']);
   });

   it('skips blank keys, unknown selectors and other operations', () => {
      /** @type {object} The bare Character model under test. */
      const model = createDerived([
         source('ward', [
            immunity('condition', ' '),
            immunity('trait', 'fire'),
            {
               key: 'blinded',
               operation: 'flatModifier',
               selector: 'condition',
               uuid: 'not-an-immunity',
            },
         ]),
      ]);
      expect(model.immunities.condition.size).toBe(0);
      expect(model.immunities.effect.size).toBe(0);
   });

   it('lists each source once, in source order', () => {
      /** @type {object} The bare Character model under test. */
      const model = createDerived([
         source('wardA', [
            immunity('condition', 'blinded'),
            immunity('condition', 'blinded'),
         ]),
         source('wardB', [immunity('condition', 'blinded')]),
      ]);
      expect(model.immunities.condition.get('blinded').map((entry) => entry.id)).toEqual([
         'wardA',
         'wardB',
      ]);
   });
});

describe('getImmunitySources', () => {
   /** @type {object[]} A ward granting a condition immunity and an effect immunity. */
   const wardSources = [
      source('ward', [
         immunity('condition', 'blinded'),
         immunity('effect', 'Poisoned Blade'),
      ]),
   ];

   /** @type {object[]} What the ward contributes to a match. */
   const wardMatch = [
      {
         id: 'ward',
         name: 'ward name',
      },
   ];

   it('matches a condition by any of its statuses and an effect by its camel-cased name', () => {
      /** @type {object} The bare Character model under test. */
      const model = createDerived(wardSources);
      expect(model.getImmunitySources({
         id: 'x',
         statuses: new Set([
            'prone',
            'blinded',
         ]),
         type: 'condition',
      })).toEqual(wardMatch);
      expect(model.getImmunitySources({
         id: 'x',
         name: 'poisoned blade',
         type: 'effect',
      })).toEqual(wardMatch);
   });

   it('matches nothing for another condition, another name or another type', () => {
      /** @type {object} The bare Character model under test. */
      const model = createDerived(wardSources);
      expect(model.getImmunitySources({
         id: 'x',
         statuses: new Set(['prone']),
         type: 'condition',
      })).toEqual([]);
      expect(model.getImmunitySources({
         id: 'x',
         name: 'Blinded',
         type: 'effect',
      })).toEqual([]);
      expect(model.getImmunitySources({
         id: 'x',
         name: 'Poisoned Blade',
         statuses: new Set(['blinded']),
         type: 'other',
      })).toEqual([]);
   });

   it('never names the effect granting the immunity', () => {
      /** @type {object} The bare Character model under test. */
      const model = createDerived([source('wardEffect', [immunity('effect', 'Ward')])]);
      expect(model.getImmunitySources({
         id: 'wardEffect',
         name: 'Ward',
         type: 'effect',
      })).toEqual([]);
      expect(model.getImmunitySources({
         id: 'other',
         name: 'Ward',
         type: 'effect',
      })).toHaveLength(1);
   });

   it('lists a source once however many statuses it covers', () => {
      /** @type {object} The bare Character model under test. */
      const model = createDerived([
         source('ward', [
            immunity('condition', 'blinded'),
            immunity('condition', 'deafened'),
         ]),
      ]);
      expect(model.getImmunitySources({
         id: 'x',
         statuses: new Set([
            'blinded',
            'deafened',
         ]),
         type: 'condition',
      })).toEqual(wardMatch);
   });
});

describe('isSuppressedByImmunity', () => {
   it('is undefined for an effect whose parent is not a Character or is absent', () => {
      expect(isSuppressedByImmunity({
         parent: { system: { isCharacter: false } },
         statuses: new Set(['blinded']),
         type: 'condition',
      })).toBeUndefined();
      expect(isSuppressedByImmunity({
         parent: null,
         statuses: new Set(['blinded']),
         type: 'condition',
      })).toBeUndefined();
      expect(isSuppressedByImmunity(undefined)).toBeUndefined();
   });

   it('is true while the Character has a source immune to the effect and undefined otherwise', () => {
      /** @type {object} The bare Character model under test. */
      const model = createDerived([source('ward', [immunity('condition', 'blinded')])]);
      expect(isSuppressedByImmunity({
         parent: { system: model },
         statuses: new Set(['blinded']),
         type: 'condition',
      })).toBe(true);
      expect(isSuppressedByImmunity({
         parent: { system: model },
         statuses: new Set(['prone']),
         type: 'condition',
      })).toBeUndefined();
   });
});
