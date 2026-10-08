import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockField, installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// Verifies TitanDataModelMixin over a base that defines no schema (plain TypeDataModel) and over a base that
// defines its own schema fields (the shape of foundry.data.ActiveEffectTypeDataModel).

/** @type {Function} The mixin under test, imported once the Foundry stand-ins exist. */
let TitanDataModelMixin;

/** @type {Function} RulesElementMixin, layered over the mixin the way the effect models do. */
let RulesElementMixin;

/** Stand-in for foundry.abstract.DataModel, whose defineSchema throws until a subclass defines it. */
class MockDataModel {
   static defineSchema() {
      throw new Error('defineSchema must be defined');
   }

   static migrateData(source) {
      MockDataModel.migrated.push(source);
      return source;
   }

   /** @type {object[]} The sources the base migrateData received, in call order. */
   static migrated = [];
}

/** Stand-in for TypeDataModel: inherits DataModel.defineSchema unchanged. */
class MockPlainTypeDataModel extends MockDataModel {
   prepareDerivedData() {
   }
}

/** Stand-in for a specialized core model that defines its own fields. */
class MockCoreModel extends MockPlainTypeDataModel {
   static defineSchema() {
      return {
         changes: new MockField(),
      };
   }
}

beforeAll(async () => {
   installSchemaMocks();
   globalThis.foundry.abstract.DataModel = MockDataModel;
   TitanDataModelMixin = (await import('~/document/data-model/TitanDataModelMixin.js')).default;
   RulesElementMixin = (await import('~/document/types/item/rules-element/RulesElementMixin.js')).default;
});

afterAll(() => {
   delete globalThis.foundry.abstract.DataModel;
   restoreSchemaMocks();
});

describe('TitanDataModelMixin', () => {
   it('over a base with no schema, defineSchema yields documentVersion only', () => {
      const Model = TitanDataModelMixin(MockPlainTypeDataModel);

      expect(Object.keys(Model.defineSchema())).toEqual(['documentVersion']);
   });

   it('over a base with its own schema, defineSchema keeps the inherited fields and adds documentVersion', () => {
      const Model = TitanDataModelMixin(MockCoreModel);

      expect(Object.keys(Model.defineSchema()).sort()).toEqual([
         'changes',
         'documentVersion',
      ]);
   });

   it('a subclass override of _defineDocumentSchema adds its fields beside the inherited ones', () => {
      class Sub extends TitanDataModelMixin(MockCoreModel) {
         static _defineDocumentSchema() {
            return {
               ...super._defineDocumentSchema(),
               extra: new MockField(),
            };
         }
      }

      expect(Object.keys(Sub.defineSchema()).sort()).toEqual([
         'changes',
         'documentVersion',
         'extra',
      ]);
   });

   it('exposes the frozen components map and the latest version', () => {
      const Model = TitanDataModelMixin(MockCoreModel);
      const instance = new Model();

      expect(Object.isFrozen(instance.components)).toBe(true);
      expect(Model.latestVersion).toBe(0);
   });

   it('orders the inherited fields first, then documentVersion, then the outer mixin fields', () => {
      const Model = RulesElementMixin(TitanDataModelMixin(MockCoreModel));

      expect(Object.keys(Model.defineSchema())).toEqual([
         'changes',
         'documentVersion',
         'rulesElement',
      ]);
   });

   it('seeds documentVersion with the subclass latestVersion', () => {
      class Versioned extends TitanDataModelMixin(MockCoreModel) {
         static get latestVersion() {
            return 3;
         }
      }

      expect(Versioned.defineSchema().documentVersion.options.initial).toBe(3);
   });

   it('migrateData runs each component migration before the base class migration, on the same source', () => {
      class Migrating extends TitanDataModelMixin(MockCoreModel) {
         static get _prototypeComponents() {
            return {
               first: {
                  migrateData(source) {
                     source.order = [
                        ...(source.order ?? []),
                        'first',
                     ];
                  },
               },
               second: {
                  migrateData(source) {
                     source.order = [
                        ...(source.order ?? []),
                        'second',
                     ];
                  },
               },
               noMigration: {},
            };
         }
      }
      MockDataModel.migrated.length = 0;
      const source = {};
      const result = Migrating.migrateData(source);

      expect(result).toBe(source);
      expect(source.order).toEqual([
         'first',
         'second',
      ]);
      expect(MockDataModel.migrated).toEqual([source]);
   });

   it('onPreCreate applies the initial document data to the parent, and nothing when there is none', () => {
      class Initial extends TitanDataModelMixin(MockCoreModel) {
         _getInitialDocumentData(data) {
            return data.give ? { name: 'given' } : undefined;
         }
      }
      const updates = [];
      const instance = new Initial();
      instance.parent = {
         updateSource: (update) => updates.push(update),
      };
      instance.onPreCreate({ give: false });
      expect(updates).toEqual([]);
      instance.onPreCreate({ give: true });

      expect(updates).toEqual([{ name: 'given' }]);
   });
});
