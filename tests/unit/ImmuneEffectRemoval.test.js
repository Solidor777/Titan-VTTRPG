import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
   removeImmuneEffects,
   removeImmuneEffectsFromWorld,
   removeImmuneEffectsWithDependents,
   resolveImmuneEffectRemovals,
} from '~/document/types/actor/types/character/ImmuneEffectRemoval.js';

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(
   path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../lang/en.json'),
   'utf-8',
));

/** @type {string} The Immunity Handling mode the fake settings report. */
let mode;

beforeEach(() => {
   mode = 'remove';
   globalThis.game = {
      actors: [],
      i18n: {
         format: (key, data) => `${key} ${JSON.stringify(data)}`,
      },
      settings: {
         get: (namespace, key) => (key === 'immunityHandling' ? mode : undefined),
      },
      user: { isActiveGM: true },
   };
   globalThis.ui = {
      notifications: {
         error: vi.fn(),
         info: vi.fn(),
      },
   };
});

afterEach(() => {
   delete globalThis.game;
   delete globalThis.ui;
});

/**
 * Builds fake Active Effects named after their ids.
 * @param {...string} ids - The effect ids.
 * @returns {object[]} The fake effects, in the order of the ids.
 */
function effects(...ids) {
   return ids.map((id) => ({
      id,
      name: `${id} name`,
   }));
}

/**
 * Builds an immunity lookup from a coverage table.
 * @param {Record<string, string[]>} coverage - Effect id → the ids of the items or effects granting it an immunity.
 * @returns {(effect: object) => ImmunitySource[]} The lookup.
 */
function sourcesFrom(coverage) {
   return (effect) => (coverage[effect.id] ?? []).map((id) => ({
      id,
      name: `${id} name`,
   }));
}

/**
 * Lists the ids of the effects Remove mode deletes.
 * @param {object[]} effectList - The actor's effects.
 * @param {Record<string, string[]>} coverage - Effect id → the ids granting it an immunity.
 * @returns {string[]} The deleted effects' ids.
 */
function removedIds(effectList, coverage) {
   return resolveImmuneEffectRemovals(effectList, sourcesFrom(coverage)).map((effect) => effect.id);
}

/**
 * Builds a fake Character whose immunity lookup counts only the items and effects it still holds, as preparation
 * does after a deletion.
 * @param {object} data - The Character's contents.
 * @param {string[]} data.effectIds - Its Active Effects' ids.
 * @param {string[]} [data.itemIds] - Its immunity-granting items' ids.
 * @param {Record<string, string[]>} data.coverage - Effect id → the ids granting it an immunity.
 * @param {boolean} [data.isToken] - Whether it is an unlinked token's synthetic actor.
 * @returns {object} The fake actor; `deleteEmbeddedDocuments` is a spy that removes the effects.
 */
function createActor({ effectIds, itemIds = [], coverage, isToken = false }) {
   /** @type {object} The fake actor. */
   const actor = {
      effects: effects(...effectIds),
      getDependentTokens: () => [],
      isToken,
      name: 'Ward Bearer',
      system: {
         isCharacter: true,

         /**
          * Lists the sources covering an effect among the items and effects the actor still holds.
          * @param {object} effect - The effect to look up.
          * @returns {ImmunitySource[]} The covering sources.
          */
         getImmunitySources: (effect) => (coverage[effect.id] ?? [])
            .filter((id) => itemIds.includes(id) || actor.effects.some((entry) => entry.id === id))
            .map((id) => ({
               id,
               name: `${id} name`,
            })),
      },
   };
   actor.deleteEmbeddedDocuments = vi.fn(async (documentName, ids) => {
      // The database round trip: the effects leave the actor after the call returns, as in Foundry.
      await Promise.resolve();
      actor.effects = actor.effects.filter((effect) => !ids.includes(effect.id));
      return [];
   });
   return actor;
}

/**
 * Builds a fake Character holding Contaminated, which its ward item makes it immune to.
 * @param {boolean} [isToken] - Whether it is an unlinked token's synthetic actor.
 * @returns {object} The fake actor.
 */
function createContaminatedActor(isToken = false) {
   return createActor({
      coverage: { contaminated: ['ward'] },
      effectIds: ['contaminated'],
      isToken,
      itemIds: ['ward'],
   });
}

describe('resolveImmuneEffectRemovals', () => {
   it('removes an effect an item grants immunity to', () => {
      expect(removedIds(effects('contaminated'), { contaminated: ['wardItem'] })).toEqual(['contaminated']);
   });

   it('removes nothing no immunity covers', () => {
      expect(removedIds(effects('a', 'b'), {})).toEqual([]);
   });

   it('removes an effect covered by an effect nothing covers', () => {
      expect(removedIds(effects('ward', 'blade'), { blade: ['ward'] })).toEqual(['blade']);
   });

   it('keeps a mutually immune pair: neither is deleted, both stay suppressed', () => {
      expect(removedIds(effects('a', 'b'), {
         a: ['b'],
         b: ['a'],
      })).toEqual([]);
   });

   it('keeps every effect of a longer immunity ring', () => {
      expect(removedIds(effects('a', 'b', 'c'), {
         a: ['c'],
         b: ['a'],
         c: ['b'],
      })).toEqual([]);
   });

   it('keeps an effect whose only cover is removed: its immunity ends with the cover', () => {
      // wardItem → x → y: an item covers x, so x goes, and y's only immunity goes with it.
      expect(removedIds(effects('x', 'y'), {
         x: ['wardItem'],
         y: ['x'],
      })).toEqual(['x']);
   });

   it('removes an effect covered by an effect that stays because its own cover is removed', () => {
      // wardItem → x → y → z: x goes, y stays (its only cover went), and y's immunity removes z in the same pass.
      expect(removedIds(effects('x', 'y', 'z'), {
         x: ['wardItem'],
         y: ['x'],
         z: ['y'],
      })).toEqual([
         'x',
         'z',
      ]);
   });

   it('decides a pair an item breaks: the covered member goes and the other stays', () => {
      expect(removedIds(effects('a', 'b'), {
         a: [
            'b',
            'wardItem',
         ],
         b: ['a'],
      })).toEqual(['a']);
   });
});

describe('removeImmuneEffects', () => {
   it('Remove deletes the immune effect and names it, the actor, and the source', async () => {
      /** @type {object} The fake Character under test. */
      const actor = createContaminatedActor();
      expect(await removeImmuneEffects(actor)).toBe(1);
      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', ['contaminated']);
      expect(ui.notifications.info).toHaveBeenCalledWith(`LOCAL.immunityRemovedEffect.text ${JSON.stringify({
         actor: 'Ward Bearer',
         effect: 'contaminated name',
         sources: 'ward name',
      })}`);
   });

   it('Suppress deletes nothing', async () => {
      mode = 'suppress';

      /** @type {object} The fake Character under test. */
      const actor = createContaminatedActor();
      expect(await removeImmuneEffects(actor)).toBe(0);
      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
      expect(ui.notifications.info).not.toHaveBeenCalled();
   });

   it('Remove keeps a mutually immune pair', async () => {
      /** @type {object} The fake Character under test. */
      const actor = createActor({
         coverage: {
            a: ['b'],
            b: ['a'],
         },
         effectIds: [
            'a',
            'b',
         ],
      });
      expect(await removeImmuneEffects(actor)).toBe(0);
      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
   });

   it('runs overlapping removals on one actor one after another, deleting once', async () => {
      /** @type {object} The fake Character under test. */
      const actor = createContaminatedActor();
      expect(await Promise.all([
         removeImmuneEffects(actor),
         removeImmuneEffects(actor),
      ])).toEqual([
         1,
         0,
      ]);
      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledTimes(1);
   });

   it('lets the next removal on an actor run after one failed', async () => {
      /** @type {object} The fake Character under test. */
      const actor = createContaminatedActor();
      actor.deleteEmbeddedDocuments.mockRejectedValueOnce(new Error('delete refused'));
      await expect(removeImmuneEffects(actor)).rejects.toThrow('delete refused');
      expect(await removeImmuneEffects(actor)).toBe(1);
   });

   it('ignores a non-Character', async () => {
      /** @type {object} The fake Character under test. */
      const actor = createContaminatedActor();
      actor.system.isCharacter = false;
      expect(await removeImmuneEffects(actor)).toBe(0);
      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
   });
});

describe('removeImmuneEffectsWithDependents', () => {
   it('reconciles a world actor, then each unlinked token holding effects or items of its own', async () => {
      /** @type {string[]} The order the actors deleted in. */
      const order = [];

      /** @type {object} The world actor. */
      const base = createContaminatedActor();
      base.deleteEmbeddedDocuments.mockImplementation(async () => {
         order.push('base');
         base.effects = [];
         return [];
      });

      /** @type {object} A token actor holding its own immune effect. */
      const effectToken = createContaminatedActor(true);
      effectToken.deleteEmbeddedDocuments.mockImplementation(async () => {
         order.push('effect token');
         return [];
      });

      /** @type {object} A token actor whose own item makes it immune to an effect. */
      const itemToken = createContaminatedActor(true);
      itemToken.deleteEmbeddedDocuments.mockImplementation(async () => {
         order.push('item token');
         return [];
      });

      /** @type {Function} Records reads of the clean and the linked token's actor. */
      const skippedRead = vi.fn();
      base.getDependentTokens = () => [
         {
            _source: {
               delta: {
                  effects: [{ _id: 'contaminated' }],
                  items: [],
               },
            },
            actor: effectToken,
            actorLink: false,
         },
         {
            _source: {
               delta: {
                  effects: [],
                  items: [{ _id: 'ward' }],
               },
            },
            actor: itemToken,
            actorLink: false,
         },
         {
            _source: {
               delta: {
                  effects: [],
                  items: [],
               },
            },
            actorLink: false,

            /**
             * The clean token's actor, which the pass must not materialize.
             * @returns {null} Nothing.
             */
            get actor() {
               skippedRead();
               return null;
            },
         },
         {
            _source: { delta: null },
            actorLink: true,

            /**
             * The linked token's actor (its world actor), which the pass must not read again.
             * @returns {object} The world actor.
             */
            get actor() {
               skippedRead();
               return base;
            },
         },
      ];

      await removeImmuneEffectsWithDependents(base);
      expect(order).toEqual([
         'base',
         'effect token',
         'item token',
      ]);
      expect(skippedRead).not.toHaveBeenCalled();
   });

   it('reconciles a token actor alone', async () => {
      /** @type {object} The fake token actor under test. */
      const tokenActor = createContaminatedActor(true);
      tokenActor.getDependentTokens = vi.fn(() => []);
      await removeImmuneEffectsWithDependents(tokenActor);
      expect(tokenActor.deleteEmbeddedDocuments).toHaveBeenCalledTimes(1);
      expect(tokenActor.getDependentTokens).not.toHaveBeenCalled();
   });
});

describe('removeImmuneEffectsFromWorld', () => {
   it('runs on the active GM over every world actor, reporting a failure and continuing', async () => {
      /** @type {Function} The console.error spy, silencing the expected error output. */
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      /** @type {object} A world actor whose deletion fails. */
      const failing = createContaminatedActor();
      failing.deleteEmbeddedDocuments.mockRejectedValueOnce(new Error('delete refused'));

      /** @type {object} A world actor that syncs. */
      const actor = createContaminatedActor();
      game.actors = [
         failing,
         actor,
      ];
      await removeImmuneEffectsFromWorld();
      expect(ui.notifications.error).toHaveBeenCalledTimes(1);
      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
   });

   it('does nothing on any other client', async () => {
      game.user.isActiveGM = false;

      /** @type {object} A world actor. */
      const actor = createContaminatedActor();
      game.actors = [actor];
      await removeImmuneEffectsFromWorld();
      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
   });
});

describe('localization', () => {
   it.each([
      'label',
      'hint',
      'remove',
      'suppress',
   ])('SETTINGS.immunityHandling defines %s', (key) => {
      expect(lang.SETTINGS.immunityHandling[key]).toBeTypeOf('string');
      expect(lang.SETTINGS.immunityHandling[key].length).toBeGreaterThan(0);
   });

   it('the removal notice names the effect, the actor, and the sources', () => {
      for (const field of [
         '{effect}',
         '{actor}',
         '{sources}',
      ]) {
         expect(lang.LOCAL['immunityRemovedEffect.text']).toContain(field);
      }
   });
});
