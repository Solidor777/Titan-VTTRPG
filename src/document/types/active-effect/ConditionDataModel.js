import TitanActiveEffectBase from '~/document/types/active-effect/TitanActiveEffectBase.js';
import isSuppressedByImmunity from '~/document/types/active-effect/IsSuppressedByImmunity.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';

/**
 * The typed system data model for Titan condition Active Effects (subtype 'condition').
 * Conditions are system-defined status effects whose mechanical effects are expressed as Rules Elements
 * (supplied by RulesElementMixin) and seeded onto the CONFIG.statusEffects entry. Unlike the 'effect'
 * subtype, conditions carry no duration, checks, or custom traits.
 * @property {TitanActiveEffect} parent - The Active Effect that owns this data model.
 * @extends {foundry.data.ActiveEffectTypeDataModel}
 */
export default class ConditionDataModel extends RulesElementMixin(TitanActiveEffectBase) {

   /**
    * Whether this Active Effect is suppressed: true while its Character is immune to it; otherwise undefined, so core's
    * expiry test decides.
    * @returns {true|undefined} The immunity suppression.
    */
   get isSuppressed() {
      return isSuppressedByImmunity(this.parent);
   }
}
