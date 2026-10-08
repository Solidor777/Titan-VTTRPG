import TitanDataModelMixin from '~/document/data-model/TitanDataModelMixin.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';

/** @type {typeof foundry.data.ActiveEffectTypeDataModel} - Core's Active Effect model plus TITAN behaviour. */
const TitanEffectBase = TitanDataModelMixin(foundry.data.ActiveEffectTypeDataModel);

/**
 * The typed system data model for Titan condition Active Effects (subtype 'condition').
 * Conditions are system-defined status effects whose mechanical effects are expressed as Rules Elements
 * (supplied by RulesElementMixin) and seeded onto the CONFIG.statusEffects entry. Unlike the 'effect'
 * subtype, conditions carry no duration, checks, or custom traits.
 * @property {TitanActiveEffect} parent - The Active Effect that owns this data model.
 * @extends {foundry.data.ActiveEffectTypeDataModel}
 */
export default class ConditionDataModel extends RulesElementMixin(TitanEffectBase) {
}
