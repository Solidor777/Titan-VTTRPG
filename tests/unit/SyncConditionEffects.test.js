import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildConditionDefinitions } from '~/system/Conditions.js';
import {
   getConditionEffectUpdate,
   getConditionEffectUpdates,
   syncStoredActorConditions,
   toCanonicalJson,
} from '~/helpers/migration/SyncConditionEffects.js';

/** @type {object[]} The system condition definitions, the sync's only source of truth. */
const DEFINITIONS = buildConditionDefinitions();

/**
 * Stands in for Foundry's `_del` (the global `ForcedDeletion` operator instance the client defines), so an update can
 * be checked for deleting a field by identity.
 * @type {object}
 */
const FORCED_DELETION = Object.freeze({ forcedDeletion: true });

beforeAll(() => {
   globalThis._del = FORCED_DELETION;
});

afterAll(() => {
   delete globalThis._del;
});

/**
 * Returns a condition definition's rules elements.
 * @param {string} id - The condition id.
 * @returns {object[]} The definition's rules elements (empty for a condition with none).
 */
function currentElements(id) {
   return DEFINITIONS.find((condition) => condition.id === id).system?.rulesElement ?? [];
}

/**
 * Builds a flat -1 rating element, the pre-09_26 condition penalty.
 * @param {string} id - The condition id.
 * @param {string} key - The rating.
 * @returns {object} The old element.
 */
function oldFlat(id, key) {
   return {
      operation: 'flatModifier',
      selector: 'rating',
      key,
      value: -1,
      uuid: `condition-${id}-${key}`,
   };
}

/**
 * The rules elements each condition's Active Effect carried when created from the v2.1.0 definitions, for every
 * condition whose definition changed.
 * @type {Record<string, object[]>}
 */
const OLD_FORMS = {
   blinded: [
      oldFlat('blinded', 'melee'),
      oldFlat('blinded', 'accuracy'),
      oldFlat('blinded', 'defense'),
   ],
   contaminated: [
      {
         operation: 'flatModifier',
         selector: 'attribute',
         key: 'all',
         value: -1,
         uuid: 'condition-contaminated-attributes',
      },
      {
         operation: 'flatModifier',
         selector: 'resistance',
         key: 'all',
         value: -1,
         uuid: 'condition-contaminated-resistances',
      },
   ],
   deafened: [],
   frightened: [],
   incapacitated: [],
   prone: [
      {
         operation: 'mulSum',
         selector: 'speed',
         key: 'all',
         value: 0.5,
         rounding: 'up',
         uuid: 'condition-prone-speed',
      },
      oldFlat('prone', 'melee'),
      oldFlat('prone', 'accuracy'),
   ],
   restrained: [
      oldFlat('restrained', 'melee'),
      oldFlat('restrained', 'accuracy'),
      oldFlat('restrained', 'defense'),
      {
         operation: 'setSum',
         selector: 'speed',
         key: 'all',
         value: 0,
         mode: 'set',
         uuid: 'condition-restrained-speed',
      },
   ],
   stunned: [oldFlat('stunned', 'defense')],
};

/**
 * Builds a stored Active Effect source, as a stored actor holds it.
 * @param {object} data - The fields of the stored effect.
 * @param {string} [data.id] - The id stored on the effect; defaults to `effect0`.
 * @param {string} [data.type] - The effect subtype.
 * @param {string[]} data.statuses - The effect's status ids.
 * @param {object[]} data.rulesElement - The stored rules elements.
 * @param {string} [data.description] - A legacy stored description flag.
 * @returns {object} The stored source.
 */
function effectSource({ id = 'effect0', type = 'condition', statuses, rulesElement, description }) {
   return {
      _id: id,
      flags: description === undefined ?
         {} :
         {
            titan: {
               description,
            },
         },
      statuses,
      system: {
         rulesElement,
      },
      type,
   };
}

/**
 * Builds a stored Blinded effect in its v2.1.0 form.
 * @param {string} id - The effect id.
 * @returns {object} The stale source.
 */
function staleBlinded(id) {
   return effectSource({
      id,
      rulesElement: OLD_FORMS.blinded,
      statuses: ['blinded'],
   });
}

/**
 * Applies an update to a stored source the way Foundry's database does for the fields the sync writes: a
 * `system.rulesElement` value replaces the array, and `_del` on `flags.titan.description` removes that key.
 * @param {object} source - The stored Active Effect source.
 * @param {ConditionEffectUpdate} update - The sync's update for it.
 * @returns {object} A new source with the update applied.
 */
function applyUpdate(source, update) {
   /** @type {object} The updated copy. */
   const updated = structuredClone(source);
   if ('system.rulesElement' in update) {
      updated.system.rulesElement = structuredClone(update['system.rulesElement']);
   }
   if (update['flags.titan.description'] === FORCED_DELETION) {
      delete updated.flags.titan.description;
   }
   return updated;
}

describe('toCanonicalJson', () => {
   it('serializes objects with sorted keys at every depth and keeps array order', () => {
      expect(toCanonicalJson({
         b: 1,
         a: [
            {
               d: 2,
               c: 3,
            },
            4,
         ],
      })).toBe('{"a":[{"c":3,"d":2},4],"b":1}');
   });
});

describe('getConditionEffectUpdate', () => {
   it.each(Object.entries(OLD_FORMS))('rewrites a %s effect created from the old definition', (id, oldElements) => {
      expect(getConditionEffectUpdate(effectSource({
         rulesElement: oldElements,
         statuses: [id],
      }))).toEqual({
         _id: 'effect0',
         'system.rulesElement': currentElements(id),
      });
   });

   it.each(DEFINITIONS.map((condition) => condition.id))('leaves an up-to-date %s effect alone', (id) => {
      expect(getConditionEffectUpdate(effectSource({
         rulesElement: structuredClone(currentElements(id)),
         statuses: [id],
      }))).toBeNull();
   });

   it('ignores the key order of stored elements', () => {
      /** @type {object[]} Blinded's current elements with every element's keys reversed. */
      const reordered = currentElements('blinded').map((element) => Object.fromEntries(Object.entries(element)
         .reverse()));
      expect(getConditionEffectUpdate(effectSource({
         rulesElement: reordered,
         statuses: ['blinded'],
      }))).toBeNull();
   });

   it('reports a current effect still holding a stored description, and deletes only that flag', () => {
      expect(getConditionEffectUpdate(effectSource({
         description: 'texte dans une autre langue',
         rulesElement: structuredClone(currentElements('blinded')),
         statuses: ['blinded'],
      }))).toEqual({
         _id: 'effect0',
         'flags.titan.description': FORCED_DELETION,
      });
   });

   it('rewrites the rules elements and deletes a stored description in one update', () => {
      /** @type {ConditionEffectUpdate} The update for a stale Blinded holding a stored description. */
      const update = getConditionEffectUpdate(effectSource({
         description: '<p>A Blinded creature cannot see.</p>',
         rulesElement: OLD_FORMS.blinded,
         statuses: ['blinded'],
      }));
      expect(update).toEqual({
         _id: 'effect0',
         'flags.titan.description': FORCED_DELETION,
         'system.rulesElement': currentElements('blinded'),
      });
      expect(update['flags.titan.description']).toBe(FORCED_DELETION);
   });

   it('leaves an effect-subtype effect, a custom status, and a multi-status effect alone', () => {
      expect(getConditionEffectUpdate(effectSource({
         rulesElement: OLD_FORMS.blinded,
         statuses: ['blinded'],
         type: 'effect',
      }))).toBeNull();
      expect(getConditionEffectUpdate(effectSource({
         rulesElement: [],
         statuses: ['customStatus'],
      }))).toBeNull();
      expect(getConditionEffectUpdate(effectSource({
         rulesElement: OLD_FORMS.blinded,
         statuses: [
            'blinded',
            'prone',
         ],
      }))).toBeNull();
   });

   it.each([
      [
         'stale rules elements',
         effectSource({
            rulesElement: OLD_FORMS.blinded,
            statuses: ['blinded'],
         }),
      ],
      [
         'a stored description',
         effectSource({
            description: 'stale stored text',
            rulesElement: structuredClone(currentElements('blinded')),
            statuses: ['blinded'],
         }),
      ],
      [
         'both',
         effectSource({
            description: 'stale stored text',
            rulesElement: OLD_FORMS.blinded,
            statuses: ['blinded'],
         }),
      ],
   ])('is idempotent: applying the update for %s leaves nothing to update', (label, source) => {
      /** @type {ConditionEffectUpdate} The first load's update. */
      const update = getConditionEffectUpdate(source);
      expect(update).not.toBeNull();
      expect(getConditionEffectUpdate(applyUpdate(source, update))).toBeNull();
   });

   it('returns elements the caller may change without changing a later update', () => {
      /** @type {ConditionEffectUpdate} The update for a stale Blinded, changed by its caller. */
      const update = getConditionEffectUpdate(staleBlinded('effect0'));
      update['system.rulesElement'].length = 0;
      expect(getConditionEffectUpdate(staleBlinded('effect0'))['system.rulesElement'])
         .toEqual(currentElements('blinded'));
   });
});

describe('getConditionEffectUpdates', () => {
   it('collects one update per stale condition effect and skips delta tombstones', () => {
      expect(getConditionEffectUpdates([
         staleBlinded('effect1'),
         effectSource({
            id: 'effect2',
            rulesElement: [],
            statuses: ['dead'],
         }),
         {
            _id: 'effect3',
            _tombstone: true,
         },
      ]).map((update) => update._id)).toEqual(['effect1']);
   });
});

/**
 * Builds an in-memory stored-actor target over a copy of the given effect data, recording each update.
 * @param {object[]} effects - The effect data the actor holds.
 * @param {object} [options] - How the target answers.
 * @param {boolean} [options.refuseUpdates] - Whether updates resolve nothing, as a hook veto does.
 * @returns {object} The target; `state.calls` records its writes and `state.updates` each update's payload.
 */
function makeMemoryTarget(effects, { refuseUpdates = false } = {}) {
   /** @type {{calls: string[], effects: object[], updates: object[][]}} The target's state. */
   const state = {
      calls: [],
      effects: structuredClone(effects),
      updates: [],
   };
   return {
      readEffects: () => state.effects,
      state,
      updateEffects: async (updates) => {
         state.calls.push('update');
         state.updates.push(updates);
         return refuseUpdates ? [] : updates;
      },
   };
}

describe('syncStoredActorConditions', () => {
   it('updates the stale condition effects the actor holds itself, in one write', async () => {
      /** @type {object} A target holding a stale Blinded and a current Prone. */
      const target = makeMemoryTarget([
         staleBlinded('effect1'),
         effectSource({
            id: 'effect2',
            rulesElement: structuredClone(currentElements('prone')),
            statuses: ['prone'],
         }),
      ]);
      expect(await syncStoredActorConditions(target)).toBe(true);
      expect(target.state.updates).toEqual([[getConditionEffectUpdate(staleBlinded('effect1'))]]);
   });

   it('writes nothing when every condition effect is current', async () => {
      /** @type {object} A target holding only a current Prone. */
      const target = makeMemoryTarget([
         effectSource({
            rulesElement: structuredClone(currentElements('prone')),
            statuses: ['prone'],
         }),
      ]);
      expect(await syncStoredActorConditions(target)).toBe(false);
      expect(target.state.calls).toEqual([]);
   });

   it('reports no change when the update is refused', async () => {
      expect(await syncStoredActorConditions(makeMemoryTarget([staleBlinded('effect1')], { refuseUpdates: true })))
         .toBe(false);
   });
});
