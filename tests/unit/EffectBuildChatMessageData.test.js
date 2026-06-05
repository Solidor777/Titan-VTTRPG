import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// TitanActiveEffect extends foundry.documents.ActiveEffect, and its module graph pulls in dialog
// classes that destructure foundry.applications.api.ApplicationV2 at import time. The shared test
// setup provides globalThis.foundry without documents or applications, so this suite installs
// minimal stand-ins before dynamically importing TitanActiveEffect, then exercises the pure
// buildChatMessageData() method via the prototype (no document construction needed). Dynamic import
// is permitted in tests (the no-dynamic-import rule governs the shipping bundle only).

/** @type {Function} Holds the dynamically imported TitanActiveEffect class. */
let TitanActiveEffect;

beforeAll(async () => {
   // Stand-in for foundry.documents.ActiveEffect, the document class TitanActiveEffect extends.
   globalThis.foundry.documents = { ActiveEffect: class {} };

   // Stand-in for foundry.applications.api.ApplicationV2, destructured by the dialog modules at import.
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };

   TitanActiveEffect = (await import('~/document/types/active-effect/TitanActiveEffect.js')).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.documents;
   delete globalThis.foundry.applications;
});

/**
 * Builds a stub TitanActiveEffect exposing only what buildChatMessageData() reads: the document's
 * getRollData() output (the prepared snapshot, with document-level id/name/img/type plus the
 * prepared system fields and the native description).
 * @param {object} rollData - The object the stubbed getRollData() returns.
 * @returns {object} A stub bound as `this` for buildChatMessageData().
 */
function makeStubEffect(rollData) {
   return {
      getRollData: () => rollData,
   };
}

describe('TitanActiveEffect#buildChatMessageData', () => {
   it('returns { type: effect, system } with the prepared snapshot fields plus name and img', () => {
      // An effect roll-data snapshot: document-level keys plus the prepared effect system fields.
      const rollData = {
         id: 'fx123',
         name: 'Blessing',
         img: 'icons/effect.webp',
         type: 'effect',
         rulesElement: [],
         description: '<p>Blessed.</p>',
         duration: {
            type: 'turnStart',
            remaining: 3,
            initiative: 12,
            custom: '',
         },
         check: [
            {
               label: 'Blessing Check',
               attribute: 'body',
            },
         ],
         customTrait: [
            {
               name: 'Holy',
               description: 'Radiant.',
            },
         ],
      };
      const result = TitanActiveEffect.prototype.buildChatMessageData.call(makeStubEffect(rollData));

      // Top-level shape: the type selects the chat-message subtype, the rest lives under system.
      expect(result.type).toBe('effect');
      expect(Object.keys(result)).toEqual([
         'type',
         'system',
      ]);

      // The prepared snapshot fields survive at system.X (path parity with the legacy flags root).
      expect(result.system.description).toBe('<p>Blessed.</p>');
      expect(result.system.duration).toEqual(rollData.duration);
      expect(result.system.check).toEqual(rollData.check);
      expect(result.system.customTrait).toEqual(rollData.customTrait);
      expect(result.system.rulesElement).toEqual([]);

      // name and img are folded into system as label metadata.
      expect(result.system.name).toBe('Blessing');
      expect(result.system.img).toBe('icons/effect.webp');

      // The document-level id and type are dropped from system (carried by the chat document itself).
      expect(result.system.id).toBeUndefined();
      expect(result.system.type).toBeUndefined();
   });

   it('hardcodes the effect chat subtype even when the roll data reports another document subtype', () => {
      // A condition's roll data reports type 'condition' — not a registered chat subtype. The chat
      // type must be forced to 'effect', matching the legacy producer's forced type flag.
      const rollData = {
         id: 'cond1',
         name: 'Stunned',
         img: 'icons/stunned.webp',
         type: 'condition',
         rulesElement: [],
      };
      const result = TitanActiveEffect.prototype.buildChatMessageData.call(makeStubEffect(rollData));

      expect(result.type).toBe('effect');
      expect(result.system.name).toBe('Stunned');
      expect(result.system.type).toBeUndefined();
   });
});
