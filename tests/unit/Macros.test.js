import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The controlled Characters a macro rolls for are resolved through this helper, mocked so each test supplies its
// own stub Actor without a canvas.
vi.mock('~/helpers/utility-functions/GetControlledCharacters.js', () => ({ default: vi.fn() }));

import getControlledCharacters from '~/helpers/utility-functions/GetControlledCharacters.js';
import TitanMacros from '~/system/Macros.js';

/**
 * The async function constructor Foundry compiles a script macro's command with.
 * @type {Function}
 */
const AsyncFunction = (async () => {}).constructor;

/** @type {object} The `foundry.applications` namespace the shared test setup installs, restored after each test. */
const originalApplications = globalThis.foundry.applications;

/**
 * Builds a stub owned Item that carries one Attack and one Item Check.
 * @param {string} type - The document type (weapon, spell, or ability), which also names the stub.
 * @returns {object} The stub Item.
 */
function createItem(type) {
   return {
      _id: `${type}Id`,
      flags: {
         titan: { uuid: `${type}-titan-uuid` },
      },
      id: `${type}Id`,
      img: `${type}.svg`,
      isOwner: true,
      name: `Macro ${type}`,
      system: {
         attack: [{ label: 'Strike' }],
         check: [{ label: 'Check' }],
      },
      type: type,
   };
}

/**
 * Builds a stub Character Actor that owns the given Items and records its check requests.
 * @param {object[]} items - The Items the Actor owns.
 * @returns {object} The stub Actor.
 */
function createActor(items) {
   return {
      items: Object.assign([...items], {
         /**
          * Gets an owned Item by its document ID.
          * @param {string} id - The document ID.
          * @returns {object|undefined} The matching Item, if any.
          */
         get: (id) => items.find((item) => item.id === id),
      }),
      system: {
         requestAttackCheck: vi.fn(),
         requestCastingCheck: vi.fn(),
         requestItemCheck: vi.fn(),
      },
   };
}

/**
 * Runs a Macro's command the way Foundry runs a script macro: compiled into an async function and awaited.
 * @param {object} macro - The created Macro data.
 * @returns {Promise<void>} Resolves once the command finishes.
 */
async function executeMacro(macro) {
   await new AsyncFunction(macro.command)();
}

beforeEach(() => {
   globalThis.game = {
      macros: { find: () => undefined },
      titan: { macros: new TitanMacros() },
   };
   globalThis.Macro = {
      /**
       * Stands in for creating a Macro document by returning its creation data.
       * @param {object} data - The Macro creation data.
       * @returns {Promise<object>} The creation data.
       */
      create: async (data) => data,
   };
});

afterEach(() => {
   delete globalThis.game;
   delete globalThis.Macro;
   globalThis.foundry.applications = originalApplications;
   vi.mocked(getControlledCharacters).mockReset();
});

describe('TitanMacros — every generated command runs', () => {
   it.each([
      'uuid',
      'name',
      'documentId',
   ])('an Attack Check macro identified by %s requests the Attack Check', async (idMethod) => {
      /** @type {object} The weapon the macro rolls. */
      const weapon = createItem('weapon');
      /** @type {object} The controlled Character. */
      const actor = createActor([weapon]);
      vi.mocked(getControlledCharacters).mockReturnValue([actor]);

      await executeMacro(await game.titan.macros.getAttackCheckMacro(weapon, 'Strike', 'strike.svg', idMethod, 0));
      expect(actor.system.requestAttackCheck).toHaveBeenCalledWith({
         attackIdx: 0,
         itemId: weapon._id,
      });
   });

   it.each([
      'uuid',
      'name',
      'documentId',
   ])('a Casting Check macro identified by %s requests the Casting Check', async (idMethod) => {
      /** @type {object} The spell the macro casts. */
      const spell = createItem('spell');
      /** @type {object} The controlled Character. */
      const actor = createActor([spell]);
      vi.mocked(getControlledCharacters).mockReturnValue([actor]);

      await executeMacro(await game.titan.macros.getCastingCheckMacro(spell, 'Cast', 'cast.svg', idMethod));
      expect(actor.system.requestCastingCheck).toHaveBeenCalledWith({ itemId: spell._id });
   });

   it.each([
      'uuid',
      'name',
      'documentId',
   ])('an Item Check macro identified by %s requests the Item Check', async (idMethod) => {
      /** @type {object} The ability whose check the macro rolls. */
      const ability = createItem('ability');
      /** @type {object} The controlled Character. */
      const actor = createActor([ability]);
      vi.mocked(getControlledCharacters).mockReturnValue([actor]);

      await executeMacro(await game.titan.macros.getItemCheckMacro(ability, 'Check', 'check.svg', idMethod, 0));
      expect(actor.system.requestItemCheck).toHaveBeenCalledWith({
         checkIdx: 0,
         itemId: ability._id,
      });
   });

   describe.each([
      'Bob\'s Sword',
      'Back\\slash',
      'Say "hi"',
      'Mix\'d \\ "all"',
   ])('a Document named %s', (itemName) => {
      it.each([
         'attack',
         'casting',
         'item',
      ])('has a name-identified %s macro that compiles and passes the exact name through', async (kind) => {
         /** @type {object} The Item the macro rolls. */
         const item = createItem(kind === 'casting' ? 'spell' : 'weapon');
         item.name = itemName;
         /** @type {object} The controlled Character. */
         const actor = createActor([item]);
         vi.mocked(getControlledCharacters).mockReturnValue([actor]);
         /** @type {object} The spy standing in for the macro entry point. */
         const spy = vi.spyOn(game.titan.macros, 'getMacroItemFromID');

         /** @type {object} The created Macro. */
         let macro;
         if (kind === 'attack') {
            macro = await game.titan.macros.getAttackCheckMacro(item, 'M', 'm.svg', 'name', 0);
         } else if (kind === 'casting') {
            macro = await game.titan.macros.getCastingCheckMacro(item, 'M', 'm.svg', 'name');
         } else {
            macro = await game.titan.macros.getItemCheckMacro(item, 'M', 'm.svg', 'name', 0);
         }

         await executeMacro(macro);
         expect(spy).toHaveBeenCalledWith(actor, itemName, 'name');
      });
   });

   it('a sheet-toggle macro whose uuid contains a quote compiles and passes the exact uuid through', async () => {
      /** @type {Function} The stand-in for the v14 Hotbar's sheet toggle. */
      const toggleDocumentSheet = vi.fn();
      globalThis.foundry.applications = {
         ui: {
            Hotbar: { toggleDocumentSheet },
         },
      };

      await executeMacro(await game.titan.macros.getToggleDocumentSheetMacro('Sheet', 'sheet.svg', 'It\'s\\"x'));
      expect(toggleDocumentSheet).toHaveBeenCalledWith('It\'s\\"x');
   });

   it('a sheet-toggle macro toggles the Document\'s sheet through the namespaced Hotbar', async () => {
      /** @type {Function} The stand-in for the v14 Hotbar's sheet toggle. */
      const toggleDocumentSheet = vi.fn();
      globalThis.foundry.applications = {
         ui: {
            Hotbar: { toggleDocumentSheet },
         },
      };

      await executeMacro(await game.titan.macros.getToggleDocumentSheetMacro('Sheet', 'sheet.svg', 'Item.abc'));
      expect(toggleDocumentSheet).toHaveBeenCalledWith('Item.abc');
   });
});
