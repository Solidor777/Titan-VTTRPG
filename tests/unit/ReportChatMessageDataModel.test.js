import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ReportChatMessageDataModel.migrateData hoists legacy top-level resource snapshots (stamina, wounds,
// resolve) into the nested `resource` object every report now snapshots resources under. This suite
// installs a minimal TypeDataModel stand-in (a pass-through static migrateData) so the migrateData
// super-chain (ReportChatMessageDataModel -> TitanChatMessageDataModel -> TitanDataModel ->
// foundry.abstract.TypeDataModel) resolves. Dynamic import is permitted in tests (the no-dynamic-import
// rule governs the shipping bundle only).

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

/** @type {Function} Holds the dynamically imported ReportChatMessageDataModel class. */
let ReportChatMessageDataModel;

beforeAll(async () => {
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;

   ReportChatMessageDataModel = (
      await import('~/document/types/chat-message/report/ReportChatMessageDataModel.js')
   ).default;
});

afterAll(() => {
   delete globalThis.foundry.abstract.TypeDataModel;
});

describe('ReportChatMessageDataModel.migrateData', () => {
   it('hoists legacy top-level resource snapshots into the nested resource object', () => {
      /** @type {object} A legacy report source carrying top-level resource snapshots. */
      const source = {
         stamina: {
            value: 1,
            max: 6 
         },
         wounds: {
            value: 0,
            max: 2 
         },
      };

      const migrated = ReportChatMessageDataModel.migrateData(source);

      expect(migrated.resource).toEqual({
         stamina: {
            value: 1,
            max: 6 
         },
         wounds: {
            value: 0,
            max: 2 
         },
      });
      expect(migrated.stamina).toBeUndefined();
      expect(migrated.wounds).toBeUndefined();
   });

   it('does not overwrite an already-present nested resource value', () => {
      /** @type {object} A source carrying both a legacy top-level key and a nested value for the same key. */
      const source = {
         stamina: {
            value: 1,
            max: 6 
         },
         resource: {
            stamina: {
               value: 5,
               max: 6 
            },
         },
      };

      const migrated = ReportChatMessageDataModel.migrateData(source);

      expect(migrated.resource.stamina).toEqual({
         value: 5,
         max: 6 
      });
      expect(migrated.stamina).toBeUndefined();
   });

   it('is idempotent on a source with no legacy top-level keys', () => {
      /** @type {object} A source already shaped per the current schema, with no legacy keys. */
      const source = {
         resource: {
            resolve: {
               value: 2,
               max: 4 
            },
         },
      };

      const migrated = ReportChatMessageDataModel.migrateData(source);

      expect(migrated).toEqual({
         resource: {
            resolve: {
               value: 2,
               max: 4 
            },
         },
      });
   });
});
