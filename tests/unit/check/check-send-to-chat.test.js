import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TitanCheck from '~/check/Check.js';

// Core's `ChatMessage.create` cleans the data it is given in place (`ArrayField#_cleanType` assigns every element
// back into the provided array), so the message data must not share arrays or objects with the check. A dialog's
// frozen Check Options reach the parameters by reference (an Item Check's snapshot Custom Traits), and an in-place
// clean of a frozen array throws.

/** @type {object[]} The data each stubbed `ChatMessage.create` call received. */
let created;

beforeEach(() => {
   created = [];
   globalThis.ChatMessage = {
      applyMode: (data) => data,
      /**
       * Records the data and cleans its parameter arrays in place, as core's array fields do.
       * @param {object} data - The message creation data.
       * @returns {Promise<object>} The recorded data.
       */
      create: async (data) => {
         for (const value of Object.values(data.system.parameters)) {
            if (Array.isArray(value)) {
               for (let index = 0; index < value.length; index++) {
                  value[index] = { ...value[index] };
               }
            }
         }
         created.push(data);
         return data;
      },
      getSpeaker: () => ({}),
   };
   globalThis.CONST = {
      CHAT_MESSAGE_STYLES: { OTHER: 0 },
   };
   globalThis.CONFIG = {
      sounds: { dice: '' },
   };
   globalThis.game = {
      user: { id: 'user' },
   };
});

afterEach(() => {
   delete globalThis.ChatMessage;
   delete globalThis.CONST;
   delete globalThis.CONFIG;
   delete globalThis.game;
});

describe('TitanCheck#sendToChat', () => {
   it('hands ChatMessage.create a copy that core may clean in place, even of frozen parameter data', async () => {
      /** @type {object[]} A frozen Custom Trait list, as a dialog's frozen Check Options carry it. */
      const customTrait = Object.freeze([
         Object.freeze({
            description: 'D',
            name: 'Glowing',
         }),
      ]);

      /** @type {TitanCheck} An evaluated check whose parameters alias the frozen list. */
      const check = new TitanCheck({ customTrait });
      check.results = { dice: [] };
      check.isEvaluated = true;

      await check.sendToChat();
      expect(created).toHaveLength(1);
      expect(created[0].system.parameters).not.toBe(check.parameters);
      expect(created[0].system.parameters.customTrait).toEqual([
         {
            description: 'D',
            name: 'Glowing',
         },
      ]);
      expect(created[0].system.results).not.toBe(check.results);
      expect(check.parameters.customTrait).toBe(customTrait);
   });
});
