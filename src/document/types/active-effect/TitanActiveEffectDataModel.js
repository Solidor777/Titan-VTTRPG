import TitanActiveEffectBase from '~/document/types/active-effect/TitanActiveEffectBase.js';
import isSuppressedByImmunity from '~/document/types/active-effect/IsSuppressedByImmunity.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createEffectSystemTemplate from '~/document/types/active-effect/EffectSystemTemplate.js';

/**
 * The typed system data model for Titan Active Effects (subtype 'effect').
 * Inherits core's Active Effect model (the core `changes` field) through TitanDataModelMixin.
 * Carries the Rules Elements, the custom Titan duration, item-check templates, and custom traits.
 * Active/inactive state is the native ActiveEffect.disabled field; the rich description is the native
 * ActiveEffect.description field.
 * @property {TitanActiveEffect} parent - The Active Effect that owns this data model.
 * @extends {foundry.data.ActiveEffectTypeDataModel}
 */
export default class TitanActiveEffectDataModel extends RulesElementMixin(TitanActiveEffectBase) {
   /**
    * Defines the data schema for Titan Active Effect documents. The duration, check, and customTrait
    * fields are generated from the canonical effect shape template (the single source shared with the
    * effect chat-message snapshot schema). The core `changes` field is inherited from
    * foundry.data.ActiveEffectTypeDataModel and left unused by TITAN.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Duration, Checks, and Custom Traits, generated from the canonical effect shape template.
      Object.assign(schema, buildSchemaFromShape(createEffectSystemTemplate()));

      return schema;
   }

   /**
    * Whether this Active Effect is suppressed: true while its Character is immune to it; otherwise undefined, so core's
    * expiry test decides.
    * @returns {true|undefined} The immunity suppression.
    */
   get isSuppressed() {
      return isSuppressedByImmunity(this.parent);
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
