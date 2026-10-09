import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import { UNCONSCIOUS_COMPANION_CONDITIONS } from '~/system/Conditions.js';

// The dispatch around falling Unconscious on stand-ins: which created effects start it and on which client, the order
// and arguments of the condition toggles, the owner guard, and the report of a failed fall. That the conditions are
// applied once, left in place when Unconscious is removed, and refused by an immunity is pinned on live documents in
// tests/e2e/unconscious.spec.js. The classes are imported after the Foundry stand-ins are installed.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;
/** @type {Function} The dynamically imported TitanActiveEffect class. */
let TitanActiveEffect;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.game.user = { id: 'creator' };
   globalThis.ui = {
      notifications: {
         error: vi.fn(),
      },
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   globalThis.foundry.documents = {
      ActiveEffect: class {
         /**
          * Stands in for core's creation handler.
          * @returns {void}
          */
         _onCreate() {}
      },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
   TitanActiveEffect = (await import('~/document/types/active-effect/TitanActiveEffect.js')).default;
});

afterAll(() => {
   delete globalThis.foundry.documents;
   restoreSchemaMocks();
   delete globalThis.ui;
   delete globalThis.Actor;
   delete globalThis.CONST;
});

describe('UNCONSCIOUS_COMPANION_CONDITIONS', () => {
   it('lists Prone then Incapacitated', () => {
      expect(UNCONSCIOUS_COMPANION_CONDITIONS).toEqual([
         'prone',
         'incapacitated',
      ]);
   });
});

describe('fallUnconscious', () => {
   /**
    * Builds a bare Character whose parent records its status toggles.
    * @param {boolean} isOwner - Whether the current user owns the Character.
    * @returns {object} The model.
    */
   function createCharacter(isOwner) {
      /** @type {object} The bare model. */
      const model = Object.create(CharacterDataModel.prototype);
      model.parent = {
         isOwner,
         name: 'Sleeper',
         toggleStatusEffect: vi.fn(async () => true),
      };
      return model;
   }

   it('toggles each companion condition active, in order', async () => {
      /** @type {object} The model. */
      const model = createCharacter(true);
      await model.fallUnconscious();
      expect(model.parent.toggleStatusEffect.mock.calls).toEqual(UNCONSCIOUS_COMPANION_CONDITIONS.map((id) => [
         id,
         { active: true },
      ]));
   });

   it('changes nothing for a non-owner', async () => {
      /** @type {Function} The console.assert spy, silencing the expected assertion output. */
      const consoleAssert = vi.spyOn(console, 'assert').mockImplementation(() => {});

      /** @type {object} The model. */
      const model = createCharacter(false);
      await model.fallUnconscious();
      expect(model.parent.toggleStatusEffect).not.toHaveBeenCalled();
      consoleAssert.mockRestore();
   });
});

describe('TitanActiveEffect#_onCreate', () => {
   /**
    * Builds a created effect on a Character whose fallUnconscious is a spy, and runs its creation hook.
    * @param {object} data - The effect's type and statuses, and the creating user.
    * @param {string} data.type - The effect subtype.
    * @param {string[]} data.statuses - The effect's status ids.
    * @param {string} data.userId - The creating user's id.
    * @param {Function} [data.fallUnconscious] - The Character's fallUnconscious spy; by default it resolves, as the
    * real method does.
    * @returns {Function} The fallUnconscious spy.
    */
   function create({ type, statuses, userId, fallUnconscious = vi.fn(async () => {}) }) {
      /** @type {object} The created effect. */
      const effect = Object.create(TitanActiveEffect.prototype);
      Object.assign(effect, {
         parent: {
            name: 'Sleeper',
            system: {
               fallUnconscious,
               isCharacter: true,
            },
         },
         statuses: new Set(statuses),
         type,
      });
      effect._onCreate({}, {}, userId);
      return fallUnconscious;
   }

   it('makes the Character fall Unconscious on the creating client only', () => {
      expect(create({
         statuses: ['unconscious'],
         type: 'condition',
         userId: 'creator',
      })).toHaveBeenCalledTimes(1);
      expect(create({
         statuses: ['unconscious'],
         type: 'condition',
         userId: 'someone-else',
      })).not.toHaveBeenCalled();
   });

   it('ignores other conditions and effect-subtype effects', () => {
      expect(create({
         statuses: ['prone'],
         type: 'condition',
         userId: 'creator',
      })).not.toHaveBeenCalled();
      expect(create({
         statuses: ['unconscious'],
         type: 'effect',
         userId: 'creator',
      })).not.toHaveBeenCalled();
   });

   it('reports a failed fall through the project logger instead of leaving the rejection unhandled', async () => {
      /** @type {Function} The console.error spy, silencing the expected error output. */
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      ui.notifications.error.mockClear();
      create({
         fallUnconscious: vi.fn(async () => {
            throw new Error('update refused');
         }),
         statuses: ['unconscious'],
         type: 'condition',
         userId: 'creator',
      });

      // The rejection settles on a later microtask.
      await vi.waitFor(() => {
         expect(ui.notifications.error).toHaveBeenCalledWith(expect.stringContaining('Sleeper'));
      });
      consoleError.mockRestore();
   });
});
