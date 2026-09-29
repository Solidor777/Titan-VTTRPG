import ActionQueue from '~/helpers/ActionQueue.js';
import TitanActorDataModel from '~/document/types/actor/TitanActorDataModel.js';
import AttackCheck from '~/check/types/attack-check/AttackCheck.js';
import AttackCheckDialog from '~/check/types/attack-check/dialog/AttackCheckDialog.js';
import AttributeCheck from '~/check/types/attribute-check/AttributeCheck.js';
import AttributeCheckDialog from '~/check/types/attribute-check/dialog/AttributeCheckDialog.js';
import CastingCheck from '~/check/types/casting-check/CastingCheck.js';
import CastingCheckDialog from '~/check/types/casting-check/dialog/CastingCheckDialog.js';
import ConfirmDeleteItemDialog from '~/document/types/actor/dialogs/ConfirmDeleteItemDialog.js';
import ConfirmDeleteEffectDialog from '~/document/types/actor/dialogs/ConfirmDeleteEffectDialog.js';
import ConfirmRemoveExpiredEffectsDialog
   from '~/document/types/actor/types/character/dialogs/ConfirmRemoveExpiredEffectsDialog.js';
import ItemCheck from '~/check/types/item-check/ItemCheck.js';
import ItemCheckDialog from '~/check/types/item-check/dialog/ItemCheckDialog.js';
import ResistanceCheck from '~/check/types/resistance-check/ResistanceCheck.js';
import ResistanceCheckDialog from '~/check/types/resistance-check/dialog/ResistanceCheckDialog.js';
import appendUnique from '~/helpers/utility-functions/AppendUnique.js';
import appendUniqueByFunctionValue from '~/helpers/utility-functions/AppendUniqueByFunctionValue.js';
import camelize from '~/helpers/utility-functions/Camelize.js';
import {
   CHECK_TYPE_CONDITIONAL_SELECTORS,
   CHECK_TYPE_MODIFIER_TYPES,
   CONDITIONAL_CHECK_MODIFIER_TYPES,
   MODIFIER_TYPE_PARAMETER_KEYS,
   TYPED_KEY_SELECTORS,
} from '~/system/ConditionalCheckModifierTypes.js';
import clamp from '~/helpers/utility-functions/Clamp.js';
import computeDamageResistance from '~/helpers/utility-functions/ComputeDamageResistance.js';
import computeMulSumDelta from '~/helpers/utility-functions/ComputeMulSumDelta.js';
import computeSetSumDelta from '~/helpers/utility-functions/ComputeSetSumDelta.js';
import roundDirectional from '~/helpers/utility-functions/RoundDirectional.js';
import applyAdvantage from '~/check/ApplyAdvantage.js';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttackCheckParameters from '~/check/types/attack-check/AttackCheckParameters.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createAttributeCheckParameters from '~/check/types/attribute-check/AttributeCheckParameters.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createCastingCheckParameters from '~/check/types/casting-check/CastingCheckParameters.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import createItemCheckParameters from '~/check/types/item-check/ItemCheckParameters.js';
import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';
import createResistanceCheckParameters from '~/check/types/resistance-check/ResistanceCheckParameters.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createCharacterSystemTemplate from '~/document/types/actor/types/character/CharacterSystemTemplate.js';
import createArmorTraitCheckModifiers from '~/document/types/item/types/armor/ArmorTraitCheckModifiers.js';
import getBestPlayerOwner from '~/helpers/utility-functions/GetBestPlayerOwner.js';
import getOwners from '~/helpers/utility-functions/GetOwners.js';
import autoDecreaseEffectDuration from '~/helpers/Settings/AutoDecreaseEffectDuration.js';
import autoOpenCharacterSheetsGM from '~/helpers/Settings/AutoOpenCharacterSheetsGM.js';
import autoOpenCharacterSheetsPlayer from '~/helpers/Settings/AutoOpenCharacterSheetsPlayer.js';
import autoApplyFastHealing from '~/helpers/Settings/AutoApplyFastHealing.js';
import autoApplyPersistentDamage from '~/helpers/Settings/AutoApplyPersistentDamage.js';
import autoRegainResolve from '~/helpers/Settings/AutoRegainResolve.js';
import autoRemoveExpiredEffects from '~/helpers/Settings/AutoRemoveExpiredEffects.js';
import autoRevertFastHealing from '~/helpers/Settings/AutoRevertFastHealing.js';
import autoRevertPersistentDamage from '~/helpers/Settings/AutoRevertPersistentDamage.js';
import autoRevertResolveRegain from '~/helpers/Settings/AutoRevertResolveRegain.js';
import autoSpendResolveChecks from '~/helpers/Settings/AutoSpendResolveChecks.js';
import autoSpendResolveDoubleExpertise from '~/helpers/Settings/AutoSpendResolveDoubleExpertise.js';
import autoSpendResolveDoubleTraining from '~/helpers/Settings/AutoSpendResolveDoubleTraining.js';
import initiativeFormula from '~/helpers/Settings/InitiativeFormula.js';
import reportEffects from '~/helpers/Settings/ReportEffects.js';
import reportHealingDamage from '~/helpers/Settings/ReportHealingDamage.js';
import reportRegainingResolve from '~/helpers/Settings/ReportRegainingResolve.js';
import reportRendingArmor from '~/helpers/Settings/ReportRendingArmor.js';
import reportRepairingArmor from '~/helpers/Settings/ReportRepairingArmor.js';
import reportResting from '~/helpers/Settings/ReportResting.js';
import reportSpendingResolve from '~/helpers/Settings/ReportSpendingResolve.js';
import reportTakingDamage from '~/helpers/Settings/ReportTakingDamage.js';
import resolveBaseMultiplier from '~/helpers/Settings/ResolveBaseMultiplier.js';
import resolveBaseRegain from '~/helpers/Settings/ResolveBaseRegain.js';
import staminaBaseMultiplier from '~/helpers/Settings/StaminaBaseMultiplier.js';
import woundsBaseMultiplier from '~/helpers/Settings/WoundsBaseMultiplier.js';
import woundsBaseRegain from '~/helpers/Settings/WoundsBaseRegain.js';
import getSumOfObjectValues from '~/helpers/utility-functions/GetSumOfObjectValues.js';
import getTargetedCharacters from '~/helpers/utility-functions/GetTargetedCharacters.js';
import isCurrentUserBestOwner from '~/helpers/utility-functions/IsCurrentUserBestOwner.js';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import localize from '~/helpers/utility-functions/Localize.js';
import pushUnique from '~/helpers/utility-functions/PushUnique.js';
import shouldConfirmDeletingItems from '~/helpers/utility-functions/ShouldConfirmDeletingItems.js';
import shouldConfirmDeletingEffects from '~/helpers/utility-functions/ShouldConfirmDeletingEffects.js';
import shouldGetCheckOptions from '~/helpers/utility-functions/ShouldGetCheckOptions.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';
import sortObjectsIntoContainerByFunctionValue
   from '~/helpers/utility-functions/SortObjectsIntoContainerByFunctionValue.js';
import sortObjectsIntoContainerByKeyValue from '~/helpers/utility-functions/SortObjectsIntoContainerByKeyValue.js';
import AddInventoryItemDialog from '~/document/types/actor/dialogs/AddInventoryItemDialog.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Options for applying Damage to a Character.
 * @typedef {object} DamageOptions
 * @property {boolean} [ignoreArmor = false] - Whether to Ignore Armor when applying the Damage.
 * @property {boolean} [ineffective = false] - Whether the Attack had the Ineffective trait.
 * @property {boolean} [penetrating = false] - Whether the Attack had the Penetrating trait.
 * @property {boolean} [updateActor = true] - Whether to update the Character after applying the Damage.
 * When updating multiple values, it is useful to set this to false.
 * @property {boolean} [report = true] - Whether to send a Chat Message report, provided this setting is enabled.
 * When sending multiple reports, it is useful to set this to false.
 * @property {boolean} [playSound = true] - Whether to play a sound when sending the report.
 */

/**
 * Data for a report detailing the Damage applied to a character.
 * @typedef {object} DamageReport
 * @property {string} type - The Chat Message type (damageReport).
 * @property {boolean} [ignoreArmor] - Whether to the attack Ignored Armor.
 * @property {number} [damageResisted] - The amount of Damage resisted.
 * @property {number} [damageTaken] - The amount of Damage taken.
 * @property {number} [staminaLost] - The amount of Stamina lost.
 * @property {object} [wounds] - The character's Wounds, if any.
 * @property {number} [wounds.max] - The character's maximum Wounds, if any.
 * @property {number} [wounds.value] - The character's current Wounds, if any.
 * @property {number} [woundsSuffered] - The number of Wounds suffered, if any.
 * @property {object} [stamina] - The character's Stamina.
 * @property {number} [stamina.max] - The character's maximum Stamina.
 * @property {number} [stamina.value] - The character's current Stamina.
 * @property {object} [tags] - Tags applied to the damage.
 * @property {boolean} [tags.ineffective] - Whether the Attack had the Ineffective trait.
 * @property {boolean} [tags.penetrating] - Whether the Attack had the Penetrating trait.
 * @property {string} actorImg - The character's image.
 * @property {string} actorName - The character's name.
 */

/**
 * Options for applying Healing to a Character.
 * @typedef {object} HealingOptions
 * @property {boolean} [updateActor = true] - Whether to update the Character after applying the Healing.
 * When updating multiple values, it is useful to set this to false.
 * @property {boolean} [report = true] - Whether to send a Chat Message report, provided this setting is enabled.
 * When sending multiple reports, it is useful to set this to false.
 * @property {boolean} [playSound = true] - Whether to play a sound when sending the report.
 */

/**
 * Data for a report detailing the Healing applied to a character.
 * @typedef {object} HealingReport
 * @property {string} type - The Chat Message type (healingReport).
 * @property {string} actorImg - The character's image.
 * @property {string} actorName - The character's name.
 * @property {number} staminaRestored - The amount of Stamina healed.
 * @property {object} stamina - The character's Stamina.
 * @property {number} stamina.value - The character's current Stamina.
 * @property {number} stamina.max - The character's maximum Stamina.
 * @property {object} [wounds] - The character's Wounds, if any.
 * @property {number} [wounds.value] - The character's current Wounds, if any.
 * @property {number} [wounds.max] - The character's maximum Wounds, if any.
 */

/**
 * Options for restoring a Character's Resolve.
 * @typedef {object} RestoreResolveOptions
 * @property {boolean} [updateActor = true] - Whether to update the Character after restoring the Resolve.
 * When updating multiple values, it is useful to set this to false.
 * @property {boolean} [report = true] - Whether to send a Chat Message report, provided this setting is enabled.
 * When sending multiple reports, it is useful to set this to false.
 * @property {boolean} [playSound = true] - Whether to play a sound when sending the report.
 */

/**
 * Options for spending a Character's Resolve.
 * @typedef {object} SpendResolveOptions
 * @property {boolean} [updateActor = true] - Whether to update the Character after spending the Resolve.
 * When updating multiple values, it is useful to set this to false.
 * @property {boolean} [report = true] - Whether to send a Chat Message report, provided this setting is enabled.
 * When sending multiple reports, it is useful to set this to false.
 * @property {boolean} [playSound = true] - Whether to play a sound when sending the report.
 */

/**
 * Data for a report detailing Resolve spent by the character.
 * @typedef {object} SpendResolveReport
 * @property {string} type - The Chat Message type (spendResolveReport).
 * @property {string} actorImg - The character's image.
 * @property {string} actorName - The character's name.
 * @property {number} resolveSpent - The amount of Resolve spent.
 * @property {number} [resolveShortage] - How much the character overspent their Resolve.
 */

/**
 * Options for Rending the character's Armor.
 * @typedef {object} RendOptions
 * @property {boolean} [magical = false] - Whether the rending Attack was magical.
 * @property {boolean} [updateArmor = true] - Whether to update the Armor after applying the Rend.
 * When updating multiple values, it is useful to set this to false.
 * @property {boolean} [report = true] - Whether to send a Chat Message report, provided this setting is enabled.
 * When sending multiple reports, it is useful to set this to false.
 * @property {boolean} [playSound = true] - Whether to play a sound when sending the report.
 */

/**
 * Data for a report detailing Rend applied to the character's Armor.
 * @typedef {object} RendReport
 * @property {string} type - The Chat Message type (rendReport).
 * @property {string} actorImg - The character's image.
 * @property {string} actorName - The character's name.
 * @property {string} armorImg - The armor's image.
 * @property {string} armorName - The armor's display name.
 * @property {number} rend - The total Rend amount applied; shown as the resisted amount when no Armor was lost.
 * @property {number} [armorLost] - The amount of Armor lost, if any.
 */

/**
 * Options for Repairing the character's Armor.
 * @typedef {object} RepairsOptions
 * @property {boolean} [updateArmor = true] - Whether to update the Armor after applying the repairs.
 * When updating multiple values, it is useful to set this to false.
 * @property {boolean} [report = true] - Whether to send a Chat Message report, provided this setting is enabled.
 * When sending multiple reports, it is useful to set this to false.
 * @property {boolean} [playSound = true] - Whether to play a sound when sending the report.
 */

/**
 * Data for a report detailing Repairs made to the character's Armor.
 * @typedef {object} RepairsReport
 * @property {string} type - The Chat Message type (repairsReport).
 * @property {string} actorImg - The character's image.
 * @property {string} actorName - The character's name.
 * @property {string} armorImg - The armor's image.
 * @property {string} armorName - The armor's display name.
 * @property {number} armorRepaired - The amount of Armor repaired.
 */

/**
 * Base report Data for an Effect item.
 * @typedef {object} EffectReportData
 * @property {string} label - The name of the Effect item.
 * @property {string} img - The image used by the Effect item.
 * @property {string} [description] - The description of the Effect item, if any.
 */

/**
 * Report Data for a Turn Effect item.
 * @typedef {object} TurnEffectReportData
 * @property {string} label - The name of the Effect item.
 * @property {string} img - The image used by the Effect item.
 * @property {string} [description] - The description of the Effect item, if any.
 * @property {number} remaining - The remaining turns for the Effect item.
 */

/**
 * Report Data for a Turn Effect item.
 * @typedef {object} InitiativeEffectReportData
 * @property {string} label - The name of the Effect item.
 * @property {string} img - The image used by the Effect item.
 * @property {string} [description] - The description of the Effect item, if appropriate.
 * @property {number} remaining - The remaining turns for the Effect item.
 * @property {float} initiative - The initiative count on which the Effect duration is reduced.
 */

/**
 * Report Data for a Custom Effect item.
 * @typedef {object} CustomEffectReportData
 * @property {string} label - The name of the Effect item.
 * @property {string} img - The image used by the Effect item.
 * @property {string} [description] - The description of the Effect item, if appropriate.
 * @property {number} remaining - The remaining turns for the Effect item.
 * @property {string} custom - Custom duration of the Effect item.
 */

/**
 * A situational check modifier a check offers in its dialog.
 * @typedef {object} SituationalCheckModifier
 * @property {string} key - The camel-case situation key, as `options.situations` stores it.
 * @property {string} label - The situation's display label, as its first source typed it or localized it.
 * @property {string} [labelKey] - The localization key of a system situation's label, when the first source has one.
 * @property {string} modifierType - One of CONDITIONAL_CHECK_MODIFIER_TYPES.
 * @property {number} value - The summed value of every source sharing this key and modifier type.
 * @property {string[]} sources - The names of the items and effects the modifier comes from.
 */

/**
 * Actor data model with extra functionality for Characters.
 * @property {TitanActor} parent - The Actor that owns this data model.
 * @extends {TitanActorDataModel}
 */
export default class CharacterDataModel extends TitanActorDataModel {

   /* === Construction === */

   /**
    * Gets the cached rulesElements on the parent actor, sorted by their type.
    * @returns {object} The parent actor's Rules Elements cache.
    */
   get rulesElementsCache() {
      return this.parent.rulesElementsCache;
   }

   /**
    * Gets the parent document's Action Queue object.
    * @returns {ActionQueue} The parent actor's Action Queue.
    */
   get actionQueue() {
      return this.parent.actionQueue;
   }

   /* === Setters and getters === */

   /**
    * Identifies this data model as a Character.
    * @returns {boolean} True.
    */
   get isCharacter() {
      return true;
   }

   /**
    * Defines the data schema for Character documents, built from the shared Character system shape
    * template, so the actor schema and its shape-template-derived siblings (items, effects, checks,
    * reports) stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createCharacterSystemTemplate()),
      };
   }

   prepareDerivedData() {
      super.prepareDerivedData();
      this._calculateBaseRatings();
      this._calculateBaseResistances();
      this._calculateBaseResources();
      this._resetDynamicMods();
      this._applyRulesElements();
      this._applyArmorAndShields();
      this._applyMods();
      this._clampResources();

      // Ensure the action queue is initialized.
      if (isCurrentUserBestOwner(this.parent) && !this.parent.actionQueue) {
         this.parent.actionQueue = new ActionQueue();
      }
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.attribute = structuredClone(this.attribute);
      retVal.resistance = structuredClone(this.resistance);
      retVal.skill = structuredClone(this.skill);
      retVal.rating = structuredClone(this.rating);
      retVal.resource = structuredClone(this.resource);
      retVal.speed = structuredClone(this.speed);
      retVal.mod = structuredClone(this.mod);
      retVal.equipped = structuredClone(this.equipped);
      retVal.bio = structuredClone(this.bio);

      return retVal;
   }

   /**
    * Called before an Item is removed from this Actor.
    * @override
    * @param {TitanItem} item - The Item being deleted.
    */
   async preDeleteItem(item) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && assert(
         this.parent.uuid === item.parent?.uuid,
         'Cannot delete item %s: it is not owned by actor %s.',
         item.name,
         this.parent.name,
      )) {

         // Perform type specific deletion operations.
         switch (item.type) {

            // Un-equip armor before deletion.
            case 'armor': {
               if (this.equipped.armor === item._id) {
                  return this.unEquipArmor();
               }
               break;
            }

            // Un-equip should before deletion.
            case 'shield': {
               if (this.equipped.shield === item._id) {
                  return this.unEquipShield();
               }
               break;
            }
            default: {
               break;
            }
         }
      }
   }

   _getInitialPrototypeTokenData(data) {
      return {
         displayName: data.prototypeToken?.displayName ?? CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
         displayBars: data.prototypeToken?.displayBars ?? CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
         bar1: data.prototypeToken?.bar1 ?? { attribute: 'resource.stamina' },
         bar2: data.prototypeToken?.bar2 ?? { attribute: 'resource.resolve' },
      };
   }

   /* === Data Preparation === */

   /**
    * Gets all the standard conditions affecting this Character.
    * @returns {ActiveEffect[]|null} Array of conditions affecting this actor, or null if there are none.
    */
   getConditions() {
      const conditions = this.parent.effects.filter((effect) => effect.type === 'condition');
      return conditions.length > 0 ? conditions : null;
   }

   /**
    * Gets all the Effect Active Effects affecting this Character that have Expired.
    * @returns {ActiveEffect[]|boolean} Array of Expired Effect Active Effects affecting this character, or false if
    * there are none.
    */
   getExpiredEffects() {
      const effects = this.parent.effects.filter((effect) => effect.type === 'effect' && effect.system.isExpired);
      return effects.length > 0 ? effects : false;
   }

   /**
    * Gets all the Effect Active Effects affecting this character, sorted by their Duration type, and whether they have
    * Expired.
    * @returns {object|boolean} Object containing the sorted Effect Active Effects, or false if there are none.
    */
   getSortedEffects() {
      const effects = this.parent.effects.filter((effect) => effect.type === 'effect');
      if (effects.length > 0) {
         return sortObjectsIntoContainerByFunctionValue(effects, (effect) => {
            return effect.system.isExpired ? 'expired' : effect.system.duration.type;
         });
      }

      return false;
   }

   /**
    * Calculates this Character's base ratings.
    * @protected
    */
   _calculateBaseRatings() {
      // Calculate the base value of ratings.
      // Initiative = (Mind + Perception + Dexterity) / 2 rounded up.
      this.rating.initiative.baseValue =
         Math.ceil((this.attribute.mind.baseValue +
            this.skill.perception.training.baseValue +
            this.skill.dexterity.training.baseValue) / 2);

      // Awareness = (Mind + Perception) / 2 rounded up.
      this.rating.awareness.baseValue =
         Math.ceil((this.attribute.mind.baseValue +
            this.skill.perception.training.baseValue) / 2);

      // Defense = (Body + Dexterity) / 2 rounded up.
      this.rating.defense.baseValue =
         Math.ceil((this.attribute.body.baseValue +
            this.skill.dexterity.training.baseValue) / 2);

      // Accuracy = (Mind + Training in Ranged Weapons) / 2 rounded up.
      this.rating.accuracy.baseValue =
         Math.ceil((this.attribute.mind.baseValue +
            this.skill.rangedWeapons.training.baseValue) / 2);

      // Melee = (Body + Training in Melee Weapons) / 2 rounded up.
      this.rating.melee.baseValue =
         Math.ceil((this.attribute.body.baseValue +
            this.skill.meleeWeapons.training.baseValue) / 2);
   }

   /**
    * Calculate's this Character's base Resources.
    * @protected
    */
   _calculateBaseResources() {
      const totalBaseAttributeValue =
         this.attribute.body.baseValue +
               this.attribute.mind.baseValue +
               this.attribute.soul.baseValue;

      // Calculate base resource values.
      // Stamina = Total Attribute Mod.
      this.resource.stamina.maxBase = Math.max(Math.ceil(
         totalBaseAttributeValue * staminaBaseMultiplier()), 1);

      // Resolve = Soul / 2 rounded up.
      this.resource.resolve.maxBase = Math.max(Math.ceil(
         this.attribute.soul.baseValue * resolveBaseMultiplier()), 1);

      // Wounds = Total Attribute mod / 2 rounded up.
      this.resource.wounds.maxBase = Math.max(Math.ceil(
         totalBaseAttributeValue * woundsBaseMultiplier()), 1);
   }

   /**
    * Calculates this Character's base resistances.
    * @protected
    */
   _calculateBaseResistances() {
      // Calculate resistance base values.
      // Reflexes = (Mind + (Body / 2) rounded up).
      this.resistance.reflexes.baseValue =
         this.attribute.mind.baseValue +
         Math.floor(this.attribute.body.baseValue * 0.5);

      // Resilience = (Body + (Soul/2) rounded up).
      this.resistance.resilience.baseValue =
         this.attribute.body.baseValue +
         Math.floor(this.attribute.soul.baseValue * 0.5);

      // Willpower = (Soul + (Mind/2)).
      this.resistance.willpower.baseValue =
         this.attribute.soul.baseValue +
         Math.floor(this.attribute.mind.baseValue * 0.5);
   }

   /**
    * Resets all the Character's dynamic stat mods.
    * @private
    */
   _resetDynamicMods() {
      /**
       * Resets the Mods of a mod object to 0.
       * @param {object} mods - Mod object to reset.
       */
      function resetMods(mods) {
         mods.equipment = 0;
         mods.effect = 0;
         mods.ability = 0;
         mods.condition = 0;
      }

      // Attributes.
      for (const attribute of Object.values(this.attribute)) {
         resetMods(attribute.mod);
      }

      // Skills.
      for (const skill of Object.values(this.skill)) {
         resetMods(skill.training.mod);
         resetMods(skill.expertise.mod);
      }

      // Resource.
      for (const resource of Object.values(this.resource)) {
         resetMods(resource.mod);
      }

      // Resistance.
      for (const resistance of Object.values(this.resistance)) {
         resetMods(resistance.mod);
      }

      // Rating.
      for (const rating of Object.values(this.rating)) {
         resetMods(rating.mod);
      }

      // Speed.
      for (const speed of Object.values(this.speed)) {
         resetMods(speed.mod);
      }

      // Mod.
      for (const mod of Object.values(this.mod)) {
         resetMods(mod.mod);
      }
   }

   /**
    * Returns the list of stat keys under a rules-element selector, used to expand an 'all'-key element
    * into one element per concrete key.
    * @param {string} selector - The rules-element selector (attribute, rating, speed, etc.).
    * @returns {string[]} The concrete keys under that selector for this Character.
    * @private
    */
   _getSelectorKeys(selector) {
      if (selector === 'training' || selector === 'expertise') {
         return Object.keys(this.skill);
      }

      return this[selector] ? Object.keys(this[selector]) : [];
   }

   /**
    * Expands any rules element whose key is 'all' into one element per concrete key under its selector,
    * leaving every other element untouched. Operates on the gathered element list before bucketing, so
    * 'all' works uniformly for every operation that carries a key. Only a selector that names a stat map on the
    * Character (see `_getSelectorKeys`) expands; any other selector's element, such as a typed custom trait or
    * situation labelled "all", passes through unchanged.
    * @param {object[]} elements - The gathered rules elements (already tagged with a type).
    * @returns {object[]} A new array with 'all'-key elements expanded.
    * @private
    */
   _expandAllKeyElements(elements) {
      /** @type {object[]} */
      const expanded = [];
      for (const element of elements) {
         // Resolve the concrete keys under this selector; a selector that names no stat map (a typed custom trait,
         // spell tradition, or situation label, or any other non-stat selector) yields none, and its element passes
         // through with its key as typed.
         /** @type {string[]} */
         const keys = element.key === 'all' ? this._getSelectorKeys(element.selector) : [];
         if (keys.length === 0) {
            expanded.push(element);
            continue;
         }

         for (const key of keys) {
            expanded.push({
               ...element,
               key,
            });
         }
      }

      return expanded;
   }

   /**
    * Applies Rules Elements to the Character.
    * @private
    */
   _applyRulesElements() {
      // Get all the Rules Elements.
      /** @type {*[]} */
      const rulesElements = [];

      /**
       * Copies a source array of Rules Elements into the shared Rules Elements array, tagging each with the provided
       * category type and the name of the item or effect that owns it (situational modifiers list their sources).
       * Shared by the owned-item pass and the Active Effect passes.
       * @param {object[]} sourceElements - The source Rules Elements array to copy from.
       * @param {string} type - The type by which to categorize the Rules Elements (ability, equipment, effect, or
       * condition).
       * @param {string} sourceName - The name of the owning item or effect.
       */
      function processElements(sourceElements, type, sourceName) {
         /** @type {object[]} Copies of the source elements, safe to tag. */
         const copiedElements = structuredClone(sourceElements);
         for (const element of copiedElements) {
            element.type = type;
            element.sourceName = sourceName;
         }
         rulesElements.push(...copiedElements);
      }

      /**
       * Copies the Rules Elements from an item to the Rules Elements array.
       * @param {TitanItem} item - The Item to copy the Rules Elements from.
       * @param {string} type - The type by which to categorize the item's Rules Elements (ability or equipment).
       */
      function processItemElements(item, type) {
         processElements(item.system.rulesElement, type, item.name);
      }

      this.parent.items.forEach((item) => {
         if (item.system.rulesElement && item.system.rulesElement.length > 0) {

            // Equipment, armor, shields, and weapons only apply elements if they are equipped.
            // Abilities always apply their Rules Elements.
            switch (item.type) {
               case 'ability': {
                  processItemElements(item, 'ability');
                  break;
               }
               case 'armor': {
                  if (this.equipped.armor === item._id) {
                     processItemElements(item, 'equipment');
                  }
                  break;
               }
               case 'shield': {
                  if (this.equipped.shield === item._id) {
                     processItemElements(item, 'equipment');
                  }
                  break;
               }
               case 'weapon':
               case 'equipment': {
                  if (item.system.equipped) {
                     processItemElements(item, 'equipment');
                  }
                  break;
               }
               default: {
                  break;
               }
            }
         }
      });

      // The equipped armor's traits add synthetic situational check modifiers, sourced as the armor. They join the
      // gathered elements here because the conditional-check caches are built below, before _applyArmorAndShields runs.
      /** @type {TitanItem|boolean} The equipped armor, or false when none is equipped. */
      const equippedArmor = this.getEquippedArmor();
      if (equippedArmor) {
         processElements(createArmorTraitCheckModifiers(equippedArmor.system.trait), 'equipment', equippedArmor.name);
      }

      // Process Rules Elements from the actor's Active Effects: the 'effect' subtype (tagged 'effect') and
      // the 'condition' subtype (tagged 'condition') both contribute; disabled effects and other subtypes
      // are skipped.
      this.parent.effects.forEach((effect) => {
         if (
            effect.type === 'effect' &&
            !effect.disabled &&
            effect.system.rulesElement &&
            effect.system.rulesElement.length > 0
         ) {
            processElements(effect.system.rulesElement, 'effect', effect.name);
         }
      });

      // Also process Rules Elements from the actor's condition Active Effects. Conditions are the 'condition'
      // subtype; their rules elements derive stats through the same pipeline as effects, tagged 'condition'.
      this.parent.effects.forEach((effect) => {
         if (
            effect.type === 'condition' &&
            !effect.disabled &&
            effect.system.rulesElement &&
            effect.system.rulesElement.length > 0
         ) {
            processElements(effect.system.rulesElement, 'condition', effect.name);
         }
      });

      // Expand any 'all'-key elements into one element per concrete key under the selector.
      const allElements = this._expandAllKeyElements(rulesElements);

      // If there are any elements.
      if (allElements.length > 0) {

         // Sort the Rules Elements by type, and process them in order.
         /** @type {*[]} */
         const mulBaseElements = [];
         /** @type {*[]} */
         const flatModifierElements = [];
         /** @type {*[]} */
         const mulSumElements = [];
         /** @type {*[]} */
         const setSumElements = [];
         /** @type {*[]} */
         const fastHealingElements = [];
         /** @type {*[]} */
         const persistentDamageElements = [];
         /** @type {*[]} */
         const turnMessageElements = [];
         /** @type {*[]} */
         const rollMessageElements = [];
         /** @type {*[]} */
         const conditionalRatingModifierElements = [];
         /** @type {*[]} */
         const conditionalCheckModifierElements = [];
         /** @type {object[]} Situational (`situation`-selector) conditional check modifiers, cached apart. */
         const situationalCheckModifierElements = [];
         allElements.forEach((element) => {
            switch (element.operation) {
               case 'mulBase': {
                  mulBaseElements.push(element);
                  break;
               }
               case 'flatModifier': {
                  flatModifierElements.push(element);
                  break;
               }
               case 'mulSum': {
                  mulSumElements.push(element);
                  break;
               }
               case 'setSum': {
                  setSumElements.push(element);
                  break;
               }
               case 'fastHealing': {
                  fastHealingElements.push(element);
                  break;
               }
               case 'persistentDamage': {
                  persistentDamageElements.push(element);
                  break;
               }
               case 'turnMessage': {
                  turnMessageElements.push(element);
                  break;
               }
               case 'rollMessage': {
                  rollMessageElements.push(element);
                  break;
               }
               case 'conditionalRatingModifier': {
                  conditionalRatingModifierElements.push(element);
                  break;
               }
               case 'conditionalCheckModifier': {
                  // Situational modifiers never apply automatically, so they are cached apart from the summed ones.
                  if (element.selector === 'situation') {
                     situationalCheckModifierElements.push(element);
                  }
                  else {
                     conditionalCheckModifierElements.push(element);
                  }
                  break;
               }
               default: {
                  break;
               }
            }
         });

         // Create Rules Element object for easy reference later.
         this.parent.rulesElementsCache = {};

         // Apply elements.
         this._applyMulBaseElements(mulBaseElements);
         this._applyFlatModifierElements(flatModifierElements);
         this._applyMulSumElements(mulSumElements);
         this._applySetSumElements(setSumElements);
         this._applyFastHealingElements(fastHealingElements);
         this._applyPersistentDamageElements(persistentDamageElements);
         this._applyTurnMessageElements(turnMessageElements);
         this._applyRollMessageElements(rollMessageElements);
         this._applyConditionalRatingModifierElements(conditionalRatingModifierElements);
         this._applyConditionalCheckModifierElements(conditionalCheckModifierElements);
         this._applySituationalCheckModifierElements(situationalCheckModifierElements);
      }

      // Otherwise, set the Rules Elements cache to false.
      else {
         this.parent.rulesElementsCache = false;
      }
   }

   /**
    * Applies Mul-Base Rules Elements to this Character.
    * @param {MulBaseElement[]} elements - Array of Mul-Ease Rules Elements to apply.
    * @private
    */
   _applyMulBaseElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const mulBase = {};

         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            mulBase[selector] = {};

            // Sort elements by key.
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key.
            for (const [key, keyElements] of Object.entries(keys)) {
               mulBase[selector][key] = {};

               // Sort elements by type.
               const types = sortObjectsIntoContainerByKeyValue(keyElements, 'type');

               // Get the stat data.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const modObject = stat.mod;
               const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

               // For each type.
               for (const [type, typeElements] of Object.entries(types)) {
                  mulBase[selector][key][type] = 0;
                  // Apply each mod.
                  for (const element of typeElements) {
                     modObject[type] += roundDirectional(baseValue * (element.value - 1), element.rounding);
                     mulBase[selector][key][type] += element.value;
                  }
               }
            }
         }
         this.rulesElementsCache.mulBase = mulBase;
      }
      else {
         this.rulesElementsCache.mulBase = false;
      }
   }

   /**
    * Applies Flat Modifier Rules Elements to this Character.
    * @param {FlatModifierElement[]} elements - Array of Flat Modifier Rules Elements to apply.
    * @private
    */
   _applyFlatModifierElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const flatModifier = {};

         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            flatModifier[selector] = {};

            // Sort elements by key.
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key.
            for (const [key, keyElements] of Object.entries(keys)) {
               flatModifier[selector][key] = {};

               // Sort elements by type.
               const types = sortObjectsIntoContainerByKeyValue(keyElements, 'type');

               // Get the stat data.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const modObject = stat.mod;

               // For each type.
               for (const [type, typeElements] of Object.entries(types)) {
                  flatModifier[selector][key][type] = 0;

                  // Apply each mod.
                  for (const element of typeElements) {
                     modObject[type] += element.value;
                     flatModifier[selector][key][type] += element.value;
                  }
               }
            }
         }

         this.rulesElementsCache.flatModifier = flatModifier;
      }
      else {
         this.rulesElementsCache.flatModifier = false;
      }
   }

   /**
    * Applies Mul-Sum Rules Elements to this Character. Each element multiplies the stat's running total
    * (base value plus every accumulated mod bucket) and writes a corrective delta into the source's
    * bucket. Elements on the same stat are processed in order so multiple multiplications compound.
    * Runs after the additive appliers so the total it reads is complete.
    * @param {MulSumElement[]} elements - Array of Mul-Sum Rules Elements to apply.
    * @private
    */
   _applyMulSumElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const mulSum = {};

         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            mulSum[selector] = {};

            // Sort elements by key.
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key.
            for (const [key, keyElements] of Object.entries(keys)) {
               mulSum[selector][key] = {};

               // Get the stat data and its base.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

               // Apply each element in order, recomputing the running total so multiplications compound.
               for (const element of keyElements) {
                  let total = baseValue;
                  for (const mod of Object.values(stat.mod)) {
                     total += mod;
                  }
                  const delta = computeMulSumDelta(total, element.value, element.rounding);
                  stat.mod[element.type] += delta;
                  mulSum[selector][key][element.type] = (mulSum[selector][key][element.type] ?? 0) + delta;
               }
            }
         }

         this.rulesElementsCache.mulSum = mulSum;
      }
      else {
         this.rulesElementsCache.mulSum = false;
      }
   }

   /**
    * Applies Set-Sum Rules Elements to this Character. Each element forces the stat's running total to a
    * target value (set), floors it (min), or caps it (max), writing a corrective delta into the source's
    * bucket. Elements on the same stat are processed in order. Runs after the additive appliers.
    * @param {SetSumElement[]} elements - Array of Set-Sum Rules Elements to apply.
    * @private
    */
   _applySetSumElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const setSum = {};

         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            setSum[selector] = {};

            // Sort elements by key.
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key.
            for (const [key, keyElements] of Object.entries(keys)) {
               setSum[selector][key] = {};

               // Get the stat data and its base.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

               // Apply each element in order, recomputing the running total.
               for (const element of keyElements) {
                  let total = baseValue;
                  for (const mod of Object.values(stat.mod)) {
                     total += mod;
                  }
                  const delta = computeSetSumDelta(total, element.value, element.mode);
                  stat.mod[element.type] += delta;
                  setSum[selector][key][element.type] = (setSum[selector][key][element.type] ?? 0) + delta;
               }
            }
         }

         this.rulesElementsCache.setSum = setSum;
      }
      else {
         this.rulesElementsCache.setSum = false;
      }
   }

   /**
    * Applies Fast Healing Rules Elements to this Character.
    * @param {FastHealingElement[]} elements - Array of Fast Healing Rules Elements to apply.
    * @private
    */
   _applyFastHealingElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const fastHealing = {};

         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            fastHealing[selector] = {};

            // Sort elements by type.
            const types = sortObjectsIntoContainerByKeyValue(selectorElements, 'type');

            // For each type.
            for (const [type, typeElements] of Object.entries(types)) {
               fastHealing[selector][type] = 0;

               // Apply each mod.
               for (const element of typeElements) {
                  fastHealing[selector][type] += (element.value);
               }
            }
         }

         this.rulesElementsCache.fastHealing = fastHealing;
      }
      else {
         this.rulesElementsCache.fastHealing = false;
      }
   }

   /**
    * Applies Persistent Damage Rules Elements to this Character.
    * @param {PersistentDamageElement[]} elements - Array of Persistent Damage Rules Elements to apply.
    * @private
    */
   _applyPersistentDamageElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const persistentDamage = {};
         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            persistentDamage[selector] = {};

            // Sort elements by type.
            const types = sortObjectsIntoContainerByKeyValue(selectorElements, 'type');

            // For each type.
            for (const [type, typeElements] of Object.entries(types)) {
               persistentDamage[selector][type] = 0;
               // Apply each mod.
               for (const element of typeElements) {
                  persistentDamage[selector][type] += (element.value);
               }
            }
         }

         this.rulesElementsCache.persistentDamage = persistentDamage;
      }
      else {
         this.rulesElementsCache.persistentDamage = false;
      }
   }

   /**
    * Applies Turn Message Rules Elements to this Character.
    * @param {TurnMessageElement[]} elements - Array of Turn Message Rules Elements to apply.
    * @private
    */
   _applyTurnMessageElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const turnMessage = {};
         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            const selectorMessages = [];

            // For each element.
            for (const element of selectorElements) {

               // If the message is not blank, then add it.
               if (!isHTMLBlank(element.message)) {
                  selectorMessages.push(element.message);
               }
            }

            // Add the messages to the Rules Element cache only if we have valid messages.
            if (selectorMessages.length > 0) {
               turnMessage[selector] = selectorMessages;
            }
         }

         if (Object.keys(turnMessage).length > 0) {
            this.rulesElementsCache.turnMessage = turnMessage;
            return;
         }
      }
      this.rulesElementsCache.turnMessage = false;
   }

   /**
    * Applies Roll Message Rules Elements to this Character.
    * @param {RollMessageElement[]} elements - Array of Roll Damage Rules Elements to apply.
    * @private
    */
   _applyRollMessageElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const messages = {};

         // Sort elements by check type.
         const checkTypes = sortObjectsIntoContainerByKeyValue(elements, 'checkType');
         for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
            const checkTypeMessages = {};

            // Sort elements by selector.
            const selectors = sortObjectsIntoContainerByKeyValue(checkTypeElements, 'selector');

            // For each selector.
            for (const [selector, selectorElements] of Object.entries(selectors)) {

               // Handle special case for any and multi attack messages.
               if (selector === 'multiAttack' || selector === 'any') {
                  const selectorMessages = [];

                  // Apply each message.
                  for (const element of selectorElements) {
                     if (!isHTMLBlank(element.message)) {
                        selectorMessages.push(element.message);
                     }
                  }

                  // Add the messages to the Rules Element cache only if we have valid messages.
                  if (selectorMessages.length > 0) {
                     checkTypeMessages[selector] = selectorMessages;
                  }
               }
               else {
                  const selectorMessages = {};

                  // Sort elements by key.
                  let keys;
                  // A typed key is sorted by its camel-case form; any other key by its raw value.
                  if (TYPED_KEY_SELECTORS.rollMessage.includes(selector)) {
                     keys = sortObjectsIntoContainerByFunctionValue(
                        selectorElements,
                        (element) => camelize(element.key),
                     );
                  }
                  else {
                     keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');
                  }

                  // For each key.
                  for (const [key, keyElements] of Object.entries(keys)) {
                     const keyMessages = [];

                     // For each message.
                     for (const element of keyElements) {

                        // If the message is not blank, then add it.
                        if (!isHTMLBlank(element.message)) {
                           pushUnique(keyMessages, element.message);
                        }
                     }

                     // Add the messages to the Rules Element cache only if we have valid messages.
                     if (keyMessages.length > 0) {
                        selectorMessages[key] = keyMessages;
                     }
                  }

                  if (Object.keys(selectorMessages).length > 0) {
                     checkTypeMessages[selector] = selectorMessages;
                  }
               }
            }

            if (Object.keys(checkTypeMessages).length > 0) {
               messages[checkType] = checkTypeMessages;
            }
         }

         if (Object.keys(messages).length > 0) {
            this.rulesElementsCache.rollMessage = messages;
            return;
         }
      }

      this.rulesElementsCache.rollMessage = false;
   }

   /**
    * Applies Conditional Rating Modifier Rules Elements to this Character.
    * @param {ConditionalRatingModifierElement[]} elements - Array of Conditional Rating Modifier Rules Elements to
    * apply.
    * @private
    */
   _applyConditionalRatingModifierElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const conditionalRatingModifiers = {};
         // Sort elements by rating.
         const ratings = sortObjectsIntoContainerByKeyValue(elements, 'rating');

         // For each rating.
         for (const [rating, ratingElements] of Object.entries(ratings)) {
            {
               // Initialize rating map.
               conditionalRatingModifiers[rating] = {};
               const ratingMap = conditionalRatingModifiers[rating];

               // Sort elements by selector.
               const selectors = sortObjectsIntoContainerByKeyValue(ratingElements, 'selector');

               // For each selector.
               for (const [selector, selectorElements] of Object.entries(selectors)) {

                  // Hand special case for multi attack.
                  if (selector === 'multiAttack') {
                     ratingMap.multiAttack = {};

                     // Sort elements by type.
                     const types = sortObjectsIntoContainerByKeyValue(selectorElements, 'type');
                     for (const [type, typeElements] of Object.entries(types)) {

                        // Add the value of the multi attack bonus.
                        ratingMap.multiAttack[type] = 0;
                        for (const element of typeElements) {
                           ratingMap.multiAttack[type] += element.value;
                        }
                     }
                  }
                  else {
                     // Initialize rating map.
                     ratingMap[selector] = {};
                     const selectorMap = ratingMap[selector];

                     // Sort elements by key.
                     let keys;
                     // A typed key is sorted by its camel-case form; any other key by its raw value.
                     if (TYPED_KEY_SELECTORS.conditionalRatingModifier.includes(selector)) {
                        keys = sortObjectsIntoContainerByFunctionValue(
                           selectorElements,
                           (element) => camelize(element.key),
                        );
                     }
                     else {
                        keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');
                     }

                     // For each key.
                     for (const [key, keyElements] of Object.entries(keys)) {
                        // Initialize key value.
                        selectorMap[key] = {};
                        {
                           const keyMap = selectorMap[key];

                           // Sort elements by type.
                           const types = sortObjectsIntoContainerByKeyValue(keyElements, 'type');

                           // For each type.
                           for (const [type, typeElements] of Object.entries(types)) {
                              keyMap[type] = 0;

                              // For each element.
                              for (const element of typeElements) {

                                 // Add to the key value.
                                 keyMap[type] += element.value;
                              }
                           }
                        }
                     }
                  }
               }
            }
         }

         // Apply defense modifiers if appropriate.
         // These are different from other modifiers because they are always on.
         if (conditionalRatingModifiers.defense) {

            // Apply armor trait defense modifiers.
            const armor = this.getEquippedArmor();
            if (armor) {
               this._applyItemTraitDefenseMods(conditionalRatingModifiers.defense, armor);
            }

            // Apply shield trait defense modifiers.
            const shield = this.getShield();
            if (shield) {
               this._applyItemTraitDefenseMods(conditionalRatingModifiers.defense, shield);
            }
         }

         this.rulesElementsCache.conditionalRatingModifier = conditionalRatingModifiers;
         return;
      }

      this.rulesElementsCache.conditionalRatingModifier = false;
   }

   /**
    * Applies Defense mods from trait-based Conditional Rating Modifier Rules Elements to this Character.
    * @param {ConditionalRatingModifierElement[]} elements - Array of Conditional Rating Modifier Rules Elements that
    * modify defense.
    * @param {TitanItem} item - Item to check for satisfying modifier conditions.
    * @private
    */
   _applyItemTraitDefenseMods(elements, item) {
      if (item) {
         // Get item traits.
         const itemRollData = item.system.getRollData();
         const itemTraits = itemRollData.trait.map((trait) => trait.name);

         // If the item has traits.
         if (itemTraits.length > 0) {

            // Get the item trait mods for this trait.
            const itemTraitMods = this._getConditionalRatingModsForSelectorKeys(
               elements,
               `${itemRollData.type}Trait`,
               itemTraits,
            );

            // If there are valid item trait mods.
            if (itemTraitMods) {

               // Add the value of each mod.
               for (const [type, value] of Object.entries(itemTraitMods)) {
                  this.rating.defense.mod[type] += value;
               }
            }
         }

         // Cache the unique Custom Traits.
         /** @type {*[]} */
         const customTraits = [];
         for (const trait of itemRollData.customTrait) {
            pushUnique(customTraits, camelize(trait.name));
         }

         // If there are Custom Traits.
         if (customTraits.length > 0) {
            const capitalizedItemType = item.type.charAt(0).toUpperCase() + item.type.slice(1);

            // Get custom trait mods.
            const customTraitMods = this._getConditionalRatingModsForSelectorKeys(
               elements,
               `custom${capitalizedItemType}Trait`,
               customTraits,
            );

            // If there are valid custom trait mods.
            if (customTraitMods) {
               for (const [type, value] of Object.entries(customTraitMods)) {
                  this.rating.defense.mod[type] += value;
               }
            }
         }
      }
   }

   /**
    * Applies Conditional Check Modifier Rules Elements to this Character.
    * @param {ConditionalCheckModifierElement[]} elements - Array of Conditional Check Modifier Rules Elements to apply.
    * @private
    */
   _applyConditionalCheckModifierElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const conditionalCheckModifiers = {};

         // Sort elements by modifier type.
         const modifierTypes = sortObjectsIntoContainerByKeyValue(elements, 'modifierType');

         // For each modifier type.
         for (const [modifierType, modifierTypeElements] of Object.entries(modifierTypes)) {
            const modifierTypeMap = {};
            conditionalCheckModifiers[modifierType] = modifierTypeMap;

            // Sort elements by check type.
            const checkTypes = sortObjectsIntoContainerByKeyValue(modifierTypeElements, 'checkType');

            // For each check type.
            for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
               const checkTypeMap = {};
               modifierTypeMap[checkType] = checkTypeMap;

               // Sort elements by selector.
               const selectors = sortObjectsIntoContainerByKeyValue(checkTypeElements, 'selector');

               // For each selector.
               for (const [selector, selectorElements] of Object.entries(selectors)) {
                  switch (selector) {
                     // Special case handling for any and multi-attack.
                     case 'any':
                     case 'multiAttack': {
                        checkTypeMap[selector] = 0;
                        for (const element of selectorElements) {
                           checkTypeMap[selector] += this._getConditionalCheckModifierValue(element);
                        }
                        break;
                     }

                     // Normal flow.
                     default: {
                        checkTypeMap[selector] = {};
                        const selectorMap = checkTypeMap[selector];

                        // Sort the objects by key.
                        let keys;
                        // User-typed keys are grouped by their normalized form, which lookups also use.
                        if (TYPED_KEY_SELECTORS.conditionalCheckModifier.includes(selector)) {
                           keys = sortObjectsIntoContainerByFunctionValue(
                              selectorElements,
                              (element) => this._normalizeConditionalCheckModKey(selector, element.key),
                           );
                        }
                        else {
                           keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');
                        }

                        // For each key.
                        for (const [key, keyElements] of Object.entries(keys)) {
                           // Initialize key value.
                           selectorMap[key] = 0;
                           {
                              // For each element.
                              for (const element of keyElements) {

                                 // Add to the key value.
                                 selectorMap[key] += this._getConditionalCheckModifierValue(element);
                              }
                           }
                        }

                        break;
                     }
                  }
               }
            }
         }

         this.rulesElementsCache.conditionalCheckModifier = conditionalCheckModifiers;
         return;
      }

      this.rulesElementsCache.conditionalCheckModifier = false;
   }

   /**
    * Gets the value a Conditional Check Modifier element contributes to a cache. An Automatic Failure element counts
    * as 1 whatever its stored value, so any matching element makes a lookup positive.
    * @param {ConditionalCheckModifierElement} element - The rules element being added to the cache.
    * @returns {number} The element's contribution.
    * @private
    */
   _getConditionalCheckModifierValue(element) {
      return element.modifierType === 'automaticFailure' ? 1 : element.value;
   }

   /**
    * Caches the situational (`situation`-selector) Conditional Check Modifier Rules Elements apart from the summed
    * modifiers, because they never apply automatically. Each cached entry is `{ checkType, key, label, [labelKey],
    * modifierType, skill, source, value }`: `key` is the camel-case form of the element's key (the typed text, or a
    * system situation's canonical string), `label` is the element's own `label` when it has one (a system situation,
    * localized) and its key otherwise, `labelKey` is present only for a system situation, `skill` narrows the entry to
    * checks using one Skill (`''` = any; an element without a `skill` field is cached as `''`), and `source` names the
    * owning item or effect.
    * @param {ConditionalCheckModifierElement[]} elements - The situational elements, each tagged with its `sourceName`.
    * @private
    */
   _applySituationalCheckModifierElements(elements) {
      if (elements.length > 0) {
         this.rulesElementsCache.situationalCheckModifier = elements.map((element) => ({
            checkType: element.checkType,
            key: this._normalizeConditionalCheckModKey('situation', element.key),
            label: element.label ?? element.key,
            ...(element.labelKey ? { labelKey: element.labelKey } : {}),
            modifierType: element.modifierType,
            skill: element.skill ?? '',
            source: element.sourceName,
            value: this._getConditionalCheckModifierValue(element),
         }));
         return;
      }

      this.rulesElementsCache.situationalCheckModifier = false;
   }

   /**
    * Applies Armor and Shield modifiers to the Character's stats.
    * @private
    */
   _applyArmorAndShields() {

      // Apply shield defense bonus.
      const shield = this.getShield();
      if (shield) {
         this.rating.defense.mod.equipment += shield.system.defense;
      }

      // Apply armor bonus.
      const armor = this.getEquippedArmor();
      if (armor) {
         this.mod.armor.mod.equipment += armor.system.armor.value;

         // Add encumbrance if appropriate.
         const armorTraits = armor.system.trait;
         for (let idx = 0; idx < armorTraits.length; idx++) {

            // If heavy, decrease all speeds.
            if (armorTraits[idx].name === 'heavy') {
               for (const speed of Object.values(this.speed)) {

                  // Sum the base speed and the mods applied so far; value is not derived until later.
                  let totalSpeed = speed.baseValue;

                  // Add the mods.
                  for (const mod of Object.values(speed.mod)) {
                     totalSpeed += mod;
                  }

                  // Decrease speed if it would not drop below 0.
                  if (totalSpeed > 0) {
                     speed.mod.equipment -= 1;
                  }
               }
               break;
            }
         }
      }
   }

   /* === Conditional rating modifiers === */

   /**
    * Applies all stat modifiers.
    * @private
    */
   _applyMods() {
      // Get a reference to the parent system data.
      const systemData = this;

      /**
       * Applies mods to a stat's final value.
       * @param {object} stat - The stat to apply mods to.
       */
      function applyMods(stat) {

         // Stat value = base value + sum of all mod values.
         stat.value = stat.baseValue;
         for (const mod of Object.values(stat.mod)) {
            stat.value = Math.max(stat.value + mod, 0);
         }
      }

      /**
       * Applies mods to the final value of a stat with nested stats.
       * @param {object} stat - The stat to apply mods to.
       */
      function applyModsDeep(stat) {

         // Apply mods to each stat in the stats object.
         for (const nestedState of Object.values(stat)) {
            applyMods(nestedState);
         }
      }

      // Attributes.
      applyModsDeep(systemData.attribute);

      // Skills.
      for (const skill of Object.values(systemData.skill)) {
         // Training.
         applyMods(skill.training);

         // Expertise.
         applyMods(skill.expertise);
      }

      // Resistances.
      applyModsDeep(systemData.resistance);

      // Ratings.
      applyModsDeep(systemData.rating);

      // Resources.
      // Slightly different because we apply mods to the max, rather than to the value.
      for (const resource of Object.values(systemData.resource)) {
         resource.max = resource.maxBase;
         for (const mod of Object.values(resource.mod)) {
            resource.max = Math.max(resource.max + mod, 0);
         }
      }

      // Speeds.
      applyModsDeep(systemData.speed);

      // Mods.
      for (const mod of Object.values(systemData.mod)) {
         mod.value = 0;
         for (const modMod of Object.values(mod.mod)) {
            mod.value += modMod;
         }
      }
   }

   /**
    * Triggered at the end of data preparation to ensure that all resources remain within minimum and maximum bounds.
    * @private
    */
   _clampResources() {
      for (const resource of Object.values(this.resource)) {
         resource.value = clamp(resource.value, 0, resource.max);
      }
   }

   /* === Checks === */

   /**
    * Helper function for getting the sum conditional rating modifiers for the inputted selector and an array of keys.
    * @param {object} conditionalRatingModifiers - The parent actor's Rules Element cache of mods for rating.
    * @param {string} selector - The type of condition for modifying the rating.
    * @param {*[]} keys - Array of keys to test against.
    * @returns {object|boolean} Object containing the mods to apply, sorted by source type, or false if there were no
    * mods matching the input.
    * @private
    */
   _getConditionalRatingModsForSelectorKeys(
      conditionalRatingModifiers,
      selector,
      keys,
   ) {
      // Initialize return value object for categorizing the bonuses by type.
      /** @type {object} */
      const retVal = {};

      // If there are mods for this selector.
      const selectorMods = conditionalRatingModifiers[selector];
      if (selectorMods) {

         // Add the mods for each matching key.
         keys.forEach((key) => {
            const keyMod = selectorMods[key];
            if (keyMod) {
               for (const [type, value] of Object.entries(keyMod)) {
                  retVal[type] = retVal[type] ?? 0;
                  retVal[type] += value;
               }
            }
         });
      }

      return Object.keys(retVal).length > 0 ? retVal : false;
   }

   /**
    * Helper function for getting the conditional rating modifiers for the inputted selector and key pair.
    * @param {object} conditionalRatingModifiers - The parent actor's Rules Element cache of mods for rating.
    * @param {string} selector - The type of condition for modifying the rating (attackType, etc.).
    * @param {string} key - The specific result of the condition for modifying the rating (melee, ranged, etc.).
    * @returns {object|boolean} Object containing the mods to apply, sorted by source type, or false if there were no
    * mods matching the input.
    * @private
    */
   _getConditionalRatingModsForSelectorKey(
      conditionalRatingModifiers,
      selector,
      key,
   ) {
      // If there are mods for this selector.
      const selectorMods = conditionalRatingModifiers[selector];
      if (selectorMods) {

         // Return the sum of this key for the mod.
         const keyMod = selectorMods[key];
         if (keyMod) {
            return keyMod;
         }
      }

      return false;
   }

   /**
    * Requests an Attribute Check from this Character. Rolls straight to chat or opens the options dialog, as the
    * `getCheckOptions` setting, the modifier key, and the check's situational modifiers decide.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestAttributeCheck(options) {
      // Invalid options fail here, before the situational lookup reads them.
      if (!this.validateAttributeCheckOptions(options)) {
         return;
      }

      // The Skill comes from the options alone (`none` when unset), so no Actor-derived field is computed here.
      /** @type {boolean} Whether any situational modifier applies to the check. */
      const hasSituationalModifiers = this.getSituationalCheckModifiers(
         'attribute',
         { skill: createAttributeCheckOptions(options).skill },
      ).length > 0;

      // Roll straight to chat, or open the dialog for adjusting the check.
      if (!shouldGetCheckOptions(hasSituationalModifiers)) {
         await this.rollAttributeCheck(options);
      }
      else {
         this._createAttributeCheckDialog(options);
      }
   }

   /**
    * Creates an Attribute check, rolls it, and sends it to chat.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async rollAttributeCheck(options) {

      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateAttributeCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeAttributeCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getAttributeCheckParameters(checkOptions);

         // Create the check.
         const check = new AttributeCheck(checkParameters);

         // Get the messages for the check.
         const checkMessages = this._getAttributeCheckMessages(checkParameters);

         // Roll the check and send it to chat.
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of an Attribute Check.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @private
    */
   _createAttributeCheckDialog(options) {
      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateAttributeCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeAttributeCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getAttributeCheckParameters(checkOptions);

         // Create and display the check dialog.
         new AttributeCheckDialog(
            checkOptions,
            checkParameters,
            this.parent,
            options,
         ).render(true);
      }
   }

   /**
    * Validates the options for an Attribute check.
    * @param {object} options - Options for the Check.
    * @param {boolean} [report] - Whether to report a failed validation as an error; an open check dialog tests
    * speculative options silently.
    * @returns {boolean} Whether the check options were valid.
    */
   validateAttributeCheckOptions(options, report = true) {
      // Ensure options were provided.
      if (!options) {
         if (report) {
            game.titan.error(
               'Attribute Check failed before construction. No Check Options were provided.',
               this);
         }

         return false;
      }

      // Ensure an attribute or skill were provided.
      if ((!options.attribute || options.attribute === 'default') &&
         (!options.skill || options.skill === 'none')) {
         if (report) {
            game.titan.error(
               'Attribute Check failed before construction. No Attribute or Skill provided.',
               options,
               this);
         }

         return false;
      }

      return true;
   }

   /**
    * Populates Attribute Check Options with this Character's specific data, unless specific overrides were applied.
    * @param {object} options - Options for the Check.
    * @returns {AttributeCheckOptions} The new, fully-populated Attribute Check Options.
    */
   initializeAttributeCheckOptions(options) {
      const checkOptions = createAttributeCheckOptions(options);

      // If no attribute is set.
      if (checkOptions.attribute === 'default') {
         // We know from prior validation that a skill must have been set.
         // Set the attribute to the default for the set skill.
         checkOptions.attribute = this.skill[checkOptions.skill].defaultAttribute;
      }

      // Get conditional modifiers if none were provided.
      // Dice mod.
      if (options.diceMod === undefined) {
         checkOptions.diceMod =
            this.getAttributeCheckMod('dice', checkOptions.attribute, checkOptions.skill);
      }

      // Expertise mod.
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod =
            this.getAttributeCheckMod('expertise', checkOptions.attribute, checkOptions.skill);
      }

      // Training mod.
      if (options.trainingMod === undefined) {
         checkOptions.trainingMod =
            this.getAttributeCheckMod('training', checkOptions.attribute, checkOptions.skill);
      }

      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getAttributeCheckMod('advantage', checkOptions.attribute, checkOptions.skill);
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure =
            this.getAttributeCheckMod('automaticFailure', checkOptions.attribute, checkOptions.skill) > 0;
      }

      return checkOptions;
   }

   /**
    * Gets the modifier for a specific aspect of an Attribute Check.
    * @param {string} modifierType - The modifier type to check for.
    * @param {string} attribute - The Attribute being used for the check.
    * @param {string} skill - The Skill being used for the check.
    * @returns {number} The modifier to apply to this aspect of the check.
    */
   getAttributeCheckMod(modifierType, attribute, skill) {
      return this._sumConditionalCheckMods(modifierType, 'attribute', {
         attribute,
         skill,
      });
   }

   /**
    * Gets the parameters for an Attribute Check to be rolled by this Character, accounting for the provided options.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @returns {AttributeCheckParameters} Parameters for the check, calculated from the provided options.
    */
   getAttributeCheckParameters(options) {
      // Initialize check parameters.
      const parameters = createAttributeCheckParameters(options);

      // Add the situations the options name (the dialog's ticks) before any total is derived.
      this._applySituationalModifiers(parameters, 'attribute', options.situations);

      // Initialize common attribute based check parameters.
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      // Advantage adjusts the final Difficulty.
      this._applyCheckAdvantage(parameters);

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Attribute Check.
    * @param {AttributeCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, or false if there are none.
    * @private
    */
   _getAttributeCheckMessages(parameters) {
      // If there are roll messages to be checked.
      if (this.rulesElementsCache?.rollMessage) {
         /** @type {*[]} */
         const messages = [];

         // Get messages that apply to any check type.
         const anyCheckMessages = this.rulesElementsCache.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check.
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            const skill = parameters.skill;
            if (skill && skill !== 'none') {
               this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);
            }
         }

         // Get messages that apply specifically to Attribute Checks.
         const attributeCheckMessages = this.rulesElementsCache.rollMessage?.attribute;
         if (attributeCheckMessages) {

            // Get messages that apply to any Attribute Check.
            this._getCheckMessagesForAny(attributeCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(attributeCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            this._getCheckMessagesForSkill(attributeCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests a Resistance Check from this Character. Rolls straight to chat or opens the options dialog, as the
    * `getCheckOptions` setting, the modifier key, and the check's situational modifiers decide.
    * @param {ResistanceCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestResistanceCheck(options) {
      // Invalid options fail here, before the situational lookup reads them.
      if (!this.validateResistanceCheckOptions(options)) {
         return;
      }

      /** @type {boolean} Whether any situational modifier applies to the check. */
      const hasSituationalModifiers = this.getSituationalCheckModifiers('resistance').length > 0;

      // Roll straight to chat, or open the dialog for adjusting the check.
      if (!shouldGetCheckOptions(hasSituationalModifiers)) {
         await this.rollResistanceCheck(options);
      }
      else {
         this._createResistanceCheckDialog(options);
      }
   }

   /**
    * Creates a Resistance Check, rolls it, and sends it to chat.
    * @param {ResistanceCheckOptions} options - Options for the Resistance Check.
    * @returns {Promise<void>}
    */
   async rollResistanceCheck(options) {

      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateResistanceCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeResistanceCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getResistanceCheckParameters(checkOptions);

         // Create the check.
         const check = new ResistanceCheck(checkParameters);

         // Get the messages for the check.
         const checkMessages = this._getResistanceCheckMessages(checkParameters);

         // Roll the check and send it to chat.
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of a Resistance Check.
    * @param {ResistanceCheckOptions} options - Options for the Check.
    * @private
    */
   _createResistanceCheckDialog(options) {
      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateResistanceCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeResistanceCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getResistanceCheckParameters(checkOptions);

         // Create and display the check dialog.
         new ResistanceCheckDialog(
            checkOptions,
            checkParameters,
            this.parent,
            options,
         ).render(true);
      }
   }

   /**
    * Validates the options for a Resistance check.
    * @param {object} options - Initial options for the check.
    * @param {boolean} [report] - Whether to report a failed validation as an error; an open check dialog tests
    * speculative options silently.
    * @returns {boolean} Whether the check options were valid.
    */
   validateResistanceCheckOptions(options, report = true) {
      // Ensure options were provided.
      if (!options) {
         if (report) {
            game.titan.error(
               'Resistance Check failed before construction. No Check Options were provided.',
               this);
         }

         return false;
      }

      // Ensure a resistance is set.
      if (!options.resistance) {
         if (report) {
            game.titan.error(
               'Resistance Check failed before construction. No Resistance provided.',
               options,
               this);
         }

         return false;
      }

      return true;
   }

   /**
    * Populates Resistance Check Options with this Character's conditional modifiers, unless specific overrides were
    * applied. Training does not apply to Resistance Checks.
    * @param {object} options - Options for the Check.
    * @returns {ResistanceCheckOptions} The new, fully-populated Resistance Check Options.
    */
   initializeResistanceCheckOptions(options) {
      /** @type {ResistanceCheckOptions} The options, with every unset field at its default. */
      const checkOptions = createResistanceCheckOptions(options);

      // Dice mod.
      if (options.diceMod === undefined) {
         checkOptions.diceMod = this.getResistanceCheckMod('dice', checkOptions.resistance);
      }

      // Expertise mod.
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod = this.getResistanceCheckMod('expertise', checkOptions.resistance);
      }

      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getResistanceCheckMod('advantage', checkOptions.resistance);
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getResistanceCheckMod('automaticFailure', checkOptions.resistance) > 0;
      }

      return checkOptions;
   }

   /**
    * Gets the modifier for a specific aspect of a Resistance Check. A Resistance Check has no Attribute or Skill, so
    * of the `any`-check-type modifiers only the `any` selector applies; `resistance`-check-type modifiers apply
    * through the `any` selector and through the `resistance` selector keyed by the rolled Resistance.
    * @param {string} modifierType - The modifier type to check for.
    * @param {string} resistance - The Resistance being rolled (reflexes, resilience, or willpower).
    * @returns {number} The modifier to apply to this aspect of the check.
    */
   getResistanceCheckMod(modifierType, resistance) {
      return this._sumConditionalCheckMods(modifierType, 'resistance', { resistance });
   }

   /**
    * Gets the parameters for a Resistance Check to be rolled by this Character, accounting for the provided options.
    * @param {ResistanceCheckOptions} options - Options for the Check.
    * @returns {ResistanceCheckParameters} Parameters for the check, calculated from the provided options.
    */
   getResistanceCheckParameters(options) {
      // Initialize check parameters.
      const parameters = createResistanceCheckParameters(options);

      // Add the situations the options name (the dialog's ticks) before any total is derived.
      this._applySituationalModifiers(parameters, 'resistance', options.situations);

      const actorRollData = this.getRollData();

      // Get the resistance dice.
      parameters.resistanceDice = actorRollData.resistance[parameters.resistance].value;

      // Add the dice mod to the total dice.
      parameters.totalDice = parameters.resistanceDice + parameters.diceMod;

      // Calculate the total expertise.
      parameters.totalExpertise = parameters.expertiseMod * (parameters.doubleExpertise === true ? 2 : 1);

      // Advantage adjusts the final Difficulty.
      this._applyCheckAdvantage(parameters);

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Resistance Check.
    * @param {ResistanceCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, if any, or false if there are none.
    * @private
    */
   _getResistanceCheckMessages(parameters) {
      // If there are roll messages to be checked.
      if (this.rulesElementsCache?.rollMessage) {
         /** @type {*[]} */
         const messages = [];

         // Get messages that apply to any check type.
         const anyCheckMessages = this.rulesElementsCache.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check.
            this._getCheckMessagesForAny(anyCheckMessages, messages);
         }

         // Get messages that apply to specifically Resistance Checks.
         const resistanceCheckMessages = this.rulesElementsCache.rollMessage.resistance;
         if (resistanceCheckMessages) {

            // Get messages that apply to any Resistance Check.
            this._getCheckMessagesForAny(resistanceCheckMessages, messages);

            // Get messages that apply to this Resistance.
            this._getResistanceMessages(resistanceCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests an Attack Check from this Character. Rolls straight to chat or opens the options dialog, as the
    * `getCheckOptions` setting, the modifier key, and the check's situational modifiers decide.
    * @param {AttackCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestAttackCheck(options) {
      // Invalid options fail here, before the situational lookup reads them.
      if (!this.validateAttackCheckOptions(options)) {
         return;
      }

      /** @type {boolean} Whether any situational modifier applies to the check. */
      const hasSituationalModifiers = this.getSituationalCheckModifiers(
         'attack',
         { skill: this.initializeAttackCheckOptions(options).skill },
      ).length > 0;

      // Roll straight to chat, or open the dialog for adjusting the check.
      if (!shouldGetCheckOptions(hasSituationalModifiers)) {
         await this.rollAttackCheck(options);
      }
      else {
         this._createAttackCheckDialog(options);
      }
   }

   /**
    * Creates an Attack Check, rolls it, and sends it to chat.
    * @param {AttackCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async rollAttackCheck(options) {

      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateAttackCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeAttackCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getAttackCheckParameters(checkOptions);

         // Create the check.
         const check = new AttackCheck(checkParameters);

         // Get the messages for the check.
         const checkMessages = this._getAttackCheckMessages(checkParameters);

         // Roll the check and send it to chat.
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of an Attack Check.
    * @param {AttackCheckOptions} options - Options for the Check.
    * @private
    */
   _createAttackCheckDialog(options) {
      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateAttackCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeAttackCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getAttackCheckParameters(checkOptions);

         // A target's Defense resolved now is fixed for the dialog's lifetime, like a caller's value; without a target
         // the Defense stays derived, following the attacker's fallback rating and picking up a later target.
         /** @type {object} The options the dialog keeps through its rebuilds. */
         const callerOptions = options.targetDefense === undefined && getTargetedCharacters().length > 0 ?
            {
               ...options,
               targetDefense: checkOptions.targetDefense,
            } :
            options;

         // Create and display the check dialog.
         new AttackCheckDialog(
            checkOptions,
            checkParameters,
            this.parent,
            callerOptions,
         ).render(true);
      }
   }

   /**
    * Validates the options for an Attack Check.
    * @param {object} options - Options for the Check.
    * @param {boolean} [report] - Whether to report a failed validation as an error; an open check dialog tests
    * speculative options silently.
    * @returns {boolean} Whether the check options were valid.
    */
   validateAttackCheckOptions(options, report = true) {
      // Ensure options were provided.
      if (!options) {
         if (report) {
            game.titan.error(
               'Attack Check failed before construction. No Check Options were provided.',
               this);
         }

         return false;
      }

      // Ensure an item ID  was provided.
      if (!options.itemId) {
         if (report) {
            game.titan.error(
               'Attack Check failed before construction. No Item ID was provided.',
               options,
               this);
         }

         return false;
      }

      // Ensure the item exists in the parent actor.
      const item = this.parent.items.get(options.itemId);
      if (!item) {
         if (report) {
            game.titan.error(
               'Attack Check failed before construction. Item ID was invalid.',
               options,
               this);
         }

         return false;
      }

      // Ensure the attack index names one of the weapon's attacks.
      const numAttacks = item.system.attack.length;
      if ((options.attackIdx ?? 0) >= numAttacks) {
         if (report) {
            game.titan.error(
               'Attack Check failed before construction. Attack Idx was out of range.',
               options,
               this);
         }

         return false;
      }

      return true;
   }

   /**
    * Populates Attack Check Options with this Character's specific data, unless specific overrides were applied.
    * @param {object} options - Options for the Check.
    * @returns {AttributeCheckOptions} The new, fully-populated Attack Check Options.
    */
   initializeAttackCheckOptions(options) {
      const checkOptions = createAttackCheckOptions(options);

      // Cache the item and attack for later.
      const itemRollData = this.parent.items.get(checkOptions.itemId).system.getRollData();
      const attack = itemRollData.attack[checkOptions.attackIdx];

      // If no attribute is set.
      if (checkOptions.attribute === 'default') {

         // Set the attribute to the value stored in the attack.
         checkOptions.attribute = attack.attribute;
      }

      // If no skill is set.
      if (checkOptions.skill === 'default') {

         // Set the skill to the value stored in the attack.
         checkOptions.skill = attack.skill;
      }

      // If multi-attack is not set.
      if (options.multiAttack === undefined) {

         // Set multi-attack to the value stored in item.
         checkOptions.multiAttack = itemRollData.multiAttack;
      }

      // If plus extra successes damage is not set.
      if (options.plusExtraSuccessDamage === undefined) {

         // Set plus extra successes damage to the value stored in the attack.
         checkOptions.plusExtraSuccessDamage = attack.plusExtraSuccessDamage;
      }

      // If attack-type is not set.
      if (options.type === undefined) {

         // Set the type to the value stored in the attack.
         checkOptions.type = attack.type;
      }

      // If the range is not set.
      if (options.range === undefined) {

         // Set the range to the value stored in the attack.
         checkOptions.range = attack.range;
      }

      // Update flags for attack traits.
      const attackTraits = attack.trait.map((trait) => trait.name);
      for (const trait of attackTraits) {
         switch (trait) {
            case 'cleave': {
               if (options.cleave === undefined) {
                  checkOptions.cleave = true;
               }
               break;
            }
            case 'flurry': {
               if (options.flurry === undefined) {
                  checkOptions.flurry = true;
               }
               break;
            }
            case 'ineffective': {
               if (options.ineffective === undefined) {
                  checkOptions.ineffective = true;
               }
               break;
            }
            case 'magical': {
               if (options.magical === undefined) {
                  checkOptions.magical = true;
               }
               break;
            }
            case 'rend': {
               if (options.rend === undefined) {
                  checkOptions.rend = true;
               }
               break;
            }
            case 'penetrating': {
               if (options.penetrating === undefined) {
                  checkOptions.penetrating = true;
               }
               break;
            }
            default: {
               break;
            }
         }
      }

      // Cache the unique custom and attack traits.
      /** @type {*[]} */
      const customTraits = [];
      for (const trait of itemRollData.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }
      for (const trait of attack.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }

      // Get conditional modifiers.
      // Dice mod.
      if (options.diceMod === undefined) {
         checkOptions.diceMod = this.getAttackCheckMod(
            'dice',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Expertise mod.
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod = this.getAttackCheckMod(
            'expertise',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Training mod.
      if (options.trainingMod === undefined) {
         checkOptions.trainingMod = this.getAttackCheckMod(
            'training',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Damage mod.
      if (options.damageMod === undefined) {
         checkOptions.damageMod = this.getAttackCheckMod(
            'damage',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getAttackCheckMod(
            'advantage',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getAttackCheckMod(
            'automaticFailure',
            checkOptions.attribute,
            checkOptions.skill,
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         ) > 0;
      }

      // Melee.
      if (options.attackerMelee === undefined) {
         checkOptions.attackerMelee = this.rating.melee.value + this._getAttackRatingMod(
            'melee',
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Accuracy.
      if (options.attackerAccuracy === undefined) {
         checkOptions.attackerAccuracy = this.rating.accuracy.value + this._getAttackRatingMod(
            'accuracy',
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Target defense.
      if (options.targetDefense === undefined) {
         const targets = getTargetedCharacters();
         if (targets.length > 0) {
            checkOptions.targetDefense = targets[0].system.getRollData().rating.defense.value;
         }
         else {
            checkOptions.targetDefense = checkOptions.type === 'melee' ?
               checkOptions.attackerMelee :
               checkOptions.attackerAccuracy;
         }
      }

      return checkOptions;
   }

   /**
    * Gets the modifier for a specific aspect of a specific Attack Check.
    * @param {string} modifierType - The modifier type to check for.
    * @param {string} attribute - The Attribute being used for the check.
    * @param {string} skill - The Skill being used for the check.
    * @param {boolean} multiAttack - Whether the attack is a multi-attack.
    * @param {string} type - The Type of Attack (Melee or Ranged).
    * @param {string[]} attackTraits - The attack Traits associated with the check.
    * @param {string[]} customTraits - The camel-case names of the Custom Traits associated with the attack and weapon.
    * @returns {number} The modifier to apply to this aspect of the check.
    */
   getAttackCheckMod(
      modifierType,
      attribute,
      skill,
      multiAttack,
      type,
      attackTraits,
      customTraits,
   ) {
      return this._sumConditionalCheckMods(modifierType, 'attack', {
         attackTrait: attackTraits,
         attackType: type,
         attribute,
         customTrait: customTraits,
         multiAttack,
         skill,
      });
   }

   /**
    * Gets the modifier for a specific rating of a specific Attack Check.
    * @param {string} rating - The rating being checked.
    * @param {boolean} multiAttack - Whether this attack is a multi-attack.
    * @param {string} type - The type of attack (melee or ranged).
    * @param {object[]} attackTraits - The standard traits associated with the attack.
    * @param {string[]} customTraits - The Custom Traits associated with the attack and weapon.
    * @returns {number} The attack rating for this attack with modifiers applied.
    */
   _getAttackRatingMod(
      rating,
      multiAttack,
      type,
      attackTraits,
      customTraits,
   ) {
      /** @type {number} */
      let retVal = 0;

      // If there are modifiers for this rating.
      const conditionalRatingMods = this.rulesElementsCache?.conditionalRatingModifier?.[rating];
      if (conditionalRatingMods) {

         // Get mods that apply to attack traits.
         if (attackTraits.length > 0) {
            const attackTraitMods = this._getConditionalRatingModsForSelectorKeys(
               conditionalRatingMods,
               'attackTrait',
               attackTraits,
            );
            if (attackTraitMods) {
               retVal += getSumOfObjectValues(attackTraitMods);
            }
         }

         // Get mods that apply to the check's Custom Traits.
         if (customTraits.length > 0) {
            const attackTraitMods = this._getConditionalRatingModsForSelectorKeys(
               conditionalRatingMods,
               'customWeaponTrait',
               customTraits,
            );
            if (attackTraitMods) {
               retVal += getSumOfObjectValues(attackTraitMods);
            }
         }

         // Get modifiers for attack type.
         const attackTypeMods = this._getConditionalRatingModsForSelectorKey(
            conditionalRatingMods,
            'attackType',
            type,
         );
         if (attackTypeMods) {
            retVal += getSumOfObjectValues(attackTypeMods);
         }

         // Get multi-attack modifiers if multi-attacking.
         if (multiAttack && conditionalRatingMods.multiAttack) {
            retVal += getSumOfObjectValues(conditionalRatingMods.multiAttack);
         }
      }
      return retVal;
   }

   /**
    * Gets the parameters for an Attack Check to be rolled by this Character, accounting for the provided options.
    * @param {AttackCheckOptions} options - Options for the Check.
    * @returns {AttackCheckParameters} Parameters for the check, calculated from the provided options.
    */
   getAttackCheckParameters(options) {
      // Initialize check parameters.
      const parameters = createAttackCheckParameters(options);

      // Add the situations the options name (the dialog's ticks) before any total is derived.
      this._applySituationalModifiers(parameters, 'attack', options.situations);

      // Initialize common attribute based check parameters.
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      // If this is a multi-attack.
      if (parameters.multiAttack) {

         // Divide the dice and expertise by half.
         // Round the total dice up if the attack has the flurry trait.
         // Otherwise, round down.
         parameters.totalDice = parameters.flurry ?
            Math.ceil(parameters.totalDice / 2) :
            Math.floor(parameters.totalDice / 2);

         // Always round the expertise down.
         parameters.totalExpertise = Math.floor(parameters.totalExpertise / 2);
      }

      // Calculate the attacker's attack rating.
      parameters.attackerRating = parameters.type === 'melee' ?
         parameters.attackerMelee :
         parameters.attackerAccuracy;

      // Calculate the difficulty of the check from the target defense rating,.
      // and the attacker rating.
      // Difficulty = 4 + (defense rating - attacker rating), min 2, max 6.
      parameters.difficulty = clamp(parameters.targetDefense - parameters.attackerRating + 4, 2, 6);

      // Advantage adjusts the rating-derived Difficulty.
      this._applyCheckAdvantage(parameters);

      // Cache the item and attack stats from the item roll data.
      const itemRollData = this.parent.items.get(options.itemId).system.getRollData();
      const attackData = itemRollData.attack[options.attackIdx];
      parameters.img = itemRollData.img;
      parameters.itemName = itemRollData.name;
      parameters.attackNotes = itemRollData.attackNotes;
      parameters.attackName = attackData.label;
      parameters.damage = attackData.damage;
      parameters.attackTrait = attackData.trait;

      // Ensure each custom trait in the parameters is unique.
      appendUniqueByFunctionValue(
         parameters.customTrait,
         itemRollData.customTrait,
         (trait) => camelize(trait.name));
      appendUniqueByFunctionValue(
         parameters.customTrait,
         attackData.customTrait,
         (trait) => camelize(trait.name));

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Attack Check.
    * @param {AttackCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, if any, or false if there are none.
    * @private
    */
   _getAttackCheckMessages(parameters) {
      // If there are roll messages to be checked.
      if (this.rulesElementsCache?.rollMessage) {
         /** @type {*[]} */
         const messages = [];

         // Get messages that apply to any check type.
         const anyCheckMessages = this.rulesElementsCache.rollMessage.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check.
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits.
            this._getCustomTraitMessages(anyCheckMessages, parameters, messages);
         }

         // Get messages that apply specifically to Attack Checks.
         const attackCheckMessages = this.rulesElementsCache.rollMessage.attack;
         if (attackCheckMessages) {

            // Get messages that apply to any Attack Check.
            this._getCheckMessagesForAny(attackCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            this._getCheckMessagesForSkill(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with this attack Type.
            this._getAttackTypeMessages(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with these attack Traits.
            this._getAttackTraitMessages(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits.
            this._getCustomTraitMessages(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with multi-attack set.
            this._getMultiAttackMessages(attackCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests a Casting Check from this Character. Rolls straight to chat or opens the options dialog, as the
    * `getCheckOptions` setting, the modifier key, and the check's situational modifiers decide.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestCastingCheck(options) {
      // Invalid options fail here, before the situational lookup reads them.
      if (!this.validateCastingCheckOptions(options)) {
         return;
      }

      /** @type {boolean} Whether any situational modifier applies to the check. */
      const hasSituationalModifiers = this.getSituationalCheckModifiers(
         'casting',
         { skill: this.initializeCastingCheckOptions(options).skill },
      ).length > 0;

      // Roll straight to chat, or open the dialog for adjusting the check.
      if (!shouldGetCheckOptions(hasSituationalModifiers)) {
         await this.rollCastingCheck(options);
      }
      else {
         this._createCastingCheckDialog(options);
      }
   }

   /**
    * Creates a Casting Check, rolls it, and sends it to chat.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async rollCastingCheck(options) {

      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateCastingCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeCastingCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getCastingCheckParameters(checkOptions);

         // Create the check.
         const check = new CastingCheck(checkParameters);

         // Get the messages for the check.
         const checkMessages = this._getCastingCheckMessages(checkParameters);

         // Roll the check and send it to chat.
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of a Casting Check.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @private
    */
   _createCastingCheckDialog(options) {
      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateCastingCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeCastingCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getCastingCheckParameters(checkOptions);

         // Create and display the check dialog.
         new CastingCheckDialog(
            checkOptions,
            checkParameters,
            this.parent,
            options,
         ).render(true);
      }
   }

   /**
    * Validates the options for a Casting Check.
    * @param {object} options - Options for the Check.
    * @param {boolean} [report] - Whether to report a failed validation as an error; an open check dialog tests
    * speculative options silently.
    * @returns {boolean} Whether the check options were valid.
    */
   validateCastingCheckOptions(options, report = true) {
      // Ensure options were provided.
      if (!options) {
         if (report) {
            game.titan.error(
               'Casting Check failed before construction. No Check Options were provided.',
               this);
         }

         return false;
      }

      // Ensure an item ID  was provided.
      if (!options.itemId) {
         if (report) {
            game.titan.error(
               'Casting Check failed before construction. No Item ID was provided.',
               options,
               this);
         }

         return false;
      }

      // Ensure the item exists in the parent actor.
      const item = this.parent.items.get(options.itemId);
      if (!item) {
         if (report) {
            game.titan.error(
               'Casting Check failed before construction. Item ID was invalid.',
               options,
               this);
         }

         return false;
      }

      return true;
   }

   /**
    * Populates Casting Check Options with this Character's specific data, unless specific overrides were applied.
    * @param {object} options - Options for the Check.
    * @returns {CastingCheckOptions} The new, fully-populated Casting Check Options.
    */
   initializeCastingCheckOptions(options) {
      const checkOptions = createCastingCheckOptions(options);

      // Cache the item roll data.
      const itemRollData = this.parent.items.get(checkOptions.itemId).system.getRollData();
      const checkData = itemRollData.castingCheck;

      // If no attribute is set.
      if (checkOptions.attribute === 'default') {

         // Set the attribute to the value stored in the item.
         checkOptions.attribute = checkData.attribute;
      }

      // If no skill is set.
      if (checkOptions.skill === 'default') {

         // Set the skill to the value stored in the item.
         checkOptions.skill = checkData.skill;
      }

      // If complexity is not set; an explicit 0 is a real Complexity.
      if (options.complexity === undefined) {

         // Set the complexity to the value stored in the item.
         checkOptions.complexity = checkData.complexity;
      }

      // If difficulty is not set.
      if (options.difficulty === undefined) {

         // Set the difficulty to the value stored in the item.
         checkOptions.difficulty = checkData.difficulty;
      }

      // Cache the Custom Traits.
      /** @type {*[]} */
      const customTraits = [];
      for (const trait of itemRollData.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }

      // Get conditional modifiers.
      // Dice mod.
      if (options.diceMod === undefined) {
         checkOptions.diceMod = this.getCastingCheckMod(
            'dice',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Expertise mod.
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod = this.getCastingCheckMod(
            'expertise',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Training mod.
      if (options.trainingMod === undefined) {
         checkOptions.trainingMod = this.getCastingCheckMod(
            'training',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Damage mod.
      if (options.damageMod === undefined) {
         checkOptions.damageMod = this.getCastingCheckMod(
            'damage',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Healing mod.
      if (options.healingMod === undefined) {
         checkOptions.healingMod = this.getCastingCheckMod(
            'healing',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getCastingCheckMod(
            'advantage',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getCastingCheckMod(
            'automaticFailure',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         ) > 0;
      }

      return checkOptions;
   }

   /**
    * Gets the modifier for a specific aspect of a specific Casting Check.
    * @param {string} modifierType - The modifier type to check for.
    * @param {string} attribute - The Attribute being used for the check.
    * @param {string} skill - The Skill being used for the check.
    * @param {string} tradition - The Tradition of the spell.
    * @param {string[]} customTraits - The camel-case names of the Custom Traits associated with the spell.
    * @returns {number} The modifier to apply to this aspect of the check.
    */
   getCastingCheckMod(
      modifierType,
      attribute,
      skill,
      tradition,
      customTraits,
   ) {
      return this._sumConditionalCheckMods(modifierType, 'casting', {
         attribute,
         customTrait: customTraits,
         skill,
         spellTradition: tradition,
      });
   }

   /**
    * Gets the parameters for a Casting Check to be rolled by this Character, accounting for the provided options.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @returns {CastingCheckParameters} Parameters for the check, calculated from the provided options.
    */
   getCastingCheckParameters(options) {
      // Initialize check parameters.
      const parameters = createCastingCheckParameters(options);

      // Add the situations the options name (the dialog's ticks) before any total is derived.
      this._applySituationalModifiers(parameters, 'casting', options.situations);

      // Initialize common attribute based check parameters.
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      // Cache the item stats from the item roll data.
      const itemRollData = this.parent.items.get(options.itemId).system.getRollData();
      parameters.img = itemRollData.img;
      parameters.itemName = itemRollData.name;
      parameters.itemDescription = itemRollData.description;
      parameters.customTrait = itemRollData.customTrait;
      parameters.tradition = itemRollData.tradition;

      // Cache and localize the standard aspects.
      const standardAspects = itemRollData.aspect;
      for (const aspect of standardAspects) {
         aspect.label = localize(aspect.unit ?? aspect.label);
      }

      /**
       * Converts each provided aspect into a format suitable for being read by the check, and adds them to parameter's
       * aspects.
       * @param {object[]} aspects - Array of aspects to process.
       */
      function processAspects(aspects) {

         // For each aspect.
         for (const aspect of aspects) {

            // Cache whether this spell has resistance checks.
            switch (aspect.resistanceCheck) {
               case 'reflexes': {
                  parameters.reflexesCheck = true;
                  break;
               }
               case 'resilience': {
                  parameters.resilienceCheck = true;
                  break;
               }
               case 'willpower': {
                  parameters.willpowerCheck = true;
                  break;
               }
               default: {
                  break;
               }
            }

            // If this aspect is damage, add its initial value to the parameters.
            if (aspect.isDamage) {
               parameters.damage += aspect.initialValue;
            }

            // If this aspect is healing, add its initial value to the parameters.
            if (aspect.isHealing) {
               parameters.healing += aspect.initialValue;
            }

            // If the aspect is scaling, add it to the scaling aspects.
            if (aspect.scaling) {
               parameters.scalingAspect.push({
                  isDamage: aspect.isDamage,
                  isHealing: aspect.isHealing,
                  cost: aspect.scalingCost ?? aspect.cost,
                  initialValue: aspect.initialValue,
                  label: aspect.label,
               });
            }
         }
      }

      processAspects(standardAspects);
      processAspects(itemRollData.customAspect);

      // Advantage adjusts the final Difficulty.
      this._applyCheckAdvantage(parameters);

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Casting Check.
    * @param {CastingCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, if any, or false if there are none.
    * @private
    */
   _getCastingCheckMessages(parameters) {
      // If there are roll messages to be checked.
      if (this.rulesElementsCache?.rollMessage) {
         /** @type {*[]} */
         const messages = [];

         // Get messages that apply to any check type.
         const anyCheckMessages = this.rulesElementsCache?.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check.
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits.
            this._getCustomTraitMessages(anyCheckMessages, parameters, messages);
         }

         // Get messages that apply specifically to Casting Checks.
         const castingCheckMessages = this.rulesElementsCache?.rollMessage?.casting;
         if (castingCheckMessages) {

            // Get messages that apply to any Casting Check.
            this._getCheckMessagesForAny(castingCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(castingCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            this._getCheckMessagesForSkill(castingCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits.
            this._getCustomTraitMessages(castingCheckMessages, parameters, messages);

            // Get messages that apply to checks with the spell's Tradition.
            this._getSpellTraditionMessages(castingCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests an Item Check from this Character. Rolls straight to chat or opens the options dialog, as the
    * `getCheckOptions` setting, the modifier key, and the check's situational modifiers decide.
    * @param {ItemCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestItemCheck(options) {
      // Invalid options fail here, before the situational lookup reads them.
      if (!this.validateItemCheckOptions(options)) {
         return;
      }

      /** @type {boolean} Whether any situational modifier applies to the check. */
      const hasSituationalModifiers = this.getSituationalCheckModifiers(
         'item',
         { skill: this.initializeItemCheckOptions(options).skill },
      ).length > 0;

      // Roll straight to chat, or open the dialog for adjusting the check.
      if (!shouldGetCheckOptions(hasSituationalModifiers)) {
         await this.rollItemCheck(options);
      }
      else {
         this._createItemCheckDialog(options);
      }
   }

   /**
    * Creates an Item Check, rolls it, and sends it to chat.
    * @param {ItemCheckOptions} options - Validated check options.
    * @returns {Promise<void>}
    */
   async rollItemCheck(options) {

      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateItemCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeItemCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getItemCheckParameters(checkOptions);

         // Create the check.
         const check = new ItemCheck(checkParameters);

         // Get the messages for the check.
         const checkMessages = this._getItemCheckMessages(checkParameters);

         // Roll the check and send it to chat.
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of an Item Check.
    * @param {ItemCheckOptions} options - Options for the Check.
    * @private
    */
   _createItemCheckDialog(options) {
      // If the check options are valid.
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.validateItemCheckOptions(options)) {

         // Ensure the check options are initialized.
         const checkOptions = this.initializeItemCheckOptions(options);

         // Calculate the parameters.
         const checkParameters = this.getItemCheckParameters(checkOptions);

         // Create and display the check dialog.
         new ItemCheckDialog(
            checkOptions,
            checkParameters,
            this.parent,
            options,
         ).render(true);
      }
   }

   /**
    * Validates the options for an Item Check.
    * @param {object} options - Options for the Check.
    * @param {boolean} [report] - Whether to report a failed validation as an error; an open check dialog tests
    * speculative options silently.
    * @returns {boolean} Whether the check options were valid.
    */
   validateItemCheckOptions(options, report = true) {
      // Ensure options were provided.
      if (!options) {
         if (report) {
            game.titan.error(
               'Item Check failed before construction. No Check Options were provided.',
               this);
         }

         return false;
      }

      // Ensure the check's source exists: the owned item or applicable effect an ID names, or the Item Roll Data the
      // caller supplied. Roll data derived from an item or effect earlier cannot stand in for it once it is gone.
      /** @type {object|undefined} The roll data of the item or effect whose check is rolled. */
      const itemRollData = this._getItemCheckRollData(options);
      if (!itemRollData) {
         if (report) {
            game.titan.error(
               'Item Check failed before construction. No valid Item ID, Effect ID, or Item Roll Data was provided.',
               options,
               this);
         }

         return false;
      }

      // Ensure the check index names one of the item's checks.
      const numChecks = itemRollData.check.length;
      if ((options.checkIdx ?? 0) >= numChecks) {
         if (report) {
            game.titan.error(
               'Item Check failed before construction. Check Idx was out of range.',
               options,
               this);
         }

         return false;
      }

      return true;
   }

   /**
    * Resolves the roll data of an Item Check's source. An item ID names an owned item and an effect ID names an effect
    * among the Actor's applicable effects (its own and those its items transfer); either is read live, so an open
    * dialog follows edits to it and loses its source when it is deleted. Only without either ID is the caller's
    * `itemRollData` snapshot used (e.g. a chat card's item).
    * @param {object} options - The Item Check Options naming the source.
    * @returns {object|undefined} The source's roll data, or undefined if the named item or effect is gone.
    * @private
    */
   _getItemCheckRollData(options) {
      if (options.itemId) {
         return this.parent.items.get(options.itemId)?.getRollData();
      }
      if (options.effectId) {
         for (const effect of this.parent.allApplicableEffects()) {
            if (effect.id === options.effectId) {
               return effect.getRollData();
            }
         }
         return undefined;
      }
      return options.itemRollData;
   }

   /**
    * Populates Item Check Options with this Character's specific data, unless specific overrides were applied.
    * @param {object} options - Options for the Check.
    * @returns {ItemCheckOptions} The new, fully-populated Item Check Options.
    */
   initializeItemCheckOptions(options) {
      const checkOptions = createItemCheckOptions(options);

      /** @type {object} The roll data of the check's source: the named item or effect, or the caller's roll data. */
      const itemRollData = this._getItemCheckRollData(checkOptions);
      const checkData = itemRollData.check[checkOptions.checkIdx];

      // Persist the resolved roll data into checkOptions so post-initialization readers see the real object.
      checkOptions.itemRollData = itemRollData;

      // If no attribute is set.
      if (checkOptions.attribute === 'default') {

         // Set the attribute to the value stored in the item.
         checkOptions.attribute = checkData.attribute;
      }

      // If no skill is set.
      if (checkOptions.skill === 'default') {

         // Set the skill to the value stored in the item.
         checkOptions.skill = checkData.skill;
      }

      // If complexity is not set; an explicit 0 is a real Complexity.
      if (options.complexity === undefined) {

         // Set the complexity to the value stored in the item.
         checkOptions.complexity = checkData.complexity;
      }

      // If difficulty is not set.
      if (options.difficulty === undefined) {

         // Set the difficulty to the value stored in the item.
         checkOptions.difficulty = checkData.difficulty;
      }

      // Cache the Custom Traits.
      /** @type {*[]} */
      const customTraits = [];
      for (const trait of itemRollData.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }

      // Get conditional modifiers.
      // Dice mod.
      if (options.diceMod === undefined) {
         checkOptions.diceMod = this.getItemCheckMod(
            'dice',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Expertise mod.
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod = this.getItemCheckMod(
            'expertise',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Training mod.
      if (options.trainingMod === undefined) {
         checkOptions.trainingMod = this.getItemCheckMod(
            'training',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Damage mod.
      if (options.damageMod === undefined) {
         checkOptions.damageMod = this.getItemCheckMod(
            'damage',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Healing mod.
      if (options.healingMod === undefined) {
         checkOptions.healingMod = this.getItemCheckMod(
            'healing',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Advantage.
      if (options.advantage === undefined) {
         checkOptions.advantage = this.getItemCheckMod(
            'advantage',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Automatic failure.
      if (options.automaticFailure === undefined) {
         checkOptions.automaticFailure = this.getItemCheckMod(
            'automaticFailure',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         ) > 0;
      }

      return checkOptions;
   }

   /**
    * Gets the modifier for a specific aspect of a specific Item Check.
    * @param {string} modifierType - The modifier type to check for.
    * @param {string} attribute - The Attribute being used for the check.
    * @param {string} skill - The Skill being used for the check.
    * @param {string[]} customTraits - The camel-case names of the Custom Traits associated with the item.
    * @returns {number} The modifier to apply to this aspect of the check.
    */
   getItemCheckMod(
      modifierType,
      attribute,
      skill,
      customTraits,
   ) {
      return this._sumConditionalCheckMods(modifierType, 'item', {
         attribute,
         customTrait: customTraits,
         skill,
      });
   }

   /**
    * Gets the parameters for an Item Check to be rolled by this Character, accounting for the provided options.
    * @param {ItemCheckOptions} options - Options for the Check.
    * @returns {ItemCheckParameters} Parameters for the check, calculated from the provided options.
    * @private
    */
   getItemCheckParameters(options) {
      // Initialize check parameters.
      const parameters = createItemCheckParameters(options);

      // Add the situations the options name (the dialog's ticks) before any total is derived.
      this._applySituationalModifiers(parameters, 'item', options.situations);

      // Initialize common attribute based check parameters.
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      // Cache the stats of the check's source: the named item or effect, or the caller's roll data.
      /** @type {object} The roll data of the item or effect whose check is rolled. */
      const itemRollData = this._getItemCheckRollData(options);
      const checkData = itemRollData.check[options.checkIdx];
      parameters.img = itemRollData.img;
      parameters.itemName = itemRollData.name;
      parameters.itemDescription = itemRollData.description;
      parameters.customTrait = itemRollData.customTrait;
      parameters.checkLabel = checkData.label;
      parameters.resolveCost = checkData.resolveCost;
      parameters.resistanceCheck = checkData.resistanceCheck;

      // Carry the item's damage and healing flags so the chat card can read them.
      parameters.isDamage = checkData.isDamage;
      parameters.isHealing = checkData.isHealing;

      // Set the opposed check data, carrying the enabled flag so the card and damage-reduction read it.
      parameters.opposedCheck = {
         attribute: checkData.opposedCheck.attribute,
         enabled: checkData.opposedCheck.enabled,
         skill: checkData.opposedCheck.skill,
      };

      // If this check has damage or healing.
      if (checkData.isDamage || checkData.isHealing) {

         // Set the base damage if appropriate.
         if (checkData.isDamage) {
            parameters.damage = checkData.initialValue;

            // Carry the item's configured damage-reduction when an opposed or resistance check backs it.
            if ((checkData.damageReducedBy === 'opposedCheck' && checkData.opposedCheck.enabled) ||
               (checkData.damageReducedBy === 'resistanceCheck' && checkData.resistanceCheck !== 'none')) {
               parameters.damageReducedBy = checkData.damageReducedBy;
            }
         }

         // Set the base healing if appropriate.
         if (checkData.isHealing) {
            parameters.healing = checkData.initialValue;
         }

         // Set scaling if appropriate.
         parameters.scaling = checkData.scaling;
      }

      // Advantage adjusts the final Difficulty.
      this._applyCheckAdvantage(parameters);

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Item Check.
    * @param {ItemCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, if any, or false if there are none.
    * @private
    */
   _getItemCheckMessages(parameters) {
      // If there are roll messages to be checked.
      if (this.rulesElementsCache?.rollMessage) {
         /** @type {*[]} */
         const messages = [];

         // Get messages that apply to any check type.
         const anyCheckMessages = this.rulesElementsCache?.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check.
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits.
            this._getCustomTraitMessages(anyCheckMessages, parameters, messages);
         }

         // Get messages that apply specifically to Item Checks.
         const itemCheckMessages = this.rulesElementsCache?.rollMessage?.item;
         if (itemCheckMessages) {

            // Get messages that apply to any Item Check.
            this._getCheckMessagesForAny(itemCheckMessages, messages);

            // Get messages that apply to checks with this Attribute.
            this._getCheckMessagesForAttribute(itemCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill.
            this._getCheckMessagesForSkill(itemCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits.
            this._getCustomTraitMessages(itemCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Helper function for applying attribute and skill modifiers to a check. Not used by every check, but the logic is
    * common among most.
    * @param {AttributeCheckParameters} parameters - The check parameters. Will be modified by this function.
    * @param {object} actorRollData - Roll Data of the Actor, used to determine the Training and Attribute bonuses.
    * @private
    */
   _initializeAttributeBasedCheck(parameters, actorRollData) {
      // If the attribute was set to default, then determine the attribute from the skill.
      if (parameters.attribute === 'default') {
         parameters.attribute = actorRollData.skill[parameters.skill].defaultAttribute;
      }

      // Calculate the attribute dice.
      parameters.attributeDice = actorRollData.attribute[parameters.attribute].value;

      // Calculate the skill training and expertise.
      if (parameters.skill !== 'none') {
         const skillData = actorRollData.skill[parameters.skill];
         parameters.skillTrainingDice = skillData.training.value;
         parameters.skillExpertise = skillData.expertise.value;
      }

      // Calculate the total training dice.
      parameters.totalTrainingDice = parameters.skillTrainingDice + parameters.trainingMod;
      if (parameters.doubleTraining) {
         parameters.totalTrainingDice *= 2;
      }

      // Calculate the total expertise.
      parameters.totalExpertise = parameters.skillExpertise + parameters.expertiseMod;
      if (parameters.doubleExpertise) {
         parameters.totalExpertise *= 2;
      }

      // Calculate the total dice.
      parameters.totalDice = parameters.attributeDice + parameters.totalTrainingDice + parameters.diceMod;
   }

   /**
    * Applies the check's summed Advantage to its Difficulty, keeping the pre-Advantage value as `baseDifficulty`.
    * INVARIANT: runs after the rating-derived and option Difficulty (an Attack Check's rating clamp included).
    * @param {CheckParameters} parameters - The check parameters. Modified in place.
    * @private
    */
   _applyCheckAdvantage(parameters) {
      parameters.baseDifficulty = parameters.difficulty;
      parameters.difficulty = applyAdvantage(parameters.baseDifficulty, parameters.advantage);
   }

   /**
    * Gets the cached conditional check modifiers of one modifier type. Every lookup goes through here so an unknown
    * modifier type fails loudly instead of silently finding no modifiers.
    * @param {string} modifierType - One of CONDITIONAL_CHECK_MODIFIER_TYPES.
    * @returns {object | undefined} The cached modifiers for the type, keyed by check type, if any exist.
    * @private
    */
   _getConditionalCheckModsForType(modifierType) {
      if (!assert(
         CONDITIONAL_CHECK_MODIFIER_TYPES.includes(modifierType),
         'Unknown conditional check modifier type %s.',
         modifierType,
      )) {
         return undefined;
      }
      return this.rulesElementsCache?.conditionalCheckModifier?.[modifierType];
   }

   /**
    * Sums the cached conditional check modifiers of one modifier type that apply to a check: each cell
    * `CHECK_TYPE_CONDITIONAL_SELECTORS` lists for the check type, where the check matches the cell's selector.
    * @param {string} modifierType - One of CONDITIONAL_CHECK_MODIFIER_TYPES.
    * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
    * @param {Record<string, string|string[]|boolean>} selectorKeys - The check's key (or keys) under each keyed
    * selector it reads, and `multiAttack` (whether an Attack Check is a multi-attack). `any` always applies.
    * @returns {number} The summed modifier.
    * @private
    */
   _sumConditionalCheckMods(modifierType, checkType, selectorKeys) {
      if (!assert(Object.hasOwn(CHECK_TYPE_CONDITIONAL_SELECTORS, checkType), `Unknown check type "${checkType}".`)) {
         return 0;
      }

      /** @type {object|undefined} The cached modifiers of this type, keyed by check type. */
      const checkMods = this._getConditionalCheckModsForType(modifierType);
      if (!checkMods) {
         return 0;
      }

      /** @type {number} The summed modifier. */
      let retVal = 0;
      for (const [cachedCheckType, selectors] of Object.entries(CHECK_TYPE_CONDITIONAL_SELECTORS[checkType])) {
         /** @type {object|undefined} The cached modifiers of this check type, keyed by selector. */
         const checkTypeMods = checkMods[cachedCheckType];
         if (!checkTypeMods) {
            continue;
         }
         for (const selector of selectors) {
            retVal += this._getConditionalCheckModsForSelector(
               checkTypeMods,
               selector,
               selector === 'any' || selectorKeys[selector],
            );
         }
      }
      return retVal;
   }

   /**
    * Gets the cached modifier one selector contributes to a check.
    * @param {object} checkTypeMods - The cached modifiers of one modifier type and check type, keyed by selector.
    * @param {string} selector - The cell's selector (e.g. `skill`, `customTrait`, `any`).
    * @param {string|string[]|boolean|undefined} keys - For a keyed selector, the check's key or keys; for `any` and
    * `multiAttack`, whose cache is one sum, whether the selector applies.
    * @returns {number} The selector's modifier for the check.
    * @private
    */
   _getConditionalCheckModsForSelector(checkTypeMods, selector, keys) {
      /** @type {object|number|undefined} The selector's cached sum, or its sums keyed by key. */
      const selectorMods = checkTypeMods[selector];
      if (!selectorMods || !keys) {
         return 0;
      }
      if (typeof selectorMods === 'number') {
         return keys === true ? selectorMods : 0;
      }
      return [keys].flat().reduce(
         (sum, key) => sum + (selectorMods[this._normalizeConditionalCheckModKey(selector, key)] || 0),
         0,
      );
   }

   /**
    * Gets the situational check modifiers a check offers in its dialog: those of the check's own type and of `any`,
    * whose modifier type the check reads (CHECK_TYPE_MODIFIER_TYPES), and, for an element narrowed to a Skill, only
    * when the check uses that Skill. Elements sharing a key and a modifier type sum into one entry.
    * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
    * @param {object} [options] - Options for the lookup.
    * @param {string} [options.skill] - The Skill the check uses, if any.
    * @returns {SituationalCheckModifier[]} The applicable entries, in the order their sources were gathered.
    */
   getSituationalCheckModifiers(checkType, { skill } = {}) {
      // An unknown check type fails loudly instead of silently offering nothing.
      if (!assert(Object.hasOwn(CHECK_TYPE_MODIFIER_TYPES, checkType), `Unknown check type "${checkType}".`)) {
         return [];
      }

      /** @type {object[]|boolean|undefined} The cached situational elements, if any. */
      const elements = this.rulesElementsCache?.situationalCheckModifier;
      if (!elements) {
         return [];
      }

      /** @type {readonly string[]} The modifier types this check type reads. */
      const modifierTypes = CHECK_TYPE_MODIFIER_TYPES[checkType];

      /** @type {Map<string, SituationalCheckModifier>} The entries keyed by situation key and modifier type. */
      const entries = new Map();
      for (const element of elements) {
         // Skip elements for another check type, a modifier type this check does not read, or another Skill.
         if (
            (element.checkType !== 'any' && element.checkType !== checkType) ||
            !modifierTypes.includes(element.modifierType) ||
            (element.skill !== '' && element.skill !== skill)
         ) {
            continue;
         }

         /** @type {string} The entry identity: one entry per situation key and modifier type. */
         const entryId = `${element.key}.${element.modifierType}`;

         /** @type {SituationalCheckModifier|undefined} The entry already started for this identity, if any. */
         const entry = entries.get(entryId);
         if (entry) {
            entry.value += element.value;
            pushUnique(entry.sources, element.source);
         }
         else {
            entries.set(entryId, {
               key: element.key,
               label: element.label,
               ...(element.labelKey ? { labelKey: element.labelKey } : {}),
               modifierType: element.modifierType,
               sources: [element.source],
               value: element.value,
            });
         }
      }

      return [...entries.values()];
   }

   /**
    * Adds the situational modifiers named in `options.situations` to a check's parameters and records them for the
    * chat card. The keys come from the dialog's ticks or from a caller that names them; nothing applies
    * automatically. Options hold only the always-on values, so recomputing the parameters after a tick or untick
    * never double-counts. A named key that no longer applies (the dialog's Skill changed) is ignored.
    * @param {CheckParameters} parameters - The check parameters, before any total is derived. Modified in place.
    * @param {string} checkType - The check type: attribute, resistance, attack, casting, or item.
    * @param {string[]} situations - The camel-case keys of the situations to apply.
    * @private
    */
   _applySituationalModifiers(parameters, checkType, situations) {
      /** @type {Map<string, SituationLabel>} The applied situations keyed by situation key, in first-applied order. */
      const applied = new Map();
      for (const modifier of this.getSituationalCheckModifiers(checkType, { skill: parameters.skill })) {
         if (!situations.includes(modifier.key)) {
            continue;
         }

         // Automatic Failure is a flag; every other type adds to its parameter.
         if (modifier.modifierType === 'automaticFailure') {
            parameters.automaticFailure = true;
         }
         else {
            parameters[MODIFIER_TYPE_PARAMETER_KEYS[modifier.modifierType]] += modifier.value;
         }

         if (!applied.has(modifier.key)) {
            applied.set(modifier.key, {
               key: modifier.key,
               label: modifier.label,
               ...(modifier.labelKey ? { labelKey: modifier.labelKey } : {}),
            });
         }
      }

      parameters.situations = [...applied.values()];
   }

   /**
    * Normalizes a conditional check modifier key. The cache builder and every lookup use this, so a user-typed key
    * (a custom trait name or spell tradition, e.g. "Fire") matches the check's value regardless of case or spacing.
    * @param {string} selector - The modifier's selector.
    * @param {string} key - The raw key.
    * @returns {string} The key used in the cache.
    * @private
    */
   _normalizeConditionalCheckModKey(selector, key) {
      return TYPED_KEY_SELECTORS.conditionalCheckModifier.includes(selector) ? camelize(String(key)) : key;
   }

   /**
    * Searches a category Roll Message elements which match the inputted Selector and Key values.
    * @param {object} categoryMessages - Messages that apply to a specific category of checks.
    * @param {string} selector - Desired Selector value to filter for.
    * @param {string} key - Desired Key value to filter for.
    * @returns {string[]|boolean} Array of messages whose Selector and Key values match those provided, or false if
    * there were no matches.
    * @private
    */
   _getRollMessages(categoryMessages, selector, key) {

      // Get the messages whose Selector matches the provided value.
      const selectorMessages = categoryMessages[selector];
      if (selectorMessages) {

         // Get the whose Key matches the provided value.
         const keyMessages = selectorMessages[key];
         if (keyMessages) {

            // Return the messages.
            return keyMessages;
         }
      }

      return false;
   }

   /**
    * Searches a category Roll Message elements which match the inputted Selector and any of any array of Key values.
    * @param {object} categoryMessages - Messages that apply to a specific category of checks.
    * @param {string} selector - Desired Selector value to filter for.
    * @param {string[]} keys - Array of desired Key values to filter for.
    * @returns {string[]|boolean} Array of messages whose Selector and Key values match those provided, or false if
    * there were no matches.
    * @private
    */
   _getRollMessagesForSelectorKeys(categoryMessages, selector, keys) {
      // Get the messages whose Selector matches the provided value.
      const selectorMessages = categoryMessages[selector];
      if (selectorMessages) {
         /** @type {*[]} */
         const messages = [];

         // For each key.
         for (const key of keys) {

            // Add the messages whose key matches the current key.
            const keyMessages = selectorMessages[key];
            if (keyMessages) {

               // Ensure each message is unique.
               for (const message of keyMessages) {
                  pushUnique(messages, message);
               }
            }
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Appends all check messages that apply to all checks of a specific type (Attack, Attribute, Any, etc.).
    * @param {object} categoryMessages - Messages that apply to a specific category of checks.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getCheckMessagesForAny(categoryMessages, outMessages) {
      if (categoryMessages.any) {
         appendUnique(outMessages, categoryMessages.any);
      }
   }

   /**
    * Appends all check messages that apply to checks of a specific type (Attack, Attribute, Any, etc.) that use this
    * check's Attribute.
    * @param {object} categoryMessages - All messages that apply to a specific category of checks.
    * @param {AttributeCheckParameters} parameters - The parameters of the Check, used to find appropriate messages.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getCheckMessagesForAttribute(
      categoryMessages,
      parameters,
      outMessages,
   ) {

      // Get messages that apply to checks using this Attribute.
      const attributeRollMessages = this._getRollMessages(
         categoryMessages,
         'attribute',
         parameters.attribute,
      );

      // Append the messages if any were found.
      if (attributeRollMessages) {
         appendUnique(outMessages, attributeRollMessages);
      }
   }

   /**
    * Appends all check messages that apply to checks of a specific type (Attack, Attribute, Any, etc.) that use this
    * check's Skill.
    * @param {object} categoryMessages - All messages that apply to a specific category of checks.
    * @param {AttributeCheckParameters} parameters - The parameters of the Check, used to find appropriate messages.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getCheckMessagesForSkill(
      categoryMessages,
      parameters,
      outMessages,
   ) {

      // Get messages that apply to checks using this Skill.
      const skillRollMessages = this._getRollMessages(
         categoryMessages, 'skill',
         parameters.skill,
      );

      // Append the messages if any were found.
      if (skillRollMessages) {
         appendUnique(outMessages, skillRollMessages);
      }
   }

   /**
    * Appends all check messages that apply to Resistance Checks that use this Check's Resistance.
    * @param {object} resistanceCheckMessages - All messages that apply to Resistance Checks.
    * @param {ResistanceCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getResistanceMessages(
      resistanceCheckMessages,
      parameters,
      outMessages,
   ) {

      // Get messages that apply to checks using this Resistance.
      const resistanceRollMessages = this._getRollMessages(
         resistanceCheckMessages,
         'resistance',
         parameters.resistance,
      );

      // Append the messages if any were found.
      if (resistanceRollMessages) {
         appendUnique(outMessages, resistanceRollMessages);
      }
   }

   /**
    * Appends all check messages that apply to Attack Checks of this Attack's Type.
    * @param {object} attackCheckMessages - All messages that apply to Attack Checks.
    * @param {AttackCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getAttackTypeMessages(
      attackCheckMessages,
      parameters,
      outMessages,
   ) {

      // Get messages that apply to checks of this attack type.
      const attackTypeMessages = this._getRollMessages(
         attackCheckMessages,
         'attackType',
         parameters.type,
      );

      // Append the messages if any were found.
      if (attackTypeMessages) {
         appendUnique(outMessages, attackTypeMessages);
      }
   }

   /**
    * Appends all check messages that apply to Attack Checks with this check's Attack Traits.
    * @param {object} attackCheckMessages - All messages that apply to Attack Checks.
    * @param {AttackCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getAttackTraitMessages(
      attackCheckMessages,
      parameters,
      outMessages,
   ) {
      // If there are attack traits.
      if (parameters.attackTrait.length > 0) {

         // Get all messages that apply to the provided traits.
         const attackTraits = parameters.attackTrait.map((trait) => trait.name);
         const attackTraitMessages = this._getRollMessagesForSelectorKeys(
            attackCheckMessages,
            'attackTrait',
            attackTraits);

         // Append the messages if any were found.
         if (attackTraitMessages) {
            appendUnique(outMessages, attackTraitMessages);
         }
      }
   }

   /**
    * Appends all check messages that apply to checks of a specific type (Attack, Item, Any, etc.) that apply to this
    * check's Custom Traits.
    * @param {object} categoryMessages - All messages that apply to a specific category of checks.
    * @param {AttackCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getCustomTraitMessages(
      categoryMessages,
      parameters,
      outMessages,
   ) {
      // If there are Custom Traits.
      if (parameters.customTrait.length > 0) {

         // Get unique list of Custom Traits.
         /** @type {*[]} */
         const customTraits = [];
         for (const trait of parameters.customTrait) {
            pushUnique(customTraits, camelize(trait.name));
         }

         // Get all messages that apply to the provided traits.
         const customTraitMessages = this._getRollMessagesForSelectorKeys(
            categoryMessages,
            'customTrait',
            customTraits,
         );

         // Append the messages if any were found.
         if (customTraitMessages) {
            appendUnique(outMessages, customTraitMessages);
         }
      }
   }

   /**
    * Appends all check messages that apply to Multi-Attack Checks, if appropriate.
    * @param {object} attackCheckMessages - All messages that apply to Attack Checks.
    * @param {AttackCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getMultiAttackMessages(
      attackCheckMessages,
      parameters,
      outMessages,
   ) {

      // If this check is a multi-attack, append all multi-attack messages.
      if (parameters.multiAttack && attackCheckMessages.multiAttack) {
         appendUnique(outMessages, attackCheckMessages.multiAttack);
      }
   }

   /**
    * Appends all check messages that apply to Casting Checks of this check's Tradition.
    * @param {object} castingCheckMessages - All messages that apply to Casting Checks.
    * @param {CastingCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getSpellTraditionMessages(
      castingCheckMessages,
      parameters,
      outMessages,
   ) {

      // Get messages that apply to checks of this Tradition.
      const spellTraditionMessages = this._getRollMessages(
         castingCheckMessages,
         'spellTradition',
         camelize(parameters.tradition),
      );

      // Append the messages if any were found.
      if (spellTraditionMessages) {
         appendUnique(outMessages, spellTraditionMessages);
      }
   }

   /**
    * Handles automatically expending Resolve for a Check.
    * @param {ItemCheckParameters} parameters - Parameters for the Check.
    * @returns {Promise<void>} Returns after the Resolve has been expended.
    * @private
    */
   async _expendCheckResolve(parameters) {
      // Expend resolve if appropriate.
      // Double training.
      /** @type {number} */
      let resolveSpent = 0;
      if (parameters.doubleTraining && autoSpendResolveDoubleTraining()) {
         resolveSpent += 1;
      }

      // Double expertise.
      if (parameters.doubleExpertise && autoSpendResolveDoubleExpertise()) {
         resolveSpent += 1;
      }

      // Resolve cost.
      if (parameters.resolveCost && autoSpendResolveChecks()) {
         resolveSpent += parameters.resolveCost;
      }

      // Spend resolve is any resolve was used.
      if (resolveSpent > 0) {
         return this.spendResolve(resolveSpent, { playSound: false });
      }
   }

   /**
    * Takes a pre-initialized check, rolls it, and sends it to chat, expending resolve as appropriate.
    * @param {TitanCheck} check - The check to send to chat.
    * @param {string[]} messages - Messages to attach to the check.
    * @returns {ChatMessage} The chat message being sent.
    * @private
    */
   async _rollCheck(check, messages) {
      // Expend resolve if appropriate.
      await this._expendCheckResolve(check);

      // Evaluate the check and send it to chat.
      return await check.sendToChat({
         speaker: this.parent.getSpeaker(),
         message: messages,
      });
   }

   /**
    * Applies Damage to the Character.
    * @param {number} damage - Amount of Damage to apply.
    * @param {DamageOptions} [options] - Options for applying the Damage.
    * @returns {Promise<DamageReport|void>} Results of applying the Damage.
    */
   async applyDamage(damage, options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && damage > 0) {

         /** @type {number} The Damage the Character's Armor resists, after Ignore Armor and attack traits. */
         const damageResistance = computeDamageResistance(this.mod.armor.value, options);

         // Cache values for the report if appropriate.
         /** @type {number} */
         let woundsSuffered = 0;
         /** @type {number} */
         let staminaLost = 0;
         let damageResisted = Math.min(damage, damageResistance);

         // If any damage was taken.
         const damageTaken = damageResistance < damage ? damage - damageResistance : 0;
         if (damageTaken > 0) {

            // If the Character does not have enough Stamina remaining.
            const stamina = this.resource.stamina;
            const wounds = this.resource.wounds;
            woundsSuffered = 0;
            if (stamina.value < damageTaken && wounds.value < wounds.max) {

               // If the Character has a Stamina deficit >= 5, then they take 3.
               // Wounds.
               if (stamina.value + 5 <= damageTaken) {
                  woundsSuffered = 3;
               }

               // Otherwise, if the Character has a Stamina deficit >= 5, then.
               // they take 2 Wounds.
               else if (stamina.value + 2 <= damageTaken) {
                  woundsSuffered = 2;
               }

               // Otherwise, they take 1 Wound.
               else {
                  woundsSuffered = 1;
               }

               // Update the wounds.
               wounds.value = Math.min(wounds.value + woundsSuffered, wounds.max);
            }

            // Update the Stamina.
            staminaLost = Math.min(stamina.value, damageTaken);
            stamina.value -= staminaLost;

            // Update the actor document unless explicitly instructed otherwise.
            if (options?.updateActor !== false && (staminaLost > 0 || woundsSuffered > 0)) {

               await this.parent.update({
                  system: {
                     resource: {
                        stamina: {
                           value: stamina.value,
                        },
                        wounds: {
                           value: wounds.value,
                        },
                     },
                  },
               });
            }
         }

         // Cache the data to report.
         const reportData = this._createDamageReportData(
            damageTaken,
            damageResisted,
            staminaLost,
            woundsSuffered,
            options,
         );

         // Report taking and resisting damage if appropriate.
         if (options?.report !== false && reportTakingDamage()) {

            // Send the report to chat.
            await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
         }

         return reportData;
      }
   }

   /**
    * Initializes data for a report detailing Damage applied to this character.
    * @param {number} damageTaken - The amount of Damage taken.
    * @param {number} damageResisted - The amount of Damage resisted.
    * @param {number} staminaLost - The amount of Stamina lost.
    * @param {number} [woundsSuffered] - The number of Wounds suffered, if any.
    * @param {object} [options] - The options for the Damage.
    * @returns {DamageReport} Populated data for the report.
    * @private
    */
   _createDamageReportData(
      damageTaken,
      damageResisted,
      staminaLost,
      woundsSuffered,
      options,
   ) {
      // Initialize data.
      const retVal = {
         type: 'damageReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
      };

      // Add wounds if appropriate.
      if (this.resource.wounds.max > 0) {
         retVal.resource ??= {};
         retVal.resource.wounds = {
            value: this.resource.wounds.value,
            max: this.resource.wounds.max,
         };
      }

      // Add results.
      // Damage taken.
      if (damageTaken > 0) {
         retVal.damageTaken = damageTaken;

         // Add the stamina if any damage was taken.
         retVal.resource ??= {};
         retVal.resource.stamina = {
            value: this.resource.stamina.value,
            max: this.resource.stamina.max,
         };
      }

      // Damage resisted.
      if (damageResisted > 0) {
         retVal.damageResisted = damageResisted;
      }

      // Stamina lost.
      if (staminaLost > 0) {
         retVal.staminaLost = staminaLost;
      }

      // Wounds suffered.
      if (woundsSuffered > 0) {
         retVal.woundsSuffered = woundsSuffered;
      }

      // Add any damage options that were applied.
      if (options && (options.ignoreArmor || options.ineffective || options.penetrating)) {

         // Ignore armor.
         if (options.ignoreArmor && this.mod.armor.value > 0) {
            retVal.ignoredArmor = true;
         }

         // Ineffective.
         if (options.ineffective) {
            retVal.tags = {};
            retVal.tags.ineffective = true;
         }

         // Penetrating.
         if (options.penetrating) {
            retVal.tags ??= {};
            retVal.tags.penetrating = true;
         }
      }

      return retVal;
   }

   /**
    * Applies Healing to the character.
    * @param {number} healing - Amount of Healing to apply.
    * @param {HealingOptions} [options] - Options for restoring the Stamina.
    * @returns {Promise<HealingReport|void>} Results of applying the Healing.
    */
   async applyHealing(healing, options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && healing > 0) {

         // If the actor's stamina is less than max.
         const stamina = this.resource.stamina;
         if (stamina.value < stamina.max) {

            // Calculate the stamina recovered.
            const staminaRestored = Math.min(healing, stamina.max - stamina.value);
            stamina.value += staminaRestored;

            // Update the actor document unless explicitly instructed otherwise.
            if (options?.updateActor !== false) {
               await this.parent.update({
                  system: {
                     resource: {
                        stamina: {
                           value: stamina.value,
                        },
                     },
                  },
               });
            }

            // Get the report data.
            const reportData = this._createHealingReportData(staminaRestored);

            // Report healing damage if appropriate.
            if (options?.report !== false && reportHealingDamage()) {

               // Send the report to chat.
               await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
            }

            return reportData;
         }
      }
   }

   /**
    * Initializes data for a report detailing Healing applied to this character.
    * @param {number} staminaRestored - The amount of Stamina Healed.
    * @returns {HealingReport} Populated data for the report.
    * @private
    */
   _createHealingReportData(staminaRestored) {
      // Initialize data.
      const retVal = {
         type: 'healingReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
         staminaRestored: staminaRestored,
         resource: {
            stamina: {
               value: this.resource.stamina.value,
               max: this.resource.stamina.max,
            },
         },
      };

      // Add wounds if appropriate.
      if (this.resource.wounds.max > 0) {
         retVal.resource.wounds = {
            value: this.resource.wounds.value,
            max: this.resource.wounds.max,
         };
      }

      return retVal;
   }

   /**
    * Restores the Character's Resolve.
    * @param {number} resolveRestored - Amount of Resolve to restore.
    * @param {RestoreResolveOptions} [options] - Options for restoring the Resolve.
    * @returns {Promise<void>} Returns after the Resolve has been restored.
    */
   async regainResolve(resolveRestored, options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && resolveRestored > 0) {

         // Update the resolve if appropriate.
         const resolve = this.resource.resolve;
         resolve.value = Math.min(resolve.max, resolve.value + resolveRestored);

         // Update the actor document unless explicitly instructed otherwise.
         if (options?.updateActor !== false) {

            return this.parent.update({
               system: {
                  resource: {
                     resolve: resolve,
                  },
               },
            });
         }
      }
   }

   /**
    * Spends the Character's Resolve.
    * @param {number} resolveSpent - Amount of Resolve to spend.
    * @param {SpendResolveOptions} [options] - Options for restoring the Resolve.
    * @returns {Promise<SpendResolveReport|void>} Results of spending Resolve, or void if none was spent.
    */
   async spendResolve(resolveSpent, options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && resolveSpent > 0) {

         // Update the resolve if appropriate.
         const resolve = this.resource.resolve;
         const initialResolve = resolve.value;
         if (resolve.value >= resolveSpent) {
            resolve.value = Math.max(0, resolve.value - resolveSpent);

            // Update the actor document unless explicitly instructed otherwise.
            if (options?.updateActor !== false) {

               await this.parent.update({
                  system: {
                     resource: {
                        resolve: {
                           value: resolve.value,
                        },
                     },
                  },
               });
            }
         }

         // Get the report data.
         const reportData = this._createSpendResolveReportData(resolveSpent, initialResolve);

         // Report regaining resolve if appropriate.
         if (options?.report !== false && reportSpendingResolve()) {
            await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
         }

         return reportData;
      }
   }

   /**
    * Initializes data for a report detailing Resolve spent by the character.
    * @param {number} resolveSpent - The amount of Resolve spent.
    * @param {number} initialResolve - The initial Resolve held by this character.
    * @returns {SpendResolveReport} Populated data for the report.
    * @private
    */
   _createSpendResolveReportData(resolveSpent, initialResolve) {
      // Initialize data.
      const retVal = {
         type: 'spendResolveReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
         resolveSpent: resolveSpent,
         resource: {
            resolve: {
               value: this.resource.resolve.value,
               max: this.resource.resolve.max,
            },
         },
      };

      // Report if the character was short on resolve.
      if (initialResolve < resolveSpent) {
         retVal.resolveShortage = resolveSpent - initialResolve;
      }

      return retVal;
   }

   /**
    * Rends the Character's Armor.
    * @param {number} rend - Amount of Rend to apply.
    * @param {RendOptions} [options] - Options for applying the Rend.
    * @returns {Promise<RendReport|void>} The result of Rending the Armor, or void if no rend was applied.
    */
   async applyRend(rend, options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && rend > 0) {

         // If this character has armor.
         const armor = this.getEquippedArmor();
         if (armor && armor.system.armor.value > 0) {

            // Check if the armor is Magical.
            let isArmorMagical = false;
            for (const trait of armor.system.trait) {
               if (trait.name === 'magical') {
                  isArmorMagical = true;
                  break;
               }
            }

            // If armor is magical, and the attack is not magical, then the rend.
            // should be resisted.
            const armorLost = (!isArmorMagical || options?.magical !== true) ?
               Math.min(armor.system.armor.value, rend) :
               0;

            // Otherwise, decrease the armor by the rend amount.
            if (armorLost > 0) {
               armor.system.armor.value -= armorLost;

               // Update the armor document unless explicitly instructed.
               // otherwise.
               if (options?.updateArmor !== false) {
                  await armor.update({
                     system: {
                        armor: {
                           value: armor.system.armor.value,
                        },
                     },
                  });
               }
            }

            // Get the report data.
            const reportData = this._createRendReportData(armorLost, armor, rend);

            // Report rending armor if appropriate.
            if (options?.report !== false && reportRendingArmor()) {

               // Send the report to chat.
               await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
            }

            return reportData;
         }
      }
   }

   /**
    * Initializes data for a report detailing Rend applied to this character.
    * @param {number} armorLost - The amount of Armor lost.
    * @param {TitanItem} armor - Reference to the Armor being Rent.
    * @param {number} rend - The total Rend amount applied; shown as the resisted amount when no Armor was lost.
    * @returns {RendReport} Populated data for the report.
    * @private
    */
   _createRendReportData(armorLost, armor, rend) {
      // Initialize data.
      const retVal = {
         type: 'rendReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
         armorImg: armor.img,
         armorName: armor.name,
         rend: rend,
      };

      // If any armor was lost, add the armor lost and armor value to the chat.
      // message.
      if (armorLost > 0) {
         retVal.armorLost = armorLost;
         retVal.armor = {
            value: armor.system.armor.value,
            max: armor.system.armor.max,
         };
      }

      return retVal;
   }

   /**
    * Repairs the Character's Armor.
    * @param {number} repairs - Amount of repairs to apply.
    * @param {RepairsOptions} [options] - Options for applying the repairs.
    * @returns {Promise<RepairsReport|void>} The result of Repairing the Armor, or void if no repairs were applied.
    */
   async applyRepairs(repairs, options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && repairs > 0) {

         // If this character has damaged armor.
         const armor = this.getEquippedArmor();
         if (armor && armor.system.armor.value < armor.system.armor.max) {

            // Apply the repairs.
            const armorRepaired = Math.min(repairs, armor.system.armor.max - armor.system.armor.value);
            armor.system.armor.value += armorRepaired;

            // Update the armor document unless explicitly instructed otherwise.
            if (options?.updateArmor !== false) {
               await armor.update({
                  system: {
                     armor: {
                        value: armor.system.armor.value,
                     },
                  },
               });
            }

            // Get the report data.
            const reportData = this._createRepairsReportData(armorRepaired, armor);

            // Report repairing armor if appropriate.
            if (options?.report !== false && reportRepairingArmor()) {

               // Send the report to chat.
               await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
            }

            return reportData;
         }
      }
   }

   /**
    * Initializes data for a report detailing Repairs made to the character's Armor.
    * @param {number} armorRepaired - The amount of Armor repaired.
    * @param {TitanItem} armor - Reference to the Armor being Repaired.
    * @returns {RepairsReport} Populated data for the report.
    * @private
    */
   _createRepairsReportData(armorRepaired, armor) {
      // Initialize data.
      return {
         type: 'repairsReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
         armorImg: armor.img,
         armorName: armor.name,
         armorRepaired: armorRepaired,
         armor: {
            max: armor.system.armor.max,
            value: armor.system.armor.value,
         },
      };
   }

   /**
    * Requests to the Character to remove expired effects, creating a dialog for confirmation if appropriate.
    * @returns {Promise<void>}
    */
   async requestRemoveExpiredEffects() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      ) && this.parent.effects.some((effect) => effect.type === 'effect' && effect.system.isExpired)) {

         // Remove effects if removal does not need to be confirmed.
         if (!shouldConfirmDeletingItems()) {
            await this.removeExpiredEffects();
         }

         // Otherwise, create a dialog to confirm removing the effects.
         else {
            new ConfirmRemoveExpiredEffectsDialog(this.parent).render(true);
         }
      }
   }

   /**
    * Removes expired effects from the Character with no confirmation dialog.
    * @returns {Promise<void>}
    */
   async removeExpiredEffects() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         const expiredEffects = this.getExpiredEffects();
         if (expiredEffects) {
            // Collect the IDs first, then delete in a single batch to avoid mutating the live collection while
            // iterating over it.
            /** @type {string[]} The IDs of the expired Effect Active Effects to delete. */
            const expiredEffectIds = expiredEffects.map((effect) => effect.id);
            await this.parent.deleteEmbeddedDocuments('ActiveEffect', expiredEffectIds);
         }
      }
   }

   /**
    * Removes all combat effects from the Character, including Effect items and Static Mods, while also restoring
    * Resolve to its maximum value.
    * @param {object} [options] - Options for the operation.
    * @param {boolean} [options.updateActor] - Whether to update the actor after performing the operation.
    * @param {boolean} [options.report] - Whether to send a Chat Message report after performing the operation.
    * @returns {Promise<void>}
    */
   async removeCombatEffects(options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         // Delete all combat Effect Active Effects.
         const combatEffects = this.parent.effects.filter((effect) =>
            effect.type === 'effect' && effect.system.isCombatEffect);
         if (combatEffects.length > 0) {
            // Collect the IDs first, then delete in a single batch to avoid mutating the live collection while
            // iterating over it.
            /** @type {string[]} The IDs of the combat Effect Active Effects to delete. */
            const combatEffectIds = combatEffects.map((effect) => effect.id);
            await this.parent.deleteEmbeddedDocuments('ActiveEffect', combatEffectIds);
         }

         // Reset static mods.
         // Attribute.
         for (const value of Object.values(this.attribute)) {
            value.mod.static = 0;
         }

         // Resistances.
         for (const value of Object.values(this.resistance)) {
            value.mod.static = 0;
         }

         // Skills.
         for (const value of Object.values(this.skill)) {
            value.training.mod.static = 0;
            value.expertise.mod.static = 0;
         }

         // Ratings.
         for (const value of Object.values(this.rating)) {
            value.mod.static = 0;
         }

         // Speed.
         for (const value of Object.values(this.speed)) {
            value.mod.static = 0;
         }

         // Mod.
         for (const value of Object.values(this.mod)) {
            value.mod.static = 0;
         }

         // Restore resolve.
         this.resource.resolve.value = this.resource.resolve.max;

         // Update the actor unless explicitly instructed otherwise.
         if (options?.updateActor !== false) {
            await this.parent.update({
               system: {
                  attribute: structuredClone(this.attribute),
                  resistance: structuredClone(this.resistance),
                  skill: structuredClone(this.skill),
                  resource: structuredClone(this.resource),
                  rating: structuredClone(this.rating),
                  speed: structuredClone(this.speed),
                  mod: structuredClone(this.mod),
               },
            });
         }

         // Send a chat message report if appropriate.
         if (reportResting() && options?.report !== false) {

            const reportData = {
               type: 'removeCombatEffectsReport',
               actorImg: this.parent.img,
               actorName: this.parent.name,
            };
            return this._whisperOwners(reportData, game.user.id, true);
         }
      }
   }

   /**
    * Performs a Short Rest. Removes all combat effects from the Character, including Effect items and Static Mods.
    * Restores Stamina and Resolve to their maximum value.
    * @param {object} [options] - Options for the operation.
    * @param {boolean} [options.updateActor] - Whether to update the actor after performing the operation.
    * @param {boolean} [options.report] - Whether to send a Chat Message report after performing the operation.
    * @returns {Promise<void>}
    */
   async shortRest(options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         // Restore stamina.
         this.resource.stamina.value = this.resource.stamina.max;

         // Remove combat effects updates the actor.
         await this.removeCombatEffects({
            report: false,
            updateActor: options?.updateActor !== false,
         });

         // Send a chat message report if appropriate.
         if (reportResting() && options?.report !== false) {

            const reportData = {
               type: 'shortRestReport',
               actorImg: this.parent.img,
               actorName: this.parent.name,
            };
            return this._whisperOwners(reportData, game.user.id, true);
         }
      }
   }

   /**
    * Performs a Long Rest. Removes all combat effects from the Character, including Effect items and Static Mods.
    * Restores Stamina and Resolve to their maximum value. Restores Wounds equal to the character's Wound Regain.
    * @param {object} [options] - Options for the operation.
    * @param {boolean} [options.updateActor] - Whether to update the actor after performing the operation.
    * @param {boolean} [options.report] - Whether to send a Chat Message report after performing the operation.
    * @returns {Promise<void>}
    */
   async longRest(options) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Decrease wounds.
         /** @type {number} */
         let woundsHealed = 0;
         const wounds = this.resource.wounds;
         if (wounds.value > 0) {
            woundsHealed = Math.min(woundsBaseRegain() + this.mod.woundRegain.value, wounds.value);
            wounds.value -= woundsHealed;
         }

         // Short rest updates the actor.
         await this.shortRest({
            report: false,
            updateActor: options?.updateActor !== false,
         });

         // Send a chat message report if appropriate.
         if (reportResting() && options?.report !== false) {

            const reportData = {
               type: 'longRestReport',
               actorImg: this.parent.img,
               actorName: this.parent.name,
            };

            // Add wounds healed if appropriate.
            if (woundsHealed > 0) {
               reportData.woundsHealed = woundsHealed;
               reportData.resource = {
                  wounds: {
                     value: wounds.value,
                     max: wounds.max,
                  },
               };
            }

            // Send the report to chat.
            return this._whisperOwners(reportData, game.user.id, true);

         }
      }
   }

   /**
    * Updates the status of this character in response to Initiative advancing.
    * @param {float} currentInitiative - The initiative of the current combat turn.
    * @param {float} previousInitiative - The initiative of the previous combat turn.
    * @param {boolean} isNewRound - Whether the current combat turn is the start of a new round.
    * @returns {Promise<void>}
    */
   async onInitiativeAdvanced(currentInitiative, previousInitiative, isNewRound) {
      if (isCurrentUserBestOwner(this.parent)) {

         // Decrease the duration of effects with the Initiative duration type.
         if (autoDecreaseEffectDuration()) {
            let initiativeEffects = this.parent.effects.filter((effect) =>
               effect.type === 'effect' && effect.system.duration.type === 'initiative');
            if (initiativeEffects) {

               // Calculate which effects to advance.
               let effectsToAdvance;

               // If this turn is the start of a new round, advance effects with an initiative lesser or equal to the.
               // current turn's initiative, or greater than the previous turn's initiative.
               if (isNewRound) {
                  effectsToAdvance = initiativeEffects.filter((effect) => {
                     const initiative = effect.system.duration.initiative;
                     return (initiative < previousInitiative || initiative >= currentInitiative);
                  });
               }
               else {
                  // If this turn is not the start of a new round, advance effects with an initiative lesser.
                  // than the previous turn, but greater than or equal to the current turn's initiative.
                  effectsToAdvance = initiativeEffects.filter((effect) => {
                     const initiative = effect.system.duration.initiative;
                     return (initiative < previousInitiative && initiative >= currentInitiative);
                  });
               }

               // If there are any effects to advance.
               if (effectsToAdvance.length > 0) {
                  let expiredEffects = [];

                  // Decrease the duration of each effect by 1 round.
                  for (const effect of effectsToAdvance) {
                     effect.system.duration.remaining -= 1;
                     await effect.update({
                        system: {
                           duration: {
                              remaining: effect.system.duration.remaining,
                           },
                        },
                     });

                     // Add the effect to the container of expired effects if necessary.
                     if (effect.system.duration.remaining <= 0) {
                        expiredEffects.push(effect);
                     }
                  }

                  // If there are any expired effects.
                  if (expiredEffects.length > 0) {
                     const reportData = {};

                     // Get the report data for each expired effect if appropriate.
                     const shouldReportEffects = reportEffects();
                     const autoRemoveExpiredEffectsSetting = autoRemoveExpiredEffects();
                     const shouldSendReport = (shouldReportEffects || autoRemoveExpiredEffectsSetting === 'showButton');
                     if (shouldSendReport) {
                        reportData.effects = {
                           expired: this._getEffectReportData(expiredEffects),
                        };
                     }

                     // Process the expired effects.
                     await this._processExpiredEffects(autoRemoveExpiredEffectsSetting, expiredEffects, reportData);

                     // Send the report to chat if appropriate.
                     if (shouldSendReport) {

                        // Prepare the report data.
                        reportData.type = 'effectsExpiredReport';
                        reportData.actorName = this.parent.name;
                        reportData.actorImg = this.parent.img;
                        reportData.expiredEffectsRemoved = autoRemoveExpiredEffectsSetting === 'enabled';

                        // Send the report to chat.
                        return this._whisperOwners(reportData, this._getTurnReportUserID(), true);
                     }
                  }
               }
            }
         }
      }
   }

   /**
    * Called at the Start of this Character's Turn in combat to open the character's sheet, update Turn-Start effects,
    * and send Turn-Start messages, if appropriate.
    * @returns {Promise<void>}
    */
   async onTurnStart() {
      // Handle opening the sheet if appropriate.
      // If the current user a GM...
      if (game.user.isGM) {
         switch (autoOpenCharacterSheetsGM()) {

            // If set for NPCs only, open the sheet only if it has no player.
            // owners.
            case 'npcsOnly': {
               if (!this.parent.hasPlayerOwner) {
                  this.parent.sheet.render(true);
               }
               break;
            }

            // If set for pcs only, open the sheet only if it has player owners.
            case 'pcsOnly': {
               if (this.parent.hasPlayerOwner) {
                  this.parent.sheet.render(true);
               }
               break;
            }

            // If set for all, open the sheet.
            case 'all': {
               this.parent.sheet.render(true);
               break;
            }

            default: {
               break;
            }
         }
      }
      else if (this.parent.isOwner && autoOpenCharacterSheetsPlayer()) {
         // If the current user is a player and an owner,.
         // open the sheet if auto open sheets is enabled for players.
         this.parent.sheet.render(true);
      }

      // Perform start-of-turn updates.
      if (isCurrentUserBestOwner(this.parent)) {

         // Initialize variables.
         /** @type {object} */
         const reportData = {};
         /** @type {boolean} */
         let shouldUpdateActor = false;

         // Calculate healing or damage.
         if (await this._calculateTurnHealingAndDamage(reportData, 'turnStart')) {
            shouldUpdateActor = true;
         }

         // Calculate resolve regain.
         if (await this._calculateResolveRegain(reportData)) {
            shouldUpdateActor = true;
         }

         // Update actor if appropriate.
         if (shouldUpdateActor) {
            await this.parent.update({
               system: {
                  resource: structuredClone(this.resource),
               },
            });
         }

         // Get turn messages.
         const message = this.rulesElementsCache?.turnMessage?.turnStart;
         if (message) {
            reportData.message = structuredClone(message);
         }

         // Update the duration of turn effects.
         await this._decreaseTurnEffectDuration(reportData, 'turnStart');

         // Calculate whether to report effects and whether to remove expired.
         // effects.
         const shouldReportEffects = reportEffects();
         const autoRemoveExpiredEffectsSetting = autoRemoveExpiredEffects();
         const expiredEffects = this.getExpiredEffects();

         // If report effects is true, add all effects to the report.
         if (shouldReportEffects) {

            // Get sorted effects.
            const sortedEffects = this.getSortedEffects();
            if (sortedEffects) {
               reportData.effects = {};

               // Add effects to the report.
               for (const [key, value] of Object.entries(sortedEffects)) {
                  switch (key) {
                     case 'turnEnd':
                     case 'turnStart': {
                        reportData.effects[key] = this._getTurnEffectReportData(value);
                        break;
                     }
                     case 'initiative': {
                        reportData.effects[key] = this._getInitiativeEffectReportData(value);
                        break;
                     }
                     case 'custom': {
                        reportData.effects[key] = this._getCustomEffectReportData(value);
                        break;
                     }
                     default: {
                        reportData.effects[key] = this._getEffectReportData(value);
                        break;
                     }
                  }
               }
            }

            // Get conditions.
            let conditions = this.getConditions();
            if (conditions) {

               // Add conditions to the report.
               conditions = conditions.sort((a, b) => sortAscending(a.name, b.name));
               reportData.conditions = conditions.map((condition) => {
                  return {
                     label: condition.name,
                     img: condition.img,
                     description: condition.flags.titan.description,
                  };
               });
            }
         }

         // Otherwise, add expired effects to the report if we need to show a.
         // button for removing them.
         else if (expiredEffects && autoRemoveExpiredEffectsSetting === 'showButton') {
            reportData.effects = {
               expired: this._getEffectReportData(expiredEffects),
            };
         }

         // Process expired effects.
         await this._processExpiredEffects(autoRemoveExpiredEffectsSetting, expiredEffects, reportData);

         // Send a report if appropriate.
         if (Object.keys(reportData).length > 0) {

            // Prepare the report data.
            reportData.type = 'turnStartReport';
            reportData.actorImg = this.parent.img;
            reportData.actorName = this.parent.name;

            await this._whisperOwners(reportData, this._getTurnReportUserID(), true);

            return reportData;
         }
      }
   }

   /**
    * Called at the End of this Character's Turn in combat to update Turn-End effects, and send Turn end messages, if
    * appropriate.
    * @returns {Promise<void>}
    */
   async onTurnEnd() {
      // Perform end-of-turn updates.
      if (isCurrentUserBestOwner(this.parent)) {

         // Initialize variables.
         /** @type {object} */
         const reportData = {};
         /** @type {boolean} */
         let shouldUpdateActor = false;

         // Calculate healing or damage.
         if (await this._calculateTurnHealingAndDamage(reportData, 'turnEnd')) {
            shouldUpdateActor = true;
         }

         // Update actor if appropriate.
         if (shouldUpdateActor) {
            await this.parent.update({
               system: {
                  resource: structuredClone(this.resource),
               },
            });
         }

         // Get turn messages.
         const message = this.rulesElementsCache?.turnMessage?.turnEnd;
         if (message) {
            reportData.message = structuredClone(message);
         }

         // Update the duration of turn effects.
         await this._decreaseTurnEffectDuration(reportData, 'turnEnd');

         // Calculate whether to report effects and whether to remove expired.
         // effects.
         const shouldReportEffects = reportEffects();
         const autoRemoveExpiredEffectsSetting = autoRemoveExpiredEffects();
         const expiredEffects = this.getExpiredEffects();

         // Otherwise, add expired effects to the report if appropriate.
         if (expiredEffects && (shouldReportEffects || autoRemoveExpiredEffectsSetting === 'showButton')) {
            reportData.effects = {
               expired: this._getEffectReportData(expiredEffects),
            };
         }

         // Process expired effects.
         await this._processExpiredEffects(autoRemoveExpiredEffectsSetting, expiredEffects, reportData);

         // Send a report if appropriate.
         if (Object.keys(reportData).length > 0) {

            // Prepare Titan Flags.
            reportData.type = 'turnEndReport';
            reportData.actorName = this.parent.name;
            reportData.actorImg = this.parent.img;

            // Send the report to chat.
            await this._whisperOwners(reportData, this._getTurnReportUserID(), true);

            return reportData;
         }
      }
   }

   /**
    * Decreases the duration of the turn effects, removes expired effects, and logs report data if appropriate.
    * @param {object} reportData - Object for storing any necessary data for a message report.
    * @param {string} selector - Used to determine whether we are checking for turnStart Effects, or turnEnd Effects.
    * @private
    */
   async _decreaseTurnEffectDuration(reportData, selector) {
      // Decrease effect duration if appropriate.
      if (autoDecreaseEffectDuration()) {
         const turnEffects = this.parent.effects.filter((effect) =>
            effect.type === 'effect' && effect.system.duration.type === selector);
         if (turnEffects.length > 0) {
            for (const effect of turnEffects) {
               effect.system.duration.remaining -= 1;
               await effect.update({
                  system: {
                     duration: {
                        remaining: effect.system.duration.remaining,
                     },
                  },
               });
            }
         }
      }
   }

   /**
    * Increases the duration of turn effects by 1, reversing a prior decrease. Allows remaining to become positive
    * after going negative, but will not incorrectly restore an effect that was already expired before the decrease.
    * @param {string} selector - Used to determine whether we are checking for turnStart or turnEnd Effects.
    * @private
    */
   async _increaseTurnEffectDuration(selector) {
      // Increase effect duration if appropriate.
      if (autoDecreaseEffectDuration()) {
         const turnEffects = this.parent.effects.filter((effect) =>
            effect.type === 'effect' && effect.system.duration.type === selector);
         if (turnEffects.length > 0) {
            for (const effect of turnEffects) {
               effect.system.duration.remaining += 1;
               await effect.update({
                  system: {
                     duration: {
                        remaining: effect.system.duration.remaining,
                     },
                  },
               });
            }
         }
      }
   }

   /**
    * Reverts the Initiative effect duration changes made during a prior call to onInitiativeAdvanced.
    * Uses the same filter as onInitiativeAdvanced but increments remaining instead of decrementing it.
    * @param {float} currentInitiative - The initiative of the combatant that advanced to current in the forward step.
    * @param {float} previousInitiative - The initiative of the combatant that was current before the forward step.
    * @param {boolean} isNewRound - Whether the forward step was the start of a new round.
    * @returns {Promise<void>}
    */
   async onInitiativeReverted(currentInitiative, previousInitiative, isNewRound) {
      if (isCurrentUserBestOwner(this.parent)) {
         if (autoDecreaseEffectDuration()) {
            const initiativeEffects = this.parent.effects.filter((effect) =>
               effect.type === 'effect' && effect.system.duration.type === 'initiative');
            if (initiativeEffects) {

               // Calculate which effects to revert using the same filter as onInitiativeAdvanced.
               let effectsToRevert;

               // If the forward step was the start of a new round, revert effects with an initiative lesser or equal
               // to the forward step's previous initiative, or greater than or equal to the forward step's current.
               if (isNewRound) {
                  effectsToRevert = initiativeEffects.filter((effect) => {
                     const initiative = effect.system.duration.initiative;
                     return (initiative < previousInitiative || initiative >= currentInitiative);
                  });
               }
               else {
                  // If the forward step was not the start of a new round, revert effects with an initiative lesser
                  // than the forward step's previous initiative, but greater than or equal to the current.
                  effectsToRevert = initiativeEffects.filter((effect) => {
                     const initiative = effect.system.duration.initiative;
                     return (initiative < previousInitiative && initiative >= currentInitiative);
                  });
               }

               // Increase the duration of each matched effect by 1 round.
               if (effectsToRevert.length > 0) {
                  for (const effect of effectsToRevert) {
                     effect.system.duration.remaining += 1;
                     await effect.update({
                        system: {
                           duration: {
                              remaining: effect.system.duration.remaining,
                           },
                        },
                     });
                  }
               }
            }
         }
      }
   }

   /**
    * Reverts the Turn-Start changes made during a prior call to onTurnStart, including effect duration increases,
    * Fast Healing reversal, Persistent Damage reversal, and Resolve Regain reversal.
    * @returns {Promise<void>}
    */
   async onTurnStartReverted() {
      if (isCurrentUserBestOwner(this.parent)) {

         // Initialize variables.
         /** @type {object} */
         const reportData = {};
         /** @type {boolean} */
         let shouldUpdateActor = false;

         // Revert healing and damage.
         if (await this._calculateTurnHealingAndDamageRevert(reportData, 'turnStart')) {
            shouldUpdateActor = true;
         }

         // Revert resolve regain.
         if (await this._calculateResolveRegainRevert(reportData)) {
            shouldUpdateActor = true;
         }

         // Update the actor if appropriate.
         if (shouldUpdateActor) {
            await this.parent.update({
               system: {
                  resource: structuredClone(this.resource),
               },
            });
         }

         // Revert the duration of turn start effects.
         await this._increaseTurnEffectDuration('turnStart');

         // Send a report if appropriate.
         if (Object.keys(reportData).length > 0) {

            // Prepare the report data.
            reportData.type = 'turnStartRevertReport';
            reportData.actorImg = this.parent.img;
            reportData.actorName = this.parent.name;

            await this._whisperOwners(reportData, this._getTurnReportUserID(), true);
         }
      }
   }

   /**
    * Reverts the Turn-End changes made during a prior call to onTurnEnd, including effect duration increases and
    * Fast Healing and Persistent Damage reversal.
    * @returns {Promise<void>}
    */
   async onTurnEndReverted() {
      if (isCurrentUserBestOwner(this.parent)) {

         // Initialize variables.
         /** @type {object} */
         const reportData = {};
         /** @type {boolean} */
         let shouldUpdateActor = false;

         // Revert healing and damage.
         if (await this._calculateTurnHealingAndDamageRevert(reportData, 'turnEnd')) {
            shouldUpdateActor = true;
         }

         // Update the actor if appropriate.
         if (shouldUpdateActor) {
            await this.parent.update({
               system: {
                  resource: structuredClone(this.resource),
               },
            });
         }

         // Revert the duration of turn end effects.
         await this._increaseTurnEffectDuration('turnEnd');

         // Send a report if appropriate.
         if (Object.keys(reportData).length > 0) {

            // Prepare the report data.
            reportData.type = 'turnEndRevertReport';
            reportData.actorName = this.parent.name;
            reportData.actorImg = this.parent.img;

            await this._whisperOwners(reportData, this._getTurnReportUserID(), true);
         }
      }
   }

   /**
    * Retrieves the Effect Report Data for an array of Effect Active Effects.
    * @param {ActiveEffect[]} effects - The Effect Active Effects to get report data for.
    * @returns {EffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getEffectReportData(effects) {
      return effects.sort((a, b) => sortAscending(a.name, b.name)).map((effect) => {
         const retVal = {
            label: effect.name,
            img: effect.img,
         };

         // Add the effect description if it is not blank.
         if (!isHTMLBlank(effect.description)) {
            retVal.description = effect.description;
         }

         return retVal;
      });
   }

   /**
    * Retrieves the Effect Report Data for an array of Turn Start or Turn End Effect Active Effects.
    * @param {ActiveEffect[]} effects - The Effect Active Effects to get report data for.
    * @returns {TurnEffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getTurnEffectReportData(effects) {
      return effects.sort((a, b) => sortAscending(a.name, b.name)).map((effect) => {
         const retVal = {
            label: effect.name,
            img: effect.img,
            remaining: effect.system.duration.remaining,
         };

         // Add the effect description if it is not blank.
         if (!isHTMLBlank(effect.description)) {
            retVal.description = effect.description;
         }

         return retVal;
      });
   }

   /**
    * Retrieves the Effect Report Data for an array of Initiative Effect Active Effects.
    * @param {ActiveEffect[]} effects - The Effect Active Effects to get report data for.
    * @returns {InitiativeEffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getInitiativeEffectReportData(effects) {
      return effects.sort((a, b) => sortAscending(a.name, b.name)).map((effect) => {
         const retVal = {
            label: effect.name,
            img: effect.img,
            remaining: effect.system.duration.remaining,
            initiative: effect.system.duration.initiative,
         };

         // Add the effect description if it is not blank.
         if (!isHTMLBlank(effect.description)) {
            retVal.description = effect.description;
         }

         return retVal;
      });
   }

   /**
    * Retrieves the Effect Report Data for an array of Custom Effect Active Effects.
    * @param {ActiveEffect[]} effects - The Effect Active Effects to get report data for.
    * @returns {CustomEffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getCustomEffectReportData(effects) {
      return effects.sort((a, b) => sortAscending(a.name, b.name)).map((effect) => {
         const retVal = {
            label: effect.name,
            img: effect.img,
            remaining: effect.system.duration.remaining,
            custom: effect.system.duration.custom,
         };

         // Add the effect description if it is not blank.
         if (!isHTMLBlank(effect.description)) {
            retVal.description = effect.description;
         }

         return retVal;
      });
   }

   /**
    * Processes effects that have expired, either by removing them from the character, or adding a button to the report
    * data.
    * @param {string} autoRemoveExpiredEffects - The setting for automatically removing expired effects.
    * @param {ActiveEffect[]} expiredEffects - The expired Effect Active Effects for this character.
    * @param {object} reportData - Report data object for storing the result of removing expired effects,
    * such as whether they were removed, or whether a button should be shown to remove them.
    * @returns {Promise<void>}
    */
   async _processExpiredEffects(autoRemoveExpiredEffects, expiredEffects, reportData) {
      if (expiredEffects && autoRemoveExpiredEffects !== 'disabled') {
         switch (autoRemoveExpiredEffects) {
            // Delete each expired effect if appropriate.
            case 'enabled': {
               reportData.expiredEffectsRemoved = true;

               // Collect the IDs first, then delete in a single batch to avoid mutating the live collection while
               // iterating over it.
               /** @type {string[]} The IDs of the expired Effect Active Effects to delete. */
               const expiredEffectIds = expiredEffects.map((effect) => effect.id);
               await this.parent.deleteEmbeddedDocuments('ActiveEffect', expiredEffectIds);
               break;
            }

            // Otherwise, log that expired effects were not removed.
            default: {
               reportData.expiredEffectsRemoved = false;
               break;
            }
         }
      }
   }

   /**
    * Calculate the healing and damage that should be applied to a Character at the Start or End of their turn.
    * @param {object} reportData - Object for storing any necessary data for a message report.
    * @param {string} selector - Used to determine whether we are checking for turnStart Effects, or turnEnd Effects.
    * @returns {Promise<boolean>} Returns true if the actor should be updated.
    * @private
    */
   async _calculateTurnHealingAndDamage(reportData, selector) {
      /** @type {boolean} */
      let shouldUpdateActor = false;

      // If any Fast Healing or Persistent Damage rules elements affect this.
      // character.
      const rulesElements = this.rulesElementsCache;
      if (rulesElements && (rulesElements.fastHealing || rulesElements.persistentDamage)) {

         // Cache the Fast Healing and Persistent Damage rules elements for this.
         // selector.
         const fastHealingElements = rulesElements.fastHealing?.[selector];
         const persistentDamageElements = rulesElements.persistentDamage?.[selector];

         // Determine whether to auto apply dealing and damage.
         const autoApplyHealing = autoApplyFastHealing();
         const autoApplyDamage = autoApplyPersistentDamage();

         // Determine whether healing and damage are already confirmed.
         const healingConfirmed = autoApplyHealing === 'enabled';
         const damageConfirmed = autoApplyDamage === 'enabled';

         // Calculate the total healing and damage.
         /** @type {number} */
         let healing = 0;
         /** @type {number} */
         let damage = 0;
         /** @type {number} */
         let turnStaminaMod = 0;

         // Get the amount of fast healing to be applied.
         if (fastHealingElements && autoApplyHealing !== 'disabled') {
            healing = getSumOfObjectValues(fastHealingElements);
            if (healingConfirmed) {
               turnStaminaMod += healing;
            }
         }

         // Get the amount of persistent damage to apply.
         if (persistentDamageElements && autoApplyDamage !== 'disabled') {
            damage = getSumOfObjectValues(persistentDamageElements);
            if (damageConfirmed) {
               turnStaminaMod -= damage;
            }
         }

         // If there is any healing or damage...
         if (healing > 0 || damage > 0) {

            // Apply healing if appropriate.
            if (turnStaminaMod > 0 && this.resource.stamina.value < this.resource.stamina.max) {
               await this.applyHealing(
                  turnStaminaMod,
                  {
                     updateActor: false,
                     report: false,
                  },
               );
               shouldUpdateActor = true;
            }

            // Otherwise, apply damage if appropriate.
            else if (turnStaminaMod < 0) {
               await this.applyDamage(
                  -turnStaminaMod,
                  {
                     updateActor: false,
                     ignoreArmor: true,
                     report: false,
                  },
               );
               shouldUpdateActor = true;
            }

            // If we should report the healing and damage, or if we need to show.
            // a button for either...
            if ((healing > 0 &&
                  (this.resource.stamina.value < this.resource.stamina.max || damage > 0) &&
                  (reportHealingDamage() || autoApplyHealing === 'showButton')) ||
               (damage > 0 && (reportTakingDamage() || autoApplyDamage === 'showButton'))) {

               // Add the Fast Healing data.
               if (healing > 0) {
                  reportData.fastHealing = structuredClone(fastHealingElements);
                  reportData.fastHealing.total = healing;
                  reportData.fastHealing.confirmed = healingConfirmed;
               }

               // Add the Persistent Damage data.
               if (damage > 0) {
                  reportData.persistentDamage = structuredClone(persistentDamageElements);
                  reportData.persistentDamage.total = damage;
                  reportData.persistentDamage.confirmed = damageConfirmed;
               }

               // Add stamina.
               reportData.resource ??= {};
               reportData.resource.stamina = {
                  max: this.resource.stamina.max,
                  value: this.resource.stamina.value,
               };

               // Add wounds if appropriate.
               if (damage > 0 && this.resource.wounds.max > 0) {
                  reportData.resource.wounds = {
                     max: this.resource.wounds.max,
                     value: this.resource.wounds.value,
                  };
               }
            }
         }
      }

      return shouldUpdateActor;
   }

   /**
    * Calculates how much Resolve to regain at the start of the Character's turn.
    * @param {object} reportData - Object for storing any necessary data for a message report.
    * @returns {Promise<boolean>} Returns true if the actor should be updated.
    * @private
    */
   async _calculateResolveRegain(reportData) {
      /** @type {boolean} */
      let shouldUpdateActor = false;

      // Determine whether to auto-regain resolve.
      const autoRegainResolveSetting = autoRegainResolve();
      if (autoRegainResolveSetting !== 'disabled') {

         // If the resolve value is below max.
         const resolve = this.resource.resolve;
         if (resolve.value < resolve.max) {

            // If any resolve will be regained.
            const maxResolveRegained = resolveBaseRegain() + this.mod.resolveRegain.value;
            if (maxResolveRegained > 0) {

               // Update the resources if appropriate.
               const confirmed = autoRegainResolveSetting === 'enabled';
               if (confirmed) {
                  await this.regainResolve(maxResolveRegained, {
                     updateActor: false,
                     report: false,
                  });
                  shouldUpdateActor = true;
               }

               // Update the report data if appropriate.
               if (reportRegainingResolve() || !confirmed) {
                  reportData.resource ??= {};
                  reportData.resource.resolve = {
                     value: resolve.value,
                     max: resolve.max,
                  };

                  reportData.resolveRegain = {
                     total: maxResolveRegained,
                     confirmed: confirmed,
                  };
               }
            }
         }
      }

      return shouldUpdateActor;
   }

   /**
    * Calculates the resource changes needed to revert Fast Healing and Persistent Damage applied at the Start or End
    * of a prior turn, and applies them or queues a chat button based on the revert settings.
    * @param {object} reportData - Object for storing any necessary data for a message report.
    * @param {string} selector - Used to determine whether we are checking for turnStart or turnEnd Effects.
    * @returns {Promise<boolean>} Returns true if the actor should be updated.
    * @private
    */
   async _calculateTurnHealingAndDamageRevert(reportData, selector) {
      /** @type {boolean} */
      let shouldUpdateActor = false;

      // If any Fast Healing or Persistent Damage rules elements affect this character.
      const rulesElements = this.rulesElementsCache;
      if (rulesElements && (rulesElements.fastHealing || rulesElements.persistentDamage)) {

         // Cache the Fast Healing and Persistent Damage rules elements for this selector.
         const fastHealingElements = rulesElements.fastHealing?.[selector];
         const persistentDamageElements = rulesElements.persistentDamage?.[selector];

         // Determine whether to auto-revert healing and damage.
         const autoRevertHealing = autoRevertFastHealing();
         const autoRevertDamage = autoRevertPersistentDamage();

         // Determine whether the revert operations are already confirmed.
         const healingRevertConfirmed = autoRevertHealing === 'enabled';
         const damageRevertConfirmed = autoRevertDamage === 'enabled';

         // Calculate the totals to revert.
         /** @type {number} */
         let healingToRevert = 0;
         /** @type {number} */
         let damageToRevert = 0;
         /** @type {number} */
         let staminaMod = 0;

         // Get the amount of fast healing to revert (by applying damage).
         if (fastHealingElements && autoRevertHealing !== 'disabled') {
            healingToRevert = getSumOfObjectValues(fastHealingElements);
            if (healingRevertConfirmed) {
               staminaMod -= healingToRevert;
            }
         }

         // Get the amount of persistent damage to revert (by applying healing).
         if (persistentDamageElements && autoRevertDamage !== 'disabled') {
            damageToRevert = getSumOfObjectValues(persistentDamageElements);
            if (damageRevertConfirmed) {
               staminaMod += damageToRevert;
            }
         }

         // If there is any healing or damage to revert.
         if (healingToRevert > 0 || damageToRevert > 0) {

            // Apply damage to revert fast healing if appropriate.
            if (staminaMod < 0) {
               await this.applyDamage(
                  -staminaMod,
                  {
                     updateActor: false,
                     ignoreArmor: true,
                     report: false,
                  },
               );
               shouldUpdateActor = true;
            }

            // Apply healing to revert persistent damage if appropriate.
            else if (staminaMod > 0) {
               await this.applyHealing(
                  staminaMod,
                  {
                     updateActor: false,
                     report: false,
                  },
               );
               shouldUpdateActor = true;
            }

            // Populate report data if needed.
            if (healingToRevert > 0 && autoRevertHealing !== 'disabled') {
               reportData.fastHealingRevert = structuredClone(fastHealingElements);
               reportData.fastHealingRevert.total = healingToRevert;
               reportData.fastHealingRevert.confirmed = healingRevertConfirmed;
            }

            if (damageToRevert > 0 && autoRevertDamage !== 'disabled') {
               reportData.persistentDamageRevert = structuredClone(persistentDamageElements);
               reportData.persistentDamageRevert.total = damageToRevert;
               reportData.persistentDamageRevert.confirmed = damageRevertConfirmed;
            }

            // Add stamina to the report.
            reportData.resource ??= {};
            reportData.resource.stamina = {
               max: this.resource.stamina.max,
               value: this.resource.stamina.value,
            };

            // Add wounds to the report if appropriate.
            if (healingToRevert > 0 && this.resource.wounds.max > 0) {
               reportData.resource.wounds = {
                  max: this.resource.wounds.max,
                  value: this.resource.wounds.value,
               };
            }
         }
      }

      return shouldUpdateActor;
   }

   /**
    * Calculates how much Resolve to spend at the start of a prior turn's reversal.
    * @param {object} reportData - Object for storing any necessary data for a message report.
    * @returns {Promise<boolean>} Returns true if the actor should be updated.
    * @private
    */
   async _calculateResolveRegainRevert(reportData) {
      /** @type {boolean} */
      let shouldUpdateActor = false;

      // Determine whether to auto-revert resolve regain.
      const autoRevertResolveRegainSetting = autoRevertResolveRegain();
      if (autoRevertResolveRegainSetting !== 'disabled') {

         // If any resolve will be reverted.
         const maxResolveToRevert = resolveBaseRegain() + this.mod.resolveRegain.value;
         if (maxResolveToRevert > 0) {

            // Determine whether the revert is confirmed.
            const confirmed = autoRevertResolveRegainSetting === 'enabled';
            if (confirmed) {
               await this.spendResolve(maxResolveToRevert, {
                  updateActor: false,
                  report: false,
               });
               shouldUpdateActor = true;
            }

            // Update the report data if appropriate.
            if (reportRegainingResolve() || !confirmed) {
               reportData.resource ??= {};
               reportData.resource.resolve = {
                  value: this.resource.resolve.value,
                  max: this.resource.resolve.max,
               };

               reportData.resolveRegainRevert = {
                  total: maxResolveToRevert,
                  confirmed: confirmed,
               };
            }
         }
      }

      return shouldUpdateActor;
   }

   /**
    * Sends a private message to the character's owners. The report's discriminator (`type`) is placed at
    * the chat message root so Foundry selects the matching report ChatMessage subtype, and the remaining
    * report payload becomes the typed `system` data of that subtype.
    * @param {object} messageData - Object containing the message data, including its `type` discriminator.
    * @param {string} userId - The ID of the user sending the message.
    * @param {boolean} [playSound] - Whether to play a sound when sending the message.
    * @returns {Promise<void>}
    * @protected
    */
   async _whisperOwners(messageData, userId, playSound = true) {
      // Split the discriminator to the message root and the payload into the typed system data.
      const { type, ...system } = messageData;

      // Initialize message.
      const message = {
         type,
         system,
         user: userId,
         speaker: this.parent.getSpeaker(),
         style: CONST.CHAT_MESSAGE_STYLES.OTHER,
         whisper: getOwners(this.parent),
      };

      // Add sound if appropriate.
      if (playSound) {
         message.sound = CONFIG.sounds.notification;
      }

      await ChatMessage.create(message);
   }

   /**
    * Toggles the multi-attack feature of a Weapon Item.
    * @param {string} itemId - The ID of the weapon item to toggle Multi-Attack on.
    * @returns {Promise<void>}
    */
   async toggleMultiAttack(itemId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the item if the item is valid.
         const item = this.parent.items.get(itemId);
         if (item && item.type === 'weapon') {
            await item.update({
               system: {
                  multiAttack: !item.system.multiAttack,
               },
            });
         }
      }
   }

   /**
    * Toggles the equipped state of an item. If the item is Armor or a Shield, it will either equip it or un-equip it
    * to this character. Otherwise, the Equipped property will be toggled on it.
    * If the item has an "equipped" property in the "system" object, it will update the value of "equipped".
    * @param {string} itemId - The ID of the item to equip or un-equip.
    * @returns {Promise<void>}
    */
   async toggleEquipped(itemId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the item if the item is valid.
         const item = this.parent.items.get(itemId);
         if (item) {

            // If the item is Armor.
            if (item.type === 'armor') {

               // Un-equip the item if equipped.
               if (this.equipped.armor === itemId) {
                  await this.unEquipArmor();
               }

               // Equip the item if unequipped.
               else {
                  await this.equipArmor(itemId);
               }
            }

            // If the item is a Shield.
            else if (item.type === 'shield') {

               // Un-equip the item if equipped.
               if (this.equipped.shield === itemId) {
                  await this.unEquipShield();
               }

               // Equip the item if unequipped.
               else {
                  await this.equipShield(itemId);
               }
            }

            // If the item has the Equipped property, toggle it.
            else if (typeof (item.system.equipped) === 'boolean') {
               item.system.equipped = !item.system.equipped;
               await item.update({
                  system: {
                     equipped: item.system.equipped,
                  },
               });
            }
         }
      }
   }

   /**
    * Toggles the active state of an Effect Active Effect by flipping its native disabled flag.
    * @param {string} effectId - The ID of the Effect Active Effect to toggle the active state for.
    * @returns {Promise<void>}
    */
   async toggleEffectActive(effectId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the Effect Active Effect if valid.
         const effect = this.parent.effects.get(effectId);
         if (effect && effect.type === 'effect') {
            await effect.update({
               disabled: !effect.disabled,
            });
         }
      }
   }

   /**
    * Gets the Armor item equipped by this Character, if any is equipped.
    * @returns {TitanItem|boolean} The equipped Armor item, or false if no Armor is equipped.
    */
   getEquippedArmor() {
      const armor = this.equipped.armor;
      if (armor !== null && armor !== '') {
         return this.parent.items.get(armor) ?? false;
      }
      return false;
   }

   /**
    * Equips an Armor item to the Character.
    * @param {string} itemId - The ID of the Armor item to be equipped.
    * @returns {Promise<void>}
    */
   async equipArmor(itemId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the equipped armor on this character if the armor item is.
         // valid.
         const item = this.parent.items.get(itemId);
         if (item && item.type === 'armor') {
            this.equipped.armor = itemId;
            await this.parent.update({
               system: {
                  equipped: {
                     armor: itemId,
                  },
               },
            });
         }
      }
   }

   /**
    * Un-equips the currently equipped Armor item from the Character.
    * @returns {Promise<void>}
    */
   async unEquipArmor() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the equipped armor on this character.
         this.equipped.armor = null;
         await this.parent.update({
            system: {
               equipped: {
                  armor: null,
               },
            },
         });
      }
   }

   /**
    * Gets the Shield item equipped by this Character, if any is equipped.
    * @returns {TitanItem|boolean} The equipped Shield item, or false if no Shield is equipped.
    */
   getShield() {
      const shield = this.equipped.shield;
      if (shield !== null && shield !== '') {
         return this.parent.items.get(shield) ?? false;
      }
      return false;
   }

   /**
    * Equips a shield item to the Character.
    * @param {string} itemId - The ID of the Shield item to be equipped.
    * @returns {Promise<void>}
    */
   async equipShield(itemId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the equipped shield on this character if the shield item is.
         // valid.
         const shield = this.parent.items.get(itemId);
         if (shield && shield.type === 'shield') {
            this.equipped.shield = itemId;
            await this.parent.update({
               system: {
                  equipped: {
                     shield: itemId,
                  },
               },
            });
         }
      }
   }

   /**
    * Un-equips the currently equipped Armor item from the Character.
    * @returns {Promise<void>}
    */
   async unEquipShield() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the equipped shield on this character.
         this.equipped.shield = null;
         await this.parent.update({
            system: {
               equipped: {
                  shield: null,
               },
            },
         });
      }
   }

   /**
    * Requests for an item to be deleted from the Character.
    * @param {string} itemId - The ID of the item being deleted.
    */
   async requestItemDeletion(itemId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // If the deletion does not need to be confirmed, then delete the item.
         if (!shouldConfirmDeletingItems()) {
            await this.safeDeleteItem(itemId);
         }

         // Otherwise, confirm deleting the item.
         const item = this.parent.items.get(itemId);
         if (item) {
            new ConfirmDeleteItemDialog(
               this.parent,
               item,
            ).render(true);
         }
      }
   }

   /**
    * Deletes an Item from this Character without confirmation dialog.
    * @param {string} itemId - The ID of the Item to be deleted.
    * @returns {Promise<void>}
    */
   async safeDeleteItem(itemId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         await this.parent.deleteEmbeddedDocuments('Item', [itemId]);
      }
   }

   /**
    * Requests deletion of an Active Effect from this Character, prompting for confirmation per the
    * confirmDeletingEffects setting (suppressed by holding the modifier key).
    * @param {string} effectId - The ID of the Effect to delete.
    * @returns {Promise<void>}
    */
   async requestEffectDeletion(effectId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // If the deletion does not need to be confirmed, then delete the effect.
         if (!shouldConfirmDeletingEffects()) {
            await this.safeDeleteEffect(effectId);
         }

         // Otherwise, confirm deleting the effect.
         const effect = this.parent.effects.get(effectId);
         if (effect) {
            new ConfirmDeleteEffectDialog(
               this.parent,
               effect,
            ).render(true);
         }
      }
   }

   /**
    * Deletes an Active Effect from this Character without a confirmation dialog.
    * @param {string} effectId - The ID of the Effect to be deleted.
    * @returns {Promise<void>}
    */
   async safeDeleteEffect(effectId) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         await this.parent.deleteEmbeddedDocuments('ActiveEffect', [effectId]);
      }
   }

   /**
    * Rolls initiative for this Character. If the Character is in combat, the initiative tracker will be updated
    * accordingly. Otherwise, a chat card will be sent without update combat.
    * @returns {Promise<void>}
    */
   async requestInitiativeRoll() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // If this Character is a combatant, then roll initiative as per normal.
         if (this.parent.getCombatant()) {
            return this.parent.rollInitiative({ rerollInitiative: true });
         }

         // If this character is not a combatant, get and evaluate the roll.
         const roll = await this.getInitiativeRoll();
         if (roll) {

            // Get the message data.
            const messageData = {
               speaker: this.parent.getSpeaker(),
               flavor: game.i18n.format('COMBAT.RollsInitiative', { name: this.parent.name }),
               flags: { 'core.initiativeRoll': true },
            };

            // Create a chat message from the roll and send it to chat.
            const chatData = await roll.toMessage(messageData, { create: false });
            ChatMessage.applyMode(chatData);

            await ChatMessage.create(chatData);
         }
      }
   }

   /**
    * Gets an Initiative roll for this character.
    * @returns {Promise<Roll>} The Initiative roll for this actor.
    */
   async getInitiativeRoll() {
      // Calculate the initiative value.
      const initiative = this.rating.initiative.value;

      // Get the initiative formula.
      const formula = initiativeFormula();

      return new Roll(`${initiative}${formula}`);
   }

   /**
    * Retrieves the user ID to associate with turn reports. This is the UD of the Best Player Owner.
    * @returns {string} The ID of the user to associate with Turn Reports.
    * @private
    */
   _getTurnReportUserID() {
      const playerOwner = getBestPlayerOwner(this.parent);
      return playerOwner ? playerOwner.id : game.user.id;
   }

   /**
    * Calculates the total amount of XP spent by the Character.
    * @returns {number} The total amount of XP spent.
    */
   _getSpentXP() {
      // Calculate the amount of XP spent=.
      /** @type {number} */
      let spentXp = 0;

      // Add cost of current attribute.
      for (const attribute of Object.values(this.attribute)) {
         spentXp += this._calculateAttributeXPCost(attribute.baseValue);
      }

      // Add cost of current skill.
      for (const skill of Object.values(this.skill)) {
         spentXp += this._calculateSkillXPCost(skill.training.baseValue);
         spentXp += this._calculateSkillXPCost(skill.expertise.baseValue);
      }

      // Add cost of spells and abilities.
      this.parent.items.forEach((item) => {
         if (item.type === 'spell' || item.type === 'ability') {
            spentXp += item.system.xpCost;
         }
      });

      return spentXp;
   }

   /**
    * Calculates the total XP cost for an Attribute at a given rank.
    * @param {number} value - The rank of the Attribute.
    * @returns {number} The total XP cost of the Attribute.
    */
   _calculateAttributeXPCost(value) {
      // Attribute Cost starts at 2 for rank 2, and increases by consecutive odd.
      // integers, starting with 5.
      /** @type {number} */
      let retVal = 0;
      /** @type {number} */
      let intervalCost = 2;
      /** @type {number} */
      let oddNumber = 5;
      for (let idx = 1; idx < value; idx++) {
         retVal += intervalCost;
         intervalCost = oddNumber;
         oddNumber += 2;
      }

      return retVal;
   }

   /**
    * Calculates the total XP cost for a Skill at a given rank.
    * @param {number} value - The rank of the Skill.
    * @returns {number} The total XP cost of the Skill.
    */
   _calculateSkillXPCost(value) {
      // Skill Cost starts at 1 for rank 1, and increases by consecutive even.
      // integers, starting with 2.
      /** @type {number} */
      let retVal = 0;
      /** @type {number} */
      let intervalCost = 1;
      /** @type {number} */
      let evenNumber = 2;
      for (let idx = 0; idx < value; idx++) {
         retVal += intervalCost;
         intervalCost = evenNumber;
         evenNumber += 2;
      }

      return retVal;
   }

   /**
    * Creates a dialog for adding an item to this Character's inventory.
    * @returns {Promise<Application>} The newly created dialog.
    */
   async addInventoryItem() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         return new AddInventoryItemDialog(this.parent).render(true);
      }
   }
}
