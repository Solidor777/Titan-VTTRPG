import TitanDataModel from '~/document/data-model/TitanDataModel.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createDataField from '~/helpers/utility-functions/CreateDataField.js';

/**
 * The typed system data model for Titan condition Active Effects (subtype 'condition').
 * Conditions are system-defined status effects whose mechanical effects are expressed as Rules Elements
 * (supplied by RulesElementMixin) and seeded onto the CONFIG.statusEffects entry. Unlike the 'effect'
 * subtype, conditions carry no duration, checks, or custom traits.
 * @property {TitanActiveEffect} parent - The Active Effect that owns this data model.
 * @extends {TitanDataModel}
 */
export default class ConditionDataModel extends RulesElementMixin(TitanDataModel) {
   /**
    * Defines the data schema for Titan condition Active Effect documents.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Changes.
      // Foundry v14 requires every ActiveEffect type data model to define `changes` as an ArrayField whose
      // element is a SchemaField defining a numeric `priority` and string `type`/`phase` (see
      // Game##verifyActiveEffectModels). Conditions never use changes, but the verifier requires the shape.
      schema.changes = createArrayField(createSchemaField({
         key: createStringField(),
         value: createDataField(''),
         mode: createIntegerField(0),
         priority: createIntegerField(0),
         type: createStringField(),
         phase: createStringField(),
      }));

      return schema;
   }
}
