import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Shared data model for all check chat message subtypes. Adds the re-roll flag and attached messages;
 * concrete subtypes add their typed parameters/results via _defineCheckDataSchema().
 * @extends {TitanChatMessageDataModel}
 */
export default class CheckChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the shared check chat schema (re-roll flag + attached messages). Subtypes spread this and
    * add typed parameters/results.
    * @override
    * @returns {object} Map of schema field instances keyed by field name.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();
      schema.failuresReRolled = createBooleanField(false);
      schema.message = createArrayField(createStringField());
      return schema;
   }

   /**
    * Builds the typed parameters/results portion of a check chat schema from a subtype's shapes.
    * @param {object} parametersShape - The zero-value parameter shape for the check subtype.
    * @param {object} resultsShape - The zero-value result shape for the check subtype.
    * @returns {object} A field map with typed `parameters` and `results` SchemaFields.
    * @protected
    */
   static _defineCheckDataSchema(parametersShape, resultsShape) {
      return {
         parameters: createSchemaField(buildSchemaFromShape(parametersShape)),
         results: createSchemaField(buildSchemaFromShape(resultsShape)),
      };
   }

   /**
    * Fills `baseDifficulty` on a check message whose stored parameters carry a `difficulty` but no `baseDifficulty`.
    * Such a message rolled with no Advantage, so its stored `difficulty` is its base Difficulty; its `advantage`,
    * `automaticFailure`, and `situations` take their schema initials (0, false, []). A partial update diff that
    * carries no Difficulty is left untouched.
    * INVARIANT: every parameter update carries `baseDifficulty` whenever it carries `difficulty`; a diff carrying only
    * `difficulty` would have its base overwritten with the post-Advantage value. The fill is not gated on
    * `advantage`, because a diff need not carry it.
    * @override
    * @param {object} source - The source data for the check chat message.
    * @returns {object} The migrated source data.
    */
   static migrateData(source) {
      if (
         source.parameters &&
         source.parameters.baseDifficulty === undefined &&
         source.parameters.difficulty !== undefined
      ) {
         source.parameters.baseDifficulty = source.parameters.difficulty;
      }

      return super.migrateData(source);
   }
}
