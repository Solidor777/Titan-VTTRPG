import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { get, writable } from 'svelte/store';
import { render } from '@testing-library/svelte';
import CheckDialogShell from '~/check/dialog/CheckDialogShell.svelte';
import CheckDialogShellProbe, { captured } from '../../components/CheckDialogShellProbe.svelte';
import { installSchemaMocks, restoreSchemaMocks } from '../helpers/schemaFingerprint.js';

// CheckDialogShell wiring: the options it rebuilds on an Actor change keep the caller's values (the `callerOptions`
// prop, which carries a target's Defense recorded at open) and the user's writes through the tracked setter, and
// re-derive every other field. The rolling Actor's system is a bare CharacterDataModel with the real initializers.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.game.titan = {
      error: vi.fn(),
   };
   globalThis.game.user = {
      isGM: false,
      targets: new Set(),
   };
   globalThis.canvas = { tokens: { controlled: [] } };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterEach(() => {
   globalThis.game.user.targets = new Set();
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.canvas;
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * Builds a fake Actor document (shaped for ReactiveDocument's hook filters) whose system is a bare Character owning
 * one Body/Athletics Melee weapon.
 * @returns {object} The Actor document.
 */
function createActor() {
   /** @type {object} The owned weapon's data: one Body/Athletics Melee attack. */
   const weaponRollData = {
      attack: [
         {
            attribute: 'body',
            customTrait: [],
            damage: 1,
            label: 'Strike',
            plusExtraSuccessDamage: true,
            range: 1,
            skill: 'athletics',
            trait: [],
            type: 'melee',
         },
      ],
      attackNotes: '',
      customTrait: [],
      img: '',
      multiAttack: false,
      name: 'Weapon',
   };

   /** @type {object} The bare Character. */
   const system = Object.create(CharacterDataModel.prototype);

   /** @type {object} The Actor document. */
   const actor = {
      documentName: 'Actor',
      id: 'a1',
      isOwner: true,
      items: new Map([
         [
            'w',
            {
               system: {
                  attack: weaponRollData.attack,
                  getRollData: () => structuredClone(weaponRollData),
               },
            },
         ],
      ]),
      name: 'Shell Test Character',
      rulesElementsCache: {},
      system,
   };
   system.parent = actor;
   system.skill = {
      athletics: { defaultAttribute: 'body' },
   };
   system.rating = {
      accuracy: { value: 1 },
      melee: { value: 2 },
   };
   return actor;
}

/**
 * Mounts CheckDialogShell over the Actor with the probe as its type shell.
 * @param {object} actor - The Actor document.
 * @param {string} checkType - The check type (attribute or attack), which selects the Actor's initializer.
 * @param {object} callerOptions - The options the dialog was requested with (plus any open-time provenance).
 * @returns {void}
 */
function mountShell(actor, checkType, callerOptions) {
   /** @type {string} The capitalized check type in the initializer's name. */
   const type = `${checkType[0].toUpperCase()}${checkType.slice(1)}`;
   render(CheckDialogShell, {
      props: {
         actor,
         callerOptions,
         checkOptions: writable(actor.system[`initialize${type}CheckOptions`](callerOptions)),
         checkParameters: writable({}),
         checkType,
         shell: CheckDialogShellProbe,
      },
   });
   flushSync();
}

/**
 * Applies conditional elements to the Actor and fires its update hook, as a live Actor change does.
 * @param {object} actor - The Actor document.
 * @param {{check?: object[], rating?: object[]}} elements - The check and rating modifier elements to apply.
 * @returns {void}
 */
function changeActor(actor, { check = [], rating = [] }) {
   actor.system._applyConditionalCheckModifierElements(check);
   actor.system._applyConditionalRatingModifierElements(rating);
   Hooks.call('updateActor', actor, {}, {});
   flushSync();
}

describe('CheckDialogShell', () => {
   it('keeps the caller\'s values and the user\'s edits through an Actor change, re-deriving the rest', () => {
      /** @type {object} The Actor rolling the check. */
      const actor = createActor();
      mountShell(actor, 'attribute', {
         attribute: 'body',
         diceMod: 3,
      });

      // The user picks Greater Advantage through the tracked setter.
      captured.setCheckOption('advantage', 2);
      flushSync();

      changeActor(actor, {
         check: [
            {
               checkType: 'any',
               modifierType: 'dice',
               selector: 'any',
               value: 2,
            },
            {
               checkType: 'any',
               modifierType: 'advantage',
               selector: 'any',
               value: -1,
            },
            {
               checkType: 'any',
               modifierType: 'expertise',
               selector: 'any',
               value: 1,
            },
         ],
      });

      expect(get(captured.checkOptions)).toMatchObject({
         advantage: 2,
         diceMod: 3,
         expertiseMod: 1,
      });
   });

   it('keeps a caller-level target Defense through an Actor change while the Melee fallback source follows', () => {
      /** @type {object} The Actor rolling the check. */
      const actor = createActor();
      mountShell(actor, 'attack', {
         attackIdx: 0,
         itemId: 'w',
         targetDefense: 5,
      });

      changeActor(actor, {
         rating: [
            {
               key: 'melee',
               rating: 'melee',
               selector: 'attackType',
               value: 2,
            },
         ],
      });

      expect(get(captured.checkOptions)).toMatchObject({
         attackerMelee: 4,
         targetDefense: 5,
      });
   });

   it('re-derives an untargeted open\'s target Defense from the attacker\'s Melee', () => {
      /** @type {object} The Actor rolling the check. */
      const actor = createActor();
      mountShell(actor, 'attack', {
         attackIdx: 0,
         itemId: 'w',
      });
      expect(get(captured.checkOptions).targetDefense).toBe(2);

      changeActor(actor, {
         rating: [
            {
               key: 'melee',
               rating: 'melee',
               selector: 'attackType',
               value: 2,
            },
         ],
      });

      expect(get(captured.checkOptions)).toMatchObject({
         attackerMelee: 4,
         targetDefense: 4,
      });
   });
});
