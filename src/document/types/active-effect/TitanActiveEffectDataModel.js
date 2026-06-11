import TitanDataModel from '~/document/data-model/TitanDataModel.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createDataField from '~/helpers/utility-functions/CreateDataField.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEffectSystemTemplate from '~/document/types/active-effect/EffectSystemTemplate.js';

/**
 * The typed system data model for Titan Active Effects (subtype 'effect').
 * Carries the Rules Elements, the custom Titan duration, item-check templates, and custom traits.
 * Active/inactive state is the native ActiveEffect.disabled field; the rich description is the native
 * ActiveEffect.description field.
 * @property {TitanActiveEffect} parent - The Active Effect that owns this data model.
 * @extends {TitanDataModel}
 */
export default class TitanActiveEffectDataModel extends RulesElementMixin(TitanDataModel) {
   /**
    * Defines the data schema for Titan Active Effect documents. The duration, check, and customTrait
    * fields are generated from the canonical effect shape template (the single source shared with the
    * effect chat-message snapshot schema); the changes field stays hand-built because the Foundry v14
    * verifier requires an ArrayField of a typed SchemaField, which a shape cannot express.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Duration, Checks, and Custom Traits, generated from the canonical effect shape template.
      Object.assign(schema, buildSchemaFromShape(createEffectSystemTemplate()));

      // Changes.
      // Foundry v14 requires every ActiveEffect type data model to define `changes` as an ArrayField whose
      // element is a SchemaField defining a numeric `priority` and string `type`/`phase` (see
      // Game##verifyActiveEffectModels). We keep our own permissive change shape — without core's restrictive
      // `type` validator or `blank: false` constraints — and supply those required fields so the verifier passes.
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

   /**
    * Whether this effect's duration has expired. Permanent effects never expire.
    * @returns {boolean} Whether this effect's duration has expired.
    */
   get isExpired() {
      return this.duration.type !== 'permanent' && this.duration.remaining <= 0;
   }

   /**
    * Whether this effect is currently active. An effect is active when it is not disabled. The
    * disabled flag is a manual toggle for permanent effects only; for timed effects the document
    * lifecycle keeps it synced to the duration (active while time remains).
    * @returns {boolean} Whether this effect is currently active.
    */
   get isActive() {
      return !this.parent?.disabled;
   }

   /**
    * Whether this effect is a Combat Effect. Permanent and custom-duration effects are not Combat Effects.
    * @returns {boolean} Whether this effect is a Combat Effect.
    */
   get isCombatEffect() {
      return this.duration.type !== 'permanent' && this.duration.type !== 'custom';
   }

   /**
    * Captures the owning actor's active-combat initiative onto a new effect, if applicable.
    * @override
    * @param {object} data - The source values supplied when the effect is being created.
    * @returns {object | undefined} Initial data overrides, or undefined if none.
    * @protected
    */
   _getInitialDocumentData(data) {
      let retVal = super._getInitialDocumentData(data);

      // The AE's parent is the ActiveEffect; its parent is the owning Actor.
      const actor = this.parent?.parent;
      if (actor && actor.documentName === 'Actor' && !actor.pack && actor.id &&
         typeof data?.system?.duration?.initiative !== 'number') {
         /** @type {number | null | undefined} - The owning actor's first active-combat initiative. */
         const initiative = actor.getCombatant()?.initiative;
         if (initiative !== null && initiative !== undefined) {
            retVal ??= {};
            retVal.system ??= {};
            retVal.system.duration ??= {};
            retVal.system.duration.initiative = initiative;
         }
      }

      return retVal;
   }

   /**
    * Returns the roll data for this effect.
    * @override
    * @returns {object} Object of properties usable as substitution variables when evaluating roll formulas.
    */
   getRollData() {
      const retVal = super.getRollData();
      retVal.description = this.parent.description;
      retVal.duration = structuredClone(this.duration);
      retVal.check = structuredClone(this.check);
      retVal.customTrait = structuredClone(this.customTrait);

      return retVal;
   }
}
