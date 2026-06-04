import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// TitanItem extends the global Item document class, and its module graph pulls in dialog classes that
// destructure foundry.applications.api.ApplicationV2 at import time. The shared test setup does not
// provide those globals, so this suite installs minimal stand-ins before dynamically importing
// TitanItem, then exercises the pure buildChatMessageData() method via the prototype (no document
// construction needed). Dynamic import is permitted in tests (the no-dynamic-import rule governs the
// shipping bundle only).

/** @type {Function} Holds the dynamically imported TitanItem class. */
let TitanItem;

beforeAll(async () => {
   // Stand-in for the global Foundry Item document class TitanItem extends.
   globalThis.Item = class {};

   // Stand-in for foundry.applications.api.ApplicationV2, destructured by the dialog modules at import.
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };

   TitanItem = (await import('~/document/types/item/TitanItem.js')).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.Item;
   delete globalThis.foundry.applications;
});

/**
 * Builds a stub TitanItem exposing only what buildChatMessageData() reads: the item `type` and the
 * data model's getRollData() output (the prepared snapshot, with document-level id/name/img/type plus
 * the prepared system fields).
 * @param {string} type - The item type (e.g. 'weapon').
 * @param {object} rollData - The object the stubbed system.getRollData() returns.
 * @returns {object} A stub bound as `this` for buildChatMessageData().
 */
function makeStubItem(type, rollData) {
   return {
      type,
      system: {
         getRollData: () => rollData,
      },
   };
}

describe('TitanItem#buildChatMessageData', () => {
   it('returns { type, system } for a weapon with the prepared system fields plus name and img', () => {
      // A weapon roll-data snapshot: document-level keys plus the prepared weapon system fields.
      const rollData = {
         id: 'abc123',
         name: 'Longsword',
         img: 'icons/weapon.webp',
         type: 'weapon',
         check: [],
         customTrait: [],
         rulesElement: [],
         rarity: 'rare',
         value: 250,
         equipped: true,
         attack: [
            {
               label: 'Swing',
               damage: 3,
            },
         ],
         attackNotes: 'Reach',
         trait: [],
      };
      const result = TitanItem.prototype.buildChatMessageData.call(makeStubItem('weapon', rollData));

      // Top-level shape: the type selects the chat-message subtype, the rest lives under system.
      expect(result.type).toBe('weapon');
      expect(Object.keys(result)).toEqual([
         'type',
         'system',
      ]);

      // The prepared system fields survive at system.X (path parity with item.system.X).
      expect(result.system.rarity).toBe('rare');
      expect(result.system.value).toBe(250);
      expect(result.system.equipped).toBe(true);
      expect(result.system.attack).toEqual(rollData.attack);
      expect(result.system.attackNotes).toBe('Reach');

      // name and img are folded into system as label metadata.
      expect(result.system.name).toBe('Longsword');
      expect(result.system.img).toBe('icons/weapon.webp');

      // The document-level id and type are dropped from system (carried by the chat document itself).
      expect(result.system.id).toBeUndefined();
      expect(result.system.type).toBeUndefined();
   });

   it('returns { type, system } for a simple commodity with its prepared system fields', () => {
      // A commodity roll-data snapshot: no rules elements, three simple fields.
      const rollData = {
         id: 'def456',
         name: 'Iron Ingot',
         img: 'icons/commodity.webp',
         type: 'commodity',
         check: [],
         customTrait: [],
         rarity: 'common',
         value: 5,
         quantity: 12,
      };
      const result = TitanItem.prototype.buildChatMessageData.call(makeStubItem('commodity', rollData));

      expect(result.type).toBe('commodity');
      expect(result.system.rarity).toBe('common');
      expect(result.system.value).toBe(5);
      expect(result.system.quantity).toBe(12);
      expect(result.system.name).toBe('Iron Ingot');
      expect(result.system.img).toBe('icons/commodity.webp');
      expect(result.system.id).toBeUndefined();
      expect(result.system.type).toBeUndefined();
   });
});
