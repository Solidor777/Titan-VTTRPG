import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { buildConditionDefinitions } from '~/system/Conditions.js';
import syncConditionEffects, {
   conditionEffectsNeedSync,
   getConditionEffectSyncs,
   getConditionEffectUpdate,
   getConditionEffectUpdates,
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
 * Builds a stored Active Effect source, as `actor._source.effects` and an unlinked token's `_source.delta.effects`
 * hold it.
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

describe('world sync', () => {
   /** @type {object} The world actor with a stored stale Blinded. */
   let worldActor;
   /** @type {object} The unlinked token whose delta holds its own stale Blinded, with its actor and read spy. */
   let staleToken;
   /** @type {object} The unlinked token holding no effect of its own (it inherits the world actor's Blinded). */
   let cleanToken;
   /** @type {object} The linked token of the world actor. */
   let linkedToken;
   /** @type {object} The unlinked token whose base actor was deleted, with a stale delta effect. */
   let orphanToken;

   /**
    * Builds a fake world actor whose stored effects are the given sources.
    * @param {string} name - The name the actor reports.
    * @param {object[]} sources - The stored effect sources.
    * @returns {object} The fake actor, whose `updateEmbeddedDocuments` is a spy.
    */
   function createWorldActor(name, sources) {
      return {
         _source: {
            effects: sources,
         },
         name,
         updateEmbeddedDocuments: vi.fn(async () => []),
      };
   }

   /**
    * Builds a fake token whose delta holds the given effect sources; reading its `actor` is recorded.
    * @param {object} data - The fields of the fake token.
    * @param {string} data.name - The name the token reports.
    * @param {boolean} data.actorLink - Whether the token is linked to its base actor.
    * @param {object|null} data.baseActor - The base world actor.
    * @param {object[]} data.deltaEffects - The effect sources the token's delta manages.
    * @returns {{token: object, actor: object, actorRead: Function}} The token, its actor, and the read spy.
    */
   function createToken({ name, actorLink, baseActor, deltaEffects }) {
      /** @type {object} The token's actor, whose `updateEmbeddedDocuments` is a spy. */
      const actor = {
         name,
         updateEmbeddedDocuments: vi.fn(async () => []),
      };

      /** @type {Function} Records each read of `token.actor` (a read materializes a lazy synthetic actor). */
      const actorRead = vi.fn(() => actor);
      return {
         actor,
         actorRead,
         token: {
            _source: {
               delta: {
                  effects: deltaEffects,
               },
            },
            actorLink,
            baseActor,
            name,

            /**
             * The token's actor, read through the spy.
             * @returns {object} The fake actor the token resolves to.
             */
            get actor() {
               return actorRead();
            },
         },
      };
   }

   beforeEach(() => {
      worldActor = createWorldActor('World', [staleBlinded('effect1')]);
      staleToken = createToken({
         actorLink: false,
         baseActor: worldActor,
         deltaEffects: [staleBlinded('effect2')],
         name: 'Stale Token',
      });
      cleanToken = createToken({
         actorLink: false,
         baseActor: worldActor,
         deltaEffects: [],
         name: 'Clean Token',
      });
      linkedToken = createToken({
         actorLink: true,
         baseActor: worldActor,
         deltaEffects: [staleBlinded('effect3')],
         name: 'Linked Token',
      });
      orphanToken = createToken({
         actorLink: false,
         baseActor: null,
         deltaEffects: [staleBlinded('effect4')],
         name: 'Orphan Token',
      });
      globalThis.ui = {
         notifications: {
            error: vi.fn(),
         },
      };
      globalThis.game = {
         actors: [worldActor],
         scenes: [
            {
               tokens: [
                  staleToken.token,
                  cleanToken.token,
                  linkedToken.token,
                  orphanToken.token,
               ],
            },
         ],
         user: { isGM: true },
      };
   });

   afterEach(() => {
      delete globalThis.ui;
      delete globalThis.game;
   });

   it('finds the stale world actor, then the unlinked token whose own delta effect is stale', () => {
      expect([...getConditionEffectSyncs()].map((sync) => sync.name)).toEqual([
         'World',
         'Stale Token',
      ]);
   });

   it('reads no token actor while scanning, and only the stale token\'s while syncing', async () => {
      expect(conditionEffectsNeedSync()).toBe(true);
      expect([...getConditionEffectSyncs()]).toHaveLength(2);
      expect(staleToken.actorRead).not.toHaveBeenCalled();

      await syncConditionEffects();
      expect(staleToken.actorRead).toHaveBeenCalledTimes(1);
      for (const token of [
         cleanToken,
         linkedToken,
         orphanToken,
      ]) {
         expect(token.actorRead, token.token.name).not.toHaveBeenCalled();
      }
   });

   it('reports nothing once no stored condition effect is stale', () => {
      game.actors = [];
      game.scenes = [];
      expect(conditionEffectsNeedSync()).toBe(false);
   });

   it('reports and syncs an actor whose only stale condition still holds a stored description', async () => {
      /** @type {object} A world actor whose Prone has current rules elements and a stored description. */
      const flaggedActor = createWorldActor('Flagged', [
         effectSource({
            description: 'stale stored text',
            id: 'effect5',
            rulesElement: structuredClone(currentElements('prone')),
            statuses: ['prone'],
         }),
      ]);
      game.actors = [flaggedActor];
      game.scenes = [];
      expect(conditionEffectsNeedSync()).toBe(true);
      expect(await syncConditionEffects()).toBe(1);
      expect(flaggedActor.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
         {
            _id: 'effect5',
            'flags.titan.description': FORCED_DELETION,
         },
      ]);
   });

   it('updates each stale actor once with its effects\' updates', async () => {
      expect(await syncConditionEffects()).toBe(2);
      expect(worldActor.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
         getConditionEffectUpdate(staleBlinded('effect1')),
      ]);
      expect(staleToken.actor.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
         getConditionEffectUpdate(staleBlinded('effect2')),
      ]);
   });

   it('writes no token copy of an inherited effect when the base actor\'s update fails', async () => {
      /** @type {Function} The console.error spy, silencing the expected error output. */
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      worldActor.updateEmbeddedDocuments.mockRejectedValueOnce(new Error('write refused'));
      expect(await syncConditionEffects()).toBe(1);
      expect(ui.notifications.error).toHaveBeenCalledTimes(1);
      expect(cleanToken.actorRead).not.toHaveBeenCalled();
      expect(cleanToken.actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
      expect(staleToken.actor.updateEmbeddedDocuments).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
   });

   it('does nothing for a non-GM', async () => {
      game.user.isGM = false;
      expect(await syncConditionEffects()).toBe(0);
      expect(worldActor.updateEmbeddedDocuments).not.toHaveBeenCalled();
      expect(staleToken.actorRead).not.toHaveBeenCalled();
   });
});
