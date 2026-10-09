import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('~/document/types/actor/types/character/ImmuneEffectRemoval.js', () => ({
   removeImmuneEffectsReporting: vi.fn(async () => {}),
}));

import { removeImmuneEffectsReporting } from '~/document/types/actor/types/character/ImmuneEffectRemoval.js';

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
   vi.mocked(removeImmuneEffectsReporting).mockClear();
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
      expect(removeImmuneEffectsReporting).not.toHaveBeenCalled();
      HANDLERS[handler](actor, 'me');
      expect(removeImmuneEffectsReporting).toHaveBeenCalledWith(actor);
   });

   it('ignores a non-Character', () => {
      HANDLERS._onUpdate(createActor(false), 'me');
      expect(removeImmuneEffectsReporting).not.toHaveBeenCalled();
   });
});
