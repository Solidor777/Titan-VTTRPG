import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// CheckChatMessageDataModel.migrateData fills `baseDifficulty` from `difficulty` on check-message sources whose
// parameters carry a Difficulty but no base Difficulty. A pass-through TypeDataModel stand-in terminates the
// migrateData super-chain. Dynamic import is permitted in tests (the no-dynamic-import rule governs the shipping bundle
// only).

/** Minimal stand-in for foundry.abstract.TypeDataModel: a pass-through static migrateData. */
class MockTypeDataModel {
   /**
    * Returns the source data unchanged, terminating the migrateData super-chain.
    * @param {object} source - The source data being migrated.
    * @returns {object} The unchanged source data.
    */
   static migrateData(source) {
      return source;
   }
}

/** @type {Function} Holds the dynamically imported CheckChatMessageDataModel class. */
let CheckChatMessageDataModel;

beforeAll(async () => {
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;
   CheckChatMessageDataModel = (await import('~/check/chat-message/CheckChatMessageDataModel.js')).default;
});

afterAll(() => {
   delete globalThis.foundry.abstract.TypeDataModel;
});

describe('CheckChatMessageDataModel.migrateData', () => {
   it('reads the stored Difficulty as the base Difficulty of a source that has none', () => {
      /** @type {object} The migrated source. */
      const migrated = CheckChatMessageDataModel.migrateData({
         parameters: {
            difficulty: 5,
         },
      });
      expect(migrated.parameters.baseDifficulty).toBe(5);
   });

   it('leaves a present base Difficulty unchanged', () => {
      /** @type {object} The migrated source. */
      const migrated = CheckChatMessageDataModel.migrateData({
         parameters: {
            baseDifficulty: 4,
            difficulty: 5,
         },
      });
      expect(migrated.parameters.baseDifficulty).toBe(4);
   });

   it('leaves a results-only update diff untouched', () => {
      /** @type {object} The migrated diff. */
      const migrated = CheckChatMessageDataModel.migrateData({
         results: {
            successes: 1,
         },
      });
      expect(migrated.parameters).toBeUndefined();
   });

   it('adds no base Difficulty to a parameters diff that carries no Difficulty', () => {
      /** @type {object} The migrated diff. */
      const migrated = CheckChatMessageDataModel.migrateData({
         parameters: {
            advantage: 0,
         },
      });
      expect('baseDifficulty' in migrated.parameters).toBe(false);
   });
});
