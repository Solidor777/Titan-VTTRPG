import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('~/document/types/actor/types/character/ImmuneEffectRemoval.js', () => ({
   removeImmuneEffectsWithDependents: vi.fn(async () => {}),
}));
vi.mock('~/helpers/utility-functions/Error.js', () => ({ default: vi.fn() }));

import { removeImmuneEffectsWithDependents } from '~/document/types/actor/types/character/ImmuneEffectRemoval.js';
import error from '~/helpers/utility-functions/Error.js';

// TitanActor's change handlers on a bare instance: core's Actor handlers are no-ops and the removal is a spy. The
// class extends the global Actor, so it is imported after the stand-in is installed; dynamic import in beforeAll is
// permitted in tests.

/** @type {Function} The dynamically imported TitanActor class. */
let TitanActor;

beforeAll(async () => {
   globalThis.Actor = class {
      /**
       * Stands in for core's update handler.
       * @returns {void}
       */
      _onUpdate() {}

      /**
       * Stands in for core's descendant-creation handler.
       * @returns {void}
       */
      _onCreateDescendantDocuments() {}

      /**
       * Stands in for core's descendant-update handler.
       * @returns {void}
       */
      _onUpdateDescendantDocuments() {}
   };
   globalThis.game = { user: { id: 'me' } };
   TitanActor = (await import('~/document/types/actor/TitanActor.js')).default;
});

afterAll(() => {
   delete globalThis.Actor;
   delete globalThis.game;
});

beforeEach(() => {
   vi.mocked(removeImmuneEffectsWithDependents).mockClear();
   vi.mocked(error).mockClear();
});

/**
 * Builds a bare TitanActor.
 * @param {boolean} [isCharacter] - Whether its system data is a Character's.
 * @returns {object} The bare TitanActor instance.
 */
function createActor(isCharacter = true) {
   /** @type {object} The bare TitanActor under test. */
   const actor = Object.create(TitanActor.prototype);
   Object.assign(actor, {
      name: 'Ward Bearer',
      system: { isCharacter },
   });
   return actor;
}

/**
 * Each change handler, called with its argument shape and the given user id.
 * @type {Record<string, (actor: object, userId: string) => void>}
 */
const HANDLERS = {
   _onUpdate: (actor, userId) => actor._onUpdate({}, {}, userId),
   _onCreateDescendantDocuments: (actor, userId) => actor._onCreateDescendantDocuments(actor, 'effects', [], [], {},
      userId),
   _onUpdateDescendantDocuments: (actor, userId) => actor._onUpdateDescendantDocuments(actor, 'items', [], [], {},
      userId),
};

describe('TitanActor immunity triggers', () => {
   it.each(Object.keys(HANDLERS))('%s removes immune effects on the changing client only', (handler) => {
      /** @type {object} The bare TitanActor under test. */
      const actor = createActor();
      HANDLERS[handler](actor, 'someone-else');
      expect(removeImmuneEffectsWithDependents).not.toHaveBeenCalled();
      HANDLERS[handler](actor, 'me');
      expect(removeImmuneEffectsWithDependents).toHaveBeenCalledWith(actor);
   });

   it('ignores a non-Character', () => {
      HANDLERS._onUpdate(createActor(false), 'me');
      expect(removeImmuneEffectsWithDependents).not.toHaveBeenCalled();
   });

   it('reports a failed removal through the project logger', async () => {
      vi.mocked(removeImmuneEffectsWithDependents).mockRejectedValueOnce(new Error('delete refused'));
      HANDLERS._onUpdate(createActor(), 'me');

      // The rejection settles on a later microtask.
      await vi.waitFor(() => {
         expect(error).toHaveBeenCalledWith(expect.stringContaining('Ward Bearer'), expect.any(Error));
      });
   });
});
