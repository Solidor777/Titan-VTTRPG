import {
   clamp,
   confirmDeletingItems,
   documentSort,
   getBestPlayerOwner,
   getCombatTargets,
   getOwners,
   getSetting,
   getSumOfValuesInObject,
   isFirstOwner,
   isHTMLBlank,
   localize,
   shouldGetCheckOptions,
   sortObjectsIntoContainerByFunction,
} from '~/helpers/Utility.js';
import { applyFlatModifierElements } from '~/rules-element/FlatModifier.js';
import { applyMulBaseElements } from '~/rules-element/MulBase.js';
import { applyFastHealingElements } from '~/rules-element/FastHealing';
import { applyPersistentDamageElements } from '~/rules-element/PersistentDamage';
import { applyTurnMessageElements } from '~/rules-element/TurnMessage';
import {
   applyRollMessageElements,
   getAttributeCheckMessages,
   getResistanceCheckMessages,
   getAttackCheckMessages,
   getCastingCheckMessages,
   getItemCheckMessages
} from '~/rules-element/RollMessage';
import { applyConditionalRatingModifierElements, getAttackRatingModifier } from '~/rules-element/ConditionalRatingModifier';
import ResistanceCheckDialog from '~/check/types/resistance-check/ResistanceCheckDialog.js';
import AttributeCheckDialog from '~/check/types/attribute-check/AttributeCheckDialog.js';
import AttackCheckDialog from '~/check/types/attack-check/AttackCheckDialog.js';
import CastingCheckDialog from '~/check/types/casting-check/CastingCheckDialog.js';
import TitanAttributeCheck from '~/check/types/attribute-check/AttributeCheck.js';
import TitanResistanceCheck from '~/check/types/resistance-check/ResistanceCheck.js';
import TitanAttackCheck from '~/check/types/attack-check/AttackCheck.js';
import TitanCastingCheck from '~/check/types/casting-check/CastingCheck.js';
import TitanItemCheck from '~/check/types/item-check/ItemCheck.js';
import TitanTypeComponent from '~/helpers/TypeComponent.js';
import ItemCheckDialog from '~/check/types/item-check/ItemCheckDialog';
import ConfirmDeleteItemDialog from '~/actor/dialogs/ConfirmDeleteItemDialog';
import ConfirmRemoveExpiredEffectsDialog from '~/actor/types/character/dialogs/ConfirmRemoveExpiredEffectsDialog';
import {
   applyConditionalCheckModifierElements,
   getAttackCheckMod,
   getCastingCheckMod,
   getItemCheckMod,
   getAttributeCheckMod
} from '~/rules-element/ConditionalCheckModifier';

export default class TitanCharacterComponent extends TitanTypeComponent {

   // Apply rules element bindings
   _applyFlatModifierElements = applyFlatModifierElements.bind(this);
   _applyMulBaseElements = applyMulBaseElements.bind(this);
   _applyFastHealingElements = applyFastHealingElements.bind(this);
   _applyPersistentDamageElements = applyPersistentDamageElements.bind(this);
   _applyTurnMessageElements = applyTurnMessageElements.bind(this);
   _applyRollMessageElements = applyRollMessageElements.bind(this);
   _applyConditionRatingModifierElements = applyConditionalRatingModifierElements.bind(this);
   _applyConditionalCheckModifierElements = applyConditionalCheckModifierElements.bind(this);
   _getAttributeCheckMessages = getAttributeCheckMessages.bind(this);
   _getResistanceCheckMessages = getResistanceCheckMessages.bind(this);
   _getAttackCheckMessages = getAttackCheckMessages.bind(this);
   _getCastingCheckMessages = getCastingCheckMessages.bind(this);
   _getItemCheckMessages = getItemCheckMessages.bind(this);
   getAttackRatingModifier = getAttackRatingModifier.bind(this);
   getAttackCheckMod = getAttackCheckMod.bind(this);
   getCastingCheckMod = getCastingCheckMod.bind(this);
   getItemCheckMod = getItemCheckMod.bind(this);
   getAttributeCheckMod = getAttributeCheckMod.bind(this);

   setInitialData(initialData) {
      // Prototype token
      if (!initialData.prototypeToken) {
         initialData.prototypeToken = {};
      }
      initialData.prototypeToken.bar1 = { attribute: 'resource.stamina' };
      initialData.prototypeToken.bar2 = { attribute: 'resource.resolve' };
      initialData.prototypeToken.displayName = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
      initialData.prototypeToken.displayBars = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;

      return;
   }

   _getSpentXP() {
      const systemData = this.parent.system;
      // Calculate the amount of XP spent
      let spentXp = 0;

      // Add cost of current attribute
      for (const attribute of Object.values(systemData.attribute)) {
         spentXp += this._getAttributeXPCost(attribute.baseValue);
      }

      // Add cost of current skill
      for (const skill of Object.values(systemData.skill)) {
         spentXp += this._getSkillXPCost(skill.training.baseValue);
         spentXp += this._getSkillXPCost(skill.expertise.baseValue);
      }

      // Add cost of spells and abilities

      this.parent.items.forEach((item) => {
         if (item.type === "spell" || item.type === "ability") {
            spentXp += item.system.xpCost;
         }
      });

      return spentXp;
   }

   _getAttributeXPCost(value) {
      // Attribute Cost starts at 2 for rank 2, and increases by consecutive odd integers, starting with 5
      let retVal = 0;
      let intervalCost = 2;
      let oddNumber = 5;
      for (let idx = 1; idx < value; idx++) {
         retVal += intervalCost;
         intervalCost = oddNumber;
         oddNumber += 2;
      }

      return retVal;
   }

   _getSkillXPCost(value) {
      // Skill Cost starts at 1 for rank 1, and increases by consecutive even integers, starting with 2
      let retVal = 0;
      let intervalCost = 1;
      let evenNumber = 2;
      for (let idx = 0; idx < value; idx++) {
         retVal += intervalCost;
         intervalCost = evenNumber;
         evenNumber += 2;
      }

      return retVal;
   }

   // Prepare Character type specific data
   prepareDerivedData() {
      this._calculateBaseRatings();
      this._calculateBaseResistances();
      this._calculateBaseResources();
      this._resetDynamicMods();
      this._sortEffects();
      this._applyRulesElements();
      this._applyConditions();
      this._applyEquipmentSlots();
      this._applyMods();
      this._clampResources();
      this._checkUpdateActiveEffects();

      return;
   }

   _calculateBaseRatings() {
      const systemData = this.parent.system;

      // Calculate the base value of ratings
      // Initiative = (Mind + Perception + Dexterity) / 2 rounded up
      systemData.rating.initiative.baseValue =
         Math.ceil((systemData.attribute.mind.baseValue +
            systemData.skill.perception.training.baseValue +
            systemData.skill.dexterity.training.baseValue) / 2);

      // Awareness = (Mind + Perception) / 2 rounded up
      systemData.rating.awareness.baseValue =
         Math.ceil((systemData.attribute.mind.baseValue +
            systemData.skill.perception.training.baseValue) / 2);

      // Defense = (Body + Dexterity) / 2 rounded up
      systemData.rating.defense.baseValue =
         Math.ceil((systemData.attribute.body.baseValue +
            systemData.skill.dexterity.training.baseValue) / 2);

      // Accuracy = (Mind + Training in Ranged Weapons) / 2 rounded up
      systemData.rating.accuracy.baseValue =
         Math.ceil((systemData.attribute.mind.baseValue +
            systemData.skill.rangedWeapons.training.baseValue) / 2);

      // Melee = (Body + Training in Melee Weapons) / 2 rounded up
      systemData.rating.melee.baseValue =
         Math.ceil((systemData.attribute.body.baseValue +
            systemData.skill.meleeWeapons.training.baseValue) / 2);

      return;
   }

   _calculateBaseResistances() {
      const systemData = this.parent.system;

      // Calculate resistance base values
      // Reflexes = (Mind + (Body / 2) rounded up)
      systemData.resistance.reflexes.baseValue =
         systemData.attribute.mind.baseValue +
         Math.floor(systemData.attribute.body.baseValue * 0.5);

      // Resilience = (Body + (Soul/2) rounded up)
      systemData.resistance.resilience.baseValue =
         systemData.attribute.body.baseValue +
         Math.floor(systemData.attribute.soul.baseValue * 0.5);

      // Willpower = (Soul + (Mind/2))
      systemData.resistance.willpower.baseValue =
         systemData.attribute.soul.baseValue +
         Math.floor(systemData.attribute.mind.baseValue * 0.5);
   }

   _calculateBaseResources() {
      const systemData = this.parent.system;
      const totalBaseAttributeValue =
         systemData.attribute.body.baseValue +
         systemData.attribute.mind.baseValue +
         systemData.attribute.soul.baseValue;

      // Calculate base resource values
      // Stamina = Total Attribute Mod
      systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaBaseMultiplier')), 1);

      // Resolve = Soul / 2 rounded up
      systemData.resource.resolve.maxBase = Math.ceil(Math.ceil(systemData.attribute.soul.baseValue * getSetting('resolveBaseMultiplier')), 1);

      // Wounds = Total Attribute mod / 2 rounded up
      systemData.resource.wounds.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('woundsBaseMultiplier')), 1);
   }

   _resetDynamicMods() {
      // Reference to the parent system data
      const systemData = this.parent.system;
      function resetMods(mods) {
         mods.equipment = 0;
         mods.effect = 0;
         mods.ability = 0;
      }

      // Attributes
      for (const attribute of Object.values(systemData.attribute)) {
         resetMods(attribute.mod);
      }

      // Skills
      for (const skill of Object.values(systemData.skill)) {
         resetMods(skill.training.mod);
         resetMods(skill.expertise.mod);
      }

      // Resource
      for (const resource of Object.values(systemData.resource)) {
         resetMods(resource.mod);
      }

      // Resistance
      for (const resistance of Object.values(systemData.resistance)) {
         resetMods(resistance.mod);
      }

      // Rating
      for (const rating of Object.values(systemData.rating)) {
         resetMods(rating.mod);
      }

      // Speed
      for (const speed of Object.values(systemData.speed)) {
         resetMods(speed.mod);
      }

      // Mod
      for (const mod of Object.values(systemData.mod)) {
         resetMods(mod.mod);
      }

      // Conditions
      for (const condition of Object.keys(systemData.condition)) {
         systemData.condition[condition] = false;
      }

      return;
   }

   _getActiveEffectItems() {
      return this.parent.items.filter((effect) => effect.type === 'effect' && (effect.system.active || effect.system.duration.type !== 'permanent'));
   }

   _sortEffects() {
      // Sort effects by duration type
      const effectItems = this._getActiveEffectItems().sort((a, b) => documentSort(a, b));
      const sortedEffects = sortObjectsIntoContainerByFunction(effectItems, (effect) => {
         return effect.typeComponent?.isExpired() ? 'expired' : effect.system.duration.type;
      });

      // Cache effects
      this.effect = Object.keys(sortedEffects).length > 0 ? sortedEffects : false;

      // Added conditions if appropriate
      const conditions = this.parent.temporaryEffects.filter((effect) => effect.flags.titan?.type === 'condition');
      this.conditions = conditions.length > 0 ? conditions : false;

      return;
   }

   _applyRulesElements() {
      // Get all the rules elements
      const rulesElements = [];
      this.parent.items.forEach((item) => {
         if (item.system.rulesElement && item.system.rulesElement.length > 0) {
            // Equipment, armor, shields, and weapons only apply elements if they are equipped
            switch (item.type) {
               case 'armor': {
                  if (this.parent.system.equipped.armor === item._id) {
                     rulesElements.push(...item.system.rulesElement);
                  }
                  break;
               }
               case 'shield': {
                  if (this.parent.system.equipped.shield === item._id) {
                     rulesElements.push(...item.system.rulesElement);
                  }
                  break;
               }
               case 'weapon':
               case 'equipment': {
                  if (item.system.equipped) {
                     rulesElements.push(...item.system.rulesElement);
                  }
                  break;
               }
               case 'effect': {
                  if (item.system.active || item.system.duration.type !== 'permanent') {
                     rulesElements.push(...item.system.rulesElement);
                  }

                  break;
               }
               default: {
                  rulesElements.push(...item.system.rulesElement);
               }
            }
         }
      });

      // Sort the rules elements and process them in order
      const mulBaseElements = [];
      const flatModifierElements = [];
      const fastHealingElements = [];
      const persistentDamageElements = [];
      const turnMessageElements = [];
      const rollMessageElements = [];
      const conditionalRatingModifierElements = [];
      const conditionalCheckModifierElements = [];
      rulesElements.forEach((element) => {
         switch (element.operation) {
            case 'mulBase': {
               mulBaseElements.push(element);
               break;
            }
            case 'flatModifier': {
               flatModifierElements.push(element);
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
               conditionalCheckModifierElements.push(element);
               break;
            }
            default: {
               break;
            }
         }
      });

      // Apply elements
      this._applyMulBaseElements(mulBaseElements);
      this._applyFlatModifierElements(flatModifierElements);
      this._applyFastHealingElements(fastHealingElements);
      this._applyPersistentDamageElements(persistentDamageElements);
      this._applyTurnMessageElements(turnMessageElements);
      this._applyRollMessageElements(rollMessageElements);
      this._applyConditionRatingModifierElements(conditionalRatingModifierElements);
      this._applyConditionalCheckModifierElements(conditionalCheckModifierElements);

      return;
   }

   _applyConditions() {
      // If there are any valid conditions
      if (this.conditions) {
         // Check each effect to see if it is a status effect
         this.conditions.forEach((condition) => {
            switch (condition.flags.core.statusId) {
               // Blinded
               case 'blinded': {
                  const systemData = this.parent.system;
                  systemData.condition.blinded = true;

                  // Decrease Melee, Accuracy, and Defense by 1
                  systemData.rating.melee.mod.effect -= 1;
                  systemData.rating.accuracy.mod.effect -= 1;
                  systemData.rating.defense.mod.effect -= 1;

                  break;
               }

               // Contaminated
               case 'contaminated': {
                  // Apply the effect
                  const systemData = this.parent.system;
                  systemData.condition.contaminated = true;

                  // Decrease all Skills and Resistances by 1
                  for (const attribute of Object.values(systemData.attribute)) {
                     attribute.mod.effect -= 1;
                  }
                  for (const resistance of Object.values(systemData.resistance)) {
                     resistance.mod.effect -= 1;
                  }
                  break;
               }

               // Defeaned
               case 'deafened': {
                  // Apply the effect
                  this.parent.system.condition.deafened = true;
                  break;
               }

               // Frightened
               case 'frightened': {
                  // Apply the effect
                  this.parent.system.condition.frightened = true;
                  break;
               }

               // Paralysis
               case 'incapacitated': {
                  // Apply the effect
                  this.parent.system.condition.incapacitated = true;
                  break;
               }

               // Prone
               case 'prone': {
                  // Apply the effect
                  const systemData = this.parent.system;
                  systemData.condition.prone = true;

                  // Decrease Speed by half
                  for (const speed of Object.values(systemData.speed)) {
                     // Calculate the total speed
                     let speedValue = speed.baseValue;
                     for (const mod of Object.values(speed.mod)) {
                        speedValue += mod;
                     }

                     // Set the effect mod so that the total speed is 1/2 of normal
                     if (speedValue > 0) {
                        speed.mod.effect -= (Math.ceil(speedValue / 2));
                     }
                  }

                  break;
               }

               // Restrained
               case 'restrained': {
                  // Apply the effect
                  const systemData = this.parent.system;
                  systemData.condition.restrained = true;

                  // Decrease Melee, Accuracy, and Defense by 1
                  systemData.rating.melee.mod.effect -= 1;
                  systemData.rating.accuracy.mod.effect -= 1;
                  systemData.rating.defense.mod.effect -= 1;

                  // Decrease Speed to 0
                  for (const speed of Object.values(systemData.speed)) {
                     // Calculate the total speed
                     let speedValue = speed.baseValue;
                     for (const mod of Object.values(speed.mod)) {
                        speedValue += mod;
                     }

                     // Set the effect speed so that the total speed is 0 
                     if (speedValue > 0) {
                        speed.mod.effect -= speedValue;
                     }
                  }

                  break;
               }

               // Sleep
               case 'sleep': {
                  // Apply the effect
                  const systemData = this.parent.system;
                  systemData.condition.sleeping = true;

                  // Calculate the total awareness
                  const awareness = this.parent.system.rating.awareness;
                  let awarenessValue = awareness.baseValue + awareness.mod.static + awareness.equipment;
                  for (const mod of Object.values(awareness.mod)) {
                     awarenessValue += mod;
                  }

                  // Set the effect mod so that the total awareness is 1/2 of norma;
                  if (awarenessValue > 0) {
                     awareness.mod.effect -= (Math.ceil(awarenessValue / 2));
                  }

                  break;
               }

               // Sleep
               case 'stunned': {
                  // Apply the effect
                  const systemData = this.parent.system;
                  systemData.condition.stunned = true;

                  // Decrease Defense by 1
                  systemData.rating.defense.mod.effect -= 1;

                  break;
               }

               // Unconscious
               case 'unconscious': {
                  this.parent.system.condition.unconscious = true;
                  break;
               }

               default: {
                  break;
               }
            }
         });
      }
   }

   _applyEquipmentSlots() {
      const systemData = this.parent.system;

      // Add defense from equipped shield if appropriate
      const equippedShieldId = this.parent.system.equipped.shield;
      if (equippedShieldId) {
         const defense = systemData.rating.defense;
         const equippedShield = this.parent.items.get(equippedShieldId);
         if (equippedShield) {
            defense.mod.equipment += equippedShield.system.defense;
         }
         else {
            this.parent.system.equipped.shield = null;
         }
      }

      // Add armor from the equipped armor if appropriate
      const equippedArmorId = this.parent.system.equipped.armor;
      if (equippedArmorId) {
         const armor = systemData.mod.armor;
         const equippedArmor = this.parent.items.get(equippedArmorId);
         if (equippedArmor) {
            armor.mod.equipment += equippedArmor.system.armor.value;
            const armorTraits = equippedArmor.system.trait;

            // Add encumbrance
            for (let idx = 0; idx < armorTraits.length; idx++) {
               if (armorTraits[idx].name === 'heavy.armor') {
                  for (const speed of Object.values(this.parent.system.speed)) {
                     let totalSpeed = speed.value;
                     for (const mod of Object.values(speed.mod)) {
                        totalSpeed += mod;
                     }
                     if (totalSpeed > 0) {
                        speed.mod.equipment -= 1;
                     }
                  }
                  break;
               }
            }
         }
         else {
            this.parent.system.equipped.armor = null;
         }
      }
   }

   _applyMods() {
      // Get a reference to the parent system data
      const systemData = this.parent.system;

      function applyMods(stat) {
         stat.value = stat.baseValue;

         // Each mod in the stat
         for (const mod of Object.values(stat.mod)) {
            stat.value = Math.max(stat.value + mod, 0);
         }
      }

      function applyModsDeep(stats) {
         // Each stat
         for (const stat of Object.values(stats)) {
            applyMods(stat);
         }
      }

      // Attributes
      applyModsDeep(systemData.attribute);

      // Skills
      for (const skill of Object.values(systemData.skill)) {
         // Training
         applyMods(skill.training);

         // Expertise
         applyMods(skill.expertise);
      }

      // Resistances
      applyModsDeep(systemData.resistance);


      // Ratings
      applyModsDeep(systemData.rating);

      // Resources
      for (const resource of Object.values(systemData.resource)) {
         resource.max = resource.maxBase;
         for (const mod of Object.values(resource.mod)) {
            resource.max = Math.max(resource.max + mod, 0);
         }
      }

      // Speeds
      applyModsDeep(systemData.speed);

      // Mods
      for (const mod of Object.values(systemData.mod)) {
         mod.value = 0;
         for (const modMod of Object.values(mod.mod)) {
            mod.value = Math.max(mod.value + modMod, 0);
         }
      }
      return;
   }

   _clampResources() {
      for (const resource of Object.values(this.parent.system.resource)) {
         resource.value = clamp(resource.value, 0, resource.max);
      }
   }

   async _checkUpdateActiveEffects() {
      if (isFirstOwner(this.parent)) {
         // If we are not currently activating effects
         if (this.isUpdatingActiveEffects !== true) {

            // Update state
            this.isUpdatingActiveEffects = true;
            this.queuedUpdateActiveEffects = true;

            // Continue updating effects for as long as it is queued
            while (this.queuedUpdateActiveEffects === true) {
               this.queuedUpdateActiveEffects = false;
               await this._updateActiveEffects();
            }

            this.isUpdatingActiveEffects = false;
         }
         // Otherwise, queue an update
         else {
            this.queuedUpdateActiveEffects = true;
         }

      }
      return;
   }

   async _updateActiveEffects() {
      // Cleanup orphaned active effects
      for (const effect of this.parent.effects) {
         if (effect.flags.titan?.type === 'effect') {
            const effectItem = this.parent.items.get(effect.origin);
            if (!effectItem || !effectItem.typeComponent.isActive()) {
               await effect.delete();
            }
         }
      }

      // For each effect item
      for (const effectItem of this._getActiveEffectItems()) {
         const effects = this.parent.effects.filter((effect) => effect.origin === effectItem._id);

         // Update effects if appropriate
         if (effects.length > 0) {

            // Delete duplicate effects
            for (let idx = 1; idx < effects.length; idx++) {
               await effects[idx].delete();
            }

            // Update the effect if appropriate
            const effect = effects[0];
            const updateData = {};
            let shouldUpdateEffect = false;

            // Update the icon
            const icon = effectItem.img;
            if (effect.icon !== icon) {
               shouldUpdateEffect = true;
               updateData.icon = icon;
            }

            // Update the duration remaining if appropriate
            const isPermanent = effectItem.system.duration.type === 'permanent';
            const remaining = isPermanent ? 0 : effectItem.system.duration.remaining;
            if (effect.duration.turns !== remaining) {
               shouldUpdateEffect = true;
               updateData.duration = {
                  turns: remaining
               };
            }

            // Update the label
            const label = isPermanent || remaining > 0 ? effectItem.name : `${effectItem.name} (${localize('expired')})`;
            if (effect.name !== label) {
               shouldUpdateEffect = true;
               updateData.label = label;
            }

            // Update visual active effects description if appropriate
            const description = effectItem.system.description === '' ||
               effectItem.system.description === '<p></p>' ? '' : TextEditor.enrichHTML(effectItem.system.description, { async: false, secrets: true });
            if (description !== effect['flags.visual-active-effects.data.content']) {
               shouldUpdateEffect = true;
               updateData['flags.visual-active-effects.data.content'] = description;
            }

            // Update effect if appropriate
            if (shouldUpdateEffect) {
               await effect.update(updateData);
            }
         }

         // Otherwise, create an effect
         else {
            await this.parent.createEmbeddedDocuments('ActiveEffect',
               [{
                  label: effectItem.name,
                  icon: effectItem.img,
                  origin: effectItem._id,
                  disabled: false,
                  duration: {
                     turns: effectItem.system.duration.turns
                  },
                  flags: {
                     core: {
                        statusId: effectItem._id,
                     },
                     titan: {
                        type: 'effect'
                     },
                     'visual-active-effects.data.content': TextEditor.enrichHTML(effectItem.system.description, { async: false, secrets: true })
                  },
               }],
            );
         }
      }
   }

   // Get the initiative check
   async getInitiativeRoll() {
      // Calculate the initiative value
      const initiative = this.parent.system.rating.initiative.value;

      // Get the initiative formula
      const initiativeFormula = getSetting('initiativeFormula');

      return await new Roll(`${initiative}${initiativeFormula}`);
   }

   async rollInitiative(options) {
      if (this.parent.isOwner) {
         const roll = await this.getInitiativeRoll(options);
         if (await roll.evaluate({ async: true })) {
            // Construct chat message data
            let messageData = foundry.utils.mergeObject({
               speaker: ChatMessage.getSpeaker({
                  actor: this.parent,
                  token: this.parent.token,
                  alias: this.parent.name
               }),
               flavor: game.i18n.format("COMBAT.RollsInitiative", { name: this.parent.name }),
               flags: { "core.initiativeRoll": true }
            });
            const chatData = await roll.toMessage(messageData, { create: false });
            chatData.rollMode = options?.rollMode ?
               options.rollMode :
               game.settings.get('core', 'rollMode');
            await ChatMessage.create(chatData);
         }
      }

      return;
   }

   // Get a skill check from the actor
   async _getAttributeCheck(options) {

      // Get the actor check data
      options.actorRollData = this.parent.getRollData();

      // Ensure the attribute is set
      if ((!options.attribute || options.attribute === 'default')) {
         if (options.skill && options.skill !== 'none') {
            options.attribute = this.parent.system.skill[options.skill].defaultAttribute;
         }
         else {
            console.error('TITAN | Attribute check failed. No attribute or skill provided');
            return;
         }
      }

      // Initialize check mods
      options.diceMod = options.diceMod ?? this.getAttributeCheckMod('dice', options.attribute, options.skill);
      options.expertiseMod = options.expertiseMod ?? this.getAttributeCheckMod('expertise', options.attribute, options.skill);

      return new TitanAttributeCheck(options);
   }

   _getAttributeCheckDialog(options) {
      // Initialize default attribute for the skill if no attribute was specified
      if ((options.skill && options.skill !== 'none') && (!options.attribute || options.attribute === 'default')) {
         options.attribute = this.parent.system.skill[options.skill].defaultAttribute;
      }

      const dialog = new AttributeCheckDialog(this.parent, options);
      return dialog.render(true);
   }

   async rollAttributeCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // If confirmed
         if (confirmed || !shouldGetCheckOptions()) {
            // Get the check
            const check = await this._getAttributeCheck(options);
            if (check && check.isValid) {
               await this._expendCheckResolve(check);
               await check.evaluateCheck();
               await check.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
                  message: this._getAttributeCheckMessages(check)
               });
            }
         }

         // Otherwise open a check dialog
         else {
            this._getAttributeCheckDialog(options);
         }
      }

      return;
   }

   // Get a resistance check at the actor
   async _getResistanceCheck(options) {

      // Get the actor check data
      options.actorRollData = this.parent.getRollData();

      // Get the check
      return new TitanResistanceCheck(options);
   }

   async rollResistanceCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // If confirmed
         if (confirmed || !shouldGetCheckOptions()) {

            // Get the check
            const check = await this._getResistanceCheck(options);
            if (check && check.isValid) {
               await check.evaluateCheck();
               await check.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
                  message: this._getResistanceCheckMessages(check)
               });
            }
         }

         else {
            // Otherwise open a check dialog
            const dialog = new ResistanceCheckDialog(this.parent, options);
            dialog.render(true);
         }
      }

      return;
   }

   // Get an attack check
   async _getAttackCheck(options) {
      // Get the weapon check data.
      const weapon = this.parent.items.get(options?.itemId);
      if (!weapon || weapon.type !== 'weapon') {
         console.error('TITAN | Attack check failed. Invalid weapon ID provided to actor.');
         console.trace();

         return;
      }

      // Get the attack check data.
      const attack = weapon.system.attack[options.attackIdx];
      if (!attack) {
         console.error('TITAN | Attack check failed. Invalid attack ID provided to actor.');
         console.trace();

         return;
      }

      // Set the attack
      options.attack = attack;

      // Set the attribute
      if (!options.attribute || options.attribute === 'default') {
         options.attribute = attack.attribute;
      }

      // Set the skill
      if (!options.skill || options.skill === 'default') {
         options.skill = attack.skill;
      }

      // Initialize check mods
      options.damageMod = options.damageMod ?? this.getAttackCheckMod('damage', weapon, attack, options.multiAttack ?? weapon.system.multiAttack);
      options.diceMod = options.diceMod ?? this.getAttackCheckMod('dice', weapon, attack, options.multiAttack ?? weapon.system.multiAttack);
      options.expertiseMod = options.expertiseMod ?? this.getAttackCheckMod('expertise', weapon, attack, options.multiAttack ?? weapon.system.multiAttack);

      // Add the actor check data to the check options
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Add the weapon data to the check options
      const itemRollData = weapon.getRollData();
      options.itemRollData = itemRollData;
      options.multiAttack = options.multiAttack ?? itemRollData.multiAttack;

      // Get the target check data
      const userTargets = getCombatTargets();
      if (userTargets[0] && userTargets[0]._id !== this.parent._id) {
         const targetRollData = userTargets[0].getRollData();
         options.targetRollData = targetRollData;
         options.attackerMelee = options.attackerMelee ?? actorRollData.rating.melee.value + this.getAttackRatingModifier('melee', weapon, attack, options.multiAttack);
         options.attackerAccuracy = options.attackAccuracyMelee ?? actorRollData.rating.accuracy.value + this.getAttackRatingModifier('accuracy', weapon, attack, options.multiAttack);
      }

      return new TitanAttackCheck(options);
   }

   _getAttackCheckDialog(options) {
      // Get the weapon check data.
      const weapon = this.parent.items.get(options?.itemId);
      if (!weapon) {
         console.error('TITAN | Attack check failed. Invalid weapon ID provided to actor.');
         console.trace();

         return;
      }

      // Get the attack data
      const attack = weapon.system.attack[options.attackIdx];
      if (!attack) {
         console.error('TITAN | Attack check failed. Invalid Attack Index provided to actor.');
         console.trace();

         return;
      }

      // Set the attribute
      if ((options.skill && options.skill !== 'none') && (!options.attribute || options.attribute === 'default')) {
         options.attribute = this.parent.system.skill[options.skill].defaultAttribute;
      }

      // Create the dialog
      const dialog = new AttackCheckDialog(this.parent, weapon, attack, options);
      return dialog.render(true);
   }


   async rollAttackCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // If confirmed
         if (confirmed || !shouldGetCheckOptions()) {
            // Get the check
            const check = await this._getAttackCheck(options);
            if (check && check.isValid) {
               await this._expendCheckResolve(check);
               await check.evaluateCheck();
               await check.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
                  message: this._getAttackCheckMessages(check)
               });
            }
         }

         // Otherwise open a check dialog
         else {
            this._getAttackCheckDialog(options);
         }
      }

      return;
   }

   async _getCastingCheck(options) {
      // Get the weapon check data.
      const spell = this.parent.items.get(options?.itemId);
      if (!spell || spell.type !== 'spell') {
         console.error('TITAN | Casting check failed. Invalid Spell ID provided to actor.');
         console.trace();

         return;
      }

      // Set the attribute
      if (!options.attribute || options.attribute === 'default') {
         options.attribute = spell.system.castingCheck.attribute;
      }

      // Set the skill
      if (!options.skill || options.skill === 'default') {
         options.skill = spell.system.castingCheck.skill;
      }

      // Initialize check options
      options.damageMod = options.damageMod ?? this.getCastingCheckMod('damage', spell);
      options.healingMod = options.healingMod ?? this.getCastingCheckMod('healing', spell);
      options.diceMod = options.diceMod ?? this.getCastingCheckMod('dice', spell);
      options.expertiseMod = options.expertiseMod ?? this.getCastingCheckMod('expertise', spell);

      // Add the actor check data to the check options
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Add the weapon data to the check options
      const itemRollData = spell.getRollData();
      options.itemRollData = itemRollData;

      // Get the check
      const castingCheck = new TitanCastingCheck(options);
      return castingCheck;
   }

   _getCastingCheckDialog(options) {
      const spell = this.parent.items.get(options?.itemId);
      if (!spell || spell.type !== 'spell') {
         console.error('TITAN | Casting check failed. Invalid Spell ID provided to actor.');
         console.trace();

         return;
      }

      // Create the dialog
      const dialog = new CastingCheckDialog(this.parent, spell, options);
      return dialog.render(true);
   }

   async rollCastingCheck(options, confirmed = false) {
      if (this.parent.isOwner) {
         // Check if confirmed
         if (confirmed || !shouldGetCheckOptions()) {
            // Get the check
            const check = await this._getCastingCheck(options);
            if (check && check.isValid) {
               await this._expendCheckResolve(check);
               await check.evaluateCheck();
               await check.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
                  message: this._getCastingCheckMessages(check)
               });
            }
         }

         // Otherwise open a check dialog
         else {
            this._getCastingCheckDialog(options);
         }
      }

      return;
   }

   async _getItemCheck(options) {
      // Get the Item data.
      const item = this.parent.items.get(options?.itemId);
      if (!item) {
         console.error('TITAN | Item Check failed before creation. Invalid Item ID provided to actor.');
         console.trace();

         return;
      }

      // Get the check
      const check = item.system.check[options.checkIdx];
      if (!check) {
         console.error('TITAN | Item Check failed before creation. Invalid Check IDX provided to actor.');
         console.trace();

         return;
      }

      // Set the attribute
      if (!options.attribute || options.attribute === 'default') {
         options.attribute = check.attribute;
      }

      // Set the skill
      if (!options.skill || options.skill === 'default') {
         options.skill = check.skill;
      }

      options.itemRollData = item.getRollData();
      options.diceMod = options.diceMod ?? this.getItemCheckMod('dice', item, check);
      options.expertiseMod = options.expertiseMod ?? this.getItemCheckMod('expertise', item, check);
      options.damageMod = options.damageMod ?? this.getItemCheckMod('damage', item, check);
      options.healingMod = options.healingMod ?? this.getItemCheckMod('healing', item, check);

      // Add the actor check data to the check options
      options.actorRollData = this.parent.getRollData();

      // Get the check
      const itemCheck = new TitanItemCheck(options);
      return itemCheck;
   }

   _getItemCheckDialog(options) {
      const item = this.parent.items.get(options?.itemId);
      if (!item) {
         console.error('TITAN | Item check failed. Invalid Item ID provided to actor.');
         console.trace();

         return;
      }
      const check = item.system.check[options.checkIdx];
      if (!check) {
         console.error(`TITAN | Item check failed. Invalid Check Idx provided to actor (${options.checkIdx}).`);
         console.trace();

         return;
      }

      // Create the dialog
      const dialog = new ItemCheckDialog(this.parent, item, check, options);
      return dialog.render(true);
   }

   async rollItemCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // If confirmed
         if (confirmed || !shouldGetCheckOptions()) {
            // Get the check
            const check = await this._getItemCheck(options);
            if (check && check.isValid) {
               await this._expendCheckResolve(check);
               await check.evaluateCheck();
               await check.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
                  message: this._getItemCheckMessages(check)
               });
            }
         }

         // Otherwise open a check dialog
         else {
            this._getItemCheckDialog(options);
         }
      }

      return;
   }

   async _expendCheckResolve(check) {
      // Expend resolve if appropriate
      // Doublr traing
      let resolveSpent = 0;
      if (check.parameters.doubleTraining && getSetting('autoSpendResolveDoubleTraining')) {
         resolveSpent += 1;
      }

      // Double expertise
      if (check.parameters.doubleExpertise && getSetting('autoSpendResolveDoubleExpertise')) {
         resolveSpent += 1;
      }

      // Resolve cost
      if (check.parameters.resolveCost && getSetting('autoSpendResolveChecks')) {
         resolveSpent += check.parameters.resolveCost;
      }

      if (resolveSpent > 0) {
         return await this.spendResolve(resolveSpent, { playSound: false });
      }

      return;
   }

   // Apply damage to the actor
   async applyDamage(damage = 1, options) {
      if (damage > 0 && this.parent.isOwner) {

         // Calculate how much damage is resisted
         let damageResistance = options?.ignoreArmor ? 0 : this.parent.system.mod.armor.value;
         if (damageResistance > 0 && options) {
            if (options.ineffective) {
               damageResistance *= 2;
            }

            if (options.penetrating) {
               damageResistance -= 1;
            }
         }

         // Calculate the damage amount
         const damageTaken = damageResistance < damage ? damage - damageResistance : 0;
         const stamina = this.parent.system.resource.stamina;
         const wounds = this.parent.system.resource.wounds;

         // Calculate the number of wounds taken
         let woundsSuffered = 0;
         if (stamina.value < damageTaken) {
            if (stamina.value + 5 <= damageTaken) {
               woundsSuffered = 3;
            }
            else if (stamina.value + 2 <= damageTaken) {
               woundsSuffered = 2;
            }
            else {
               woundsSuffered = 1;
            }
         }

         // Update the actor
         stamina.value = Math.max(stamina.value - damageTaken, 0);
         wounds.value = Math.min(wounds.value + woundsSuffered, wounds.max);
         if (options?.updateActor !== false) {
            await this.parent.update({
               system: {
                  resource: {
                     stamina: {
                        value: stamina.value
                     },
                     wounds: {
                        value: wounds.value
                     }
                  }
               }
            });
         }


         // Report
         if (options?.report !== true && getSetting('reportTakingDamage')) {
            // Create the chat context
            const chatContext = {
               type: 'damageReport',
               img: this.parent.img,
               name: this.parent.name,
               damageTaken: damageTaken,
               stamina: {
                  value: stamina.value,
                  max: stamina.max
               },
            };

            if (wounds.max > 0) {
               chatContext.wounds = {
                  value: wounds.value,
                  max: wounds.max
               };
            }


            // Damage resisted
            if (damageResistance > 0) {
               chatContext.damageResisted = damage - damageTaken;
            }

            if (options) {
               // Ignore Armor
               if (options.ignoreArmor) {
                  chatContext.ignoreArmor = true;
               }

               else {

                  // Penetrating
                  if (options.penetrating) {
                     chatContext.penetrating = true;
                  }

                  // Ineffective
                  if (options.ineffective) {
                     chatContext.ineffective = true;
                  }
               }
            }

            // Wounds soffered
            if (woundsSuffered > 0) {
               chatContext.woundsSuffered = woundsSuffered;
            }

            // Send the report to chat
            this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
         }
      }
   }

   async applyHealing(healing = 1, options) {
      if (healing > 0 && this.parent.isOwner) {
         // Check if the actor's stamina is less than max
         let damageHealed = 0;
         const stamina = this.parent.system.resource.stamina;
         if (stamina.value < stamina.max) {
            // Update the stamina
            damageHealed = Math.min(healing, stamina.max - stamina.value);
            stamina.value += damageHealed;

            // Update the actor
            if (options?.updateActor !== false) {
               await this.parent.update({
                  system: {
                     resource: {
                        stamina: {
                           value: stamina.value
                        }
                     }
                  }
               });
            }

            // Report
            if (options?.report !== false && getSetting('reportHealingDamage')) {
               // Create chat context
               const wounds = this.parent.system.resource.wounds;
               const chatContext = {
                  type: 'healingReport',
                  img: this.parent.img,
                  name: this.parent.name,
                  damageHealed: damageHealed,
                  stamina: {
                     value: stamina.value,
                     max: stamina.max
                  },
               };

               if (wounds.max > 0) {
                  chatContext.wounds = {
                     value: wounds.value,
                     max: wounds.max
                  };
               }

               // Send the report to chat
               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
            }

         }

         return damageHealed;
      }

      return;
   }

   async applyRend(rend, options) {
      if (rend > 0 && this.parent.isOwner) {
         // Get the armor
         const armor = this.getArmor();
         if (armor) {

            // Check if the armor is magical
            let magicalArmor = false;
            for (let idx = 0; idx < armor.system.trait.length; idx++) {
               if (armor.system.trait[idx].name === 'magical') {
                  magicalArmor = true;
                  break;
               }
            }

            // Apply the rend if the rend is magical or the armor is non magical
            let rendResisted = true;
            const armorValue = armor.system.armor.value;
            if (!magicalArmor || options?.magical) {
               rendResisted = false;
               armor.system.armor.value = Math.max(armor.system.armor.value - rend, 0);
               await armor.update({
                  system: {
                     armor: {
                        value: armor.system.armor.value
                     }
                  }
               });
            }

            // Report
            if (options?.report !== false && getSetting('reportRendingArmor')) {
               // Create chat context
               const chatContext = {
                  type: 'rendReport',
                  actorImg: this.parent.img,
                  actorName: this.parent.name,
                  itemImg: armor.img,
                  itemName: armor.name,
                  armor: {
                     value: armor.system.armor.value,
                     max: armor.system.armor.max
                  },
                  rend: rend
               };

               if (rendResisted) {
                  chatContext.rendResisted = true;
               }
               else {
                  chatContext.armorLost = armorValue - armor.system.armor.value;
               }

               // Send the report to chat
               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
            }
         }
      }
   }

   async applyRepairs(repairs, options) {
      if (repairs > 0 && this.parent.isOwner) {
         // Get the armor
         const armor = this.getArmor();
         if (armor && armor.system.armor.value < armor.system.armor.max) {

            // Apply the repairs if the rend is magical or the armor is non magical
            const armorValue = armor.system.armor.value;
            armor.system.armor.value = Math.min(armor.system.armor.value + repairs, armor.system.armor.max);
            await armor.update({
               system: {
                  armor: {
                     value: armor.system.armor.value
                  }
               }
            });

            // Report
            if (options?.report !== false && getSetting('reportRepairingArmor')) {
               // Create chat context
               const chatContext = {
                  type: 'repairReport',
                  actorImg: this.parent.img,
                  actorName: this.parent.name,
                  itemImg: armor.img,
                  itemName: armor.name,
                  armor: {
                     value: armor.system.armor.value,
                     max: armor.system.armor.max
                  },
                  armorRepaired: armor.system.armor.value - armorValue
               };

               // Send the report to chat
               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
            }
         }
      }
   }

   async regainResolve(resolveRegained = 1, updateActor = true) {
      if (resolveRegained > 0 && this.parent.isOwner) {
         // Update resolve
         const resolve = this.parent.system.resource.resolve;
         resolve.value = Math.min(resolve.max, resolve.value + resolveRegained);

         // Update the actor if appropriate
         if (updateActor) {
            await this.parent.update({
               system: {
                  resource: {
                     resolve: resolve
                  }
               }
            });
         }
      }

      return;
   }

   async spendResolve(resolveSpent = 1, options) {
      if (resolveSpent > 0 && this.parent.isOwner) {
         // Check if the actor's resolve is less than max
         const resolve = this.parent.system.resource.resolve;
         const initialResolve = resolve.value;
         // Update the actor
         if (resolve.value >= resolveSpent) {
            resolve.value -= resolveSpent;
            await this.parent.update({
               system: {
                  resource: {
                     resolve: {
                        value: resolve.value
                     }
                  }
               }
            });
         }

         // Report
         if (options?.report !== false) {
            const shouldReportSettings = getSetting('reportSpendingResolve');
            if (shouldReportSettings) {
               // Create chat context
               const chatContext = {
                  type: 'spendResolveReport',
                  img: this.parent.img,
                  name: this.parent.name,
                  resolveSpent: resolveSpent,
                  resolve: {
                     value: resolve.value,
                     max: resolve.max
                  }
               };
               if (initialResolve < resolveSpent) {
                  chatContext.resolveShortage = resolveSpent - initialResolve;
               }

               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, options?.playSound ?? true);
            }
         }
      }

      return;
   }

   async removeExpiredEffects(confirmed) {
      if (this.parent.isOwner) {
         // Get the expired effects
         const expiredEffects = this.effect?.expired;
         if (expiredEffects && expiredEffects.length > 0) {

            // Check if the removeal was confirmed
            if (confirmed || !confirmDeletingItems()) {
               for (const effect of expiredEffects) {
                  await this._internalDeleteItem(effect);
               }

               return;
            }

            // Otherwise, confirm removal
            else {
               const dialog = new ConfirmRemoveExpiredEffectsDialog(this);
               dialog.render(true);
            }
         }
      }

      return;
   }

   async removeCombatEffects(shouldReport) {
      const actor = this.parent;
      if (actor.isOwner) {
         const systemData = actor.system;
         // Reset static mods
         // Attribute
         for (const value of Object.values(systemData.attribute)) {
            value.mod.static = 0;
         }

         // Skills
         for (const value of Object.values(systemData.skill)) {
            value.training.mod.static = 0;
            value.expertise.mod.static = 0;
         }

         // Ratings
         for (const value of Object.values(systemData.rating)) {
            value.mod.static = 0;
         }

         // Speed
         for (const value of Object.values(systemData.speed)) {
            value.mod.static = 0;
         }

         // Mod
         for (const value of Object.values(systemData.mod)) {
            value.mod.static = 0;
         }

         // Restore resolve
         actor.system.resource.resolve.value = actor.system.resource.resolve.max;

         // Update the actor
         await actor.update({
            system: actor.system
         });

         // Delete all combat effects
         const combatEffects = actor.items.filter((item) => {
            return item.type === 'effect' && item.system.duration.type !== 'permanent';
         });
         for (const effect of combatEffects) {
            await this._internalDeleteItem(effect);
         }

         // Report
         if (shouldReport) {
            const shouldReportSettings = getSetting('reportResting');
            if (shouldReportSettings) {
               // Create chat context
               const chatContext = {
                  type: 'removeCombatEffectsReport',
                  img: actor.img,
                  name: actor.name
               };

               // Send the report to chat
               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
            }
         }
      }

      return;
   }

   async shortRest(shouldReport) {
      const actor = this.parent;
      if (actor.isOwner) {
         // Restore stamina
         actor.system.resource.stamina.value = actor.system.resource.stamina.max;

         // Remove combat efects updates the actor
         await this.removeCombatEffects(false);

         // Report
         if (shouldReport) {
            const shouldReportSettings = getSetting('reportResting');
            if (shouldReportSettings) {
               // Create chat context
               const chatContext = {
                  type: 'shortRestReport',
                  img: actor.img,
                  name: actor.name,
               };

               // Send the report to chat
               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
            }
         }
      }

      return;
   }

   async longRest(shouldReport) {
      const actor = this.parent;
      if (actor.isOwner) {
         // Decrease wounds
         let woundsHealed = 0;
         const wounds = actor.system.resource.wounds;
         if (wounds.value > 0) {
            woundsHealed = Math.min(getSetting('woundsBaseRegain') + actor.system.mod.woundRegain.value, wounds.value);
            wounds.value -= woundsHealed;
         }

         // Short rest updates the actor
         await this.shortRest(false);

         // Report
         if (shouldReport) {
            const shouldReportSettings = getSetting('reportResting');
            if (shouldReportSettings) {
               // Create chat context
               const chatContext = {
                  type: 'longRestReport',
                  name: actor.name,
                  img: actor.img,
               };

               // Add line about wounds healed
               if (woundsHealed > 0) {
                  chatContext.woundsHealed = woundsHealed;
                  chatContext.wounds = {
                     value: wounds.value,
                     max: wounds.max
                  };
               }

               // Send the report to chat
               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
            }
         }
      }

      return;
   }

   async onInitiativeAdvanced(currentInitiative, previousInitiative, isNewRound) {
      if (getSetting('autoDecreaseEffectDuration') && this.effect?.initiative) {
         // Get effects to advance
         let effectsToAdvance = null;
         if (isNewRound) {
            effectsToAdvance = this.effect.initiative.filter((effect) => {
               const initiative = effect.system.duration.initiative;
               return (initiative >= currentInitiative || initiative < previousInitiative);
            });
         }
         else {
            effectsToAdvance = this.effect.initiative.filter((effect) => {
               const initiative = effect.system.duration.initiative;
               return (initiative >= currentInitiative && initiative < previousInitiative);
            });
         }

         // If there are any effects to advance
         if (effectsToAdvance.length > 0) {
            const expiredEffects = [];

            // Advance each effect
            for (const effect of effectsToAdvance) {
               if (effect.system.duration.remaining > 0) {
                  effect.system.duration.remaining -= 1;
                  await effect.update({
                     system: {
                        duration: {
                           remaining: effect.system.duration.remaining
                        }
                     }
                  });

                  if (effect.system.duration.remaining <= 0) {
                     expiredEffects.push(effect);
                  }
               }
            }

            // If there are any expired effects
            if (expiredEffects.length > 0) {
               const chatContext = {};

               // Report effects if appropriate
               const reportEffects = getSetting('reportEffects');
               if (reportEffects) {
                  chatContext.expiredEffects = this.effect.expired.map(this.getEffectReportData);
               }

               // Remove expired effects if appropriate
               const autoRemoveEffects = getSetting('autoRemoveExpiredEffects');
               switch (getSetting('autoRemoveExpiredEffects')) {
                  case 'showButton': {
                     // Display button for removing the effects
                     chatContext.expiredEffectsRemoved = false;
                     break;
                  }
                  case 'enabled': {
                     // Delete each expired effect
                     for (const effect of expiredEffects) {
                        await effect.delete();
                     }

                     // Update chat context if appropriate
                     if (reportEffects) {
                        chatContext.expiredEffectsRemoved = true;
                     }
                     break;
                  }
                  default: {
                     break;
                  }
               }

               // Report if appropriate
               if (reportEffects || autoRemoveEffects === 'showButton') {
                  // Prepare chat context
                  chatContext.type = 'effectsExpiredReport';
                  chatContext.name = this.parent.name;
                  chatContext.img = this.parent.img;

                  // Send the report to chat
                  this._whisperUsers(chatContext, getOwners(this.parent), this.getTurnReportUserID(), true);
               }
            }
         }
      }

      return;
   }

   async onTurnStart() {
      const actor = this.parent;
      // Operations that should only be performed once
      if (isFirstOwner(this.parent)) {
         // Initialize variables
         const chatContext = {};
         let shouldUpdateActor = false;

         // Calculate healing or damage
         if (await this._calculateTurnHealingAndDamage(chatContext, 'turnStart') === true) {
            shouldUpdateActor = true;
         }

         // Calculate turn start effects
         await this._calculateTurnStartEffects(chatContext);

         // Regain resolve
         if (this._calculateResolveRegain(chatContext)) {
            shouldUpdateActor = true;
         }

         // Update actor if appropriate
         if (shouldUpdateActor) {
            actor.update({
               system: actor.system
            });
         }

         // Get turn messages]
         const message = this.turnMessage?.turnStart;
         if (message) {
            chatContext.message = message;
         }

         // Send the end of turn report if appropriate
         if (Object.keys(chatContext).length > 0) {

            // Prepare chat context
            chatContext.type = 'turnStartReport';
            chatContext.img = actor.img;
            chatContext.name = actor.name;

            this._whisperUsers(chatContext, getOwners(this.parent), this.getTurnReportUserID(), true);
         }
      }


      // Open sheet
      if (game.user.isGM) {
         switch (getSetting('autoOpenCharacterSheetsGM')) {
            case 'npcsOnly': {
               if (!actor.hasPlayerOwner) {
                  actor.sheet.render(true);
               }
               break;
            }
            case 'pcsOnly': {
               if (actor.hasPlayerOwner) {
                  actor.sheet.render(true);
               }
               break;
            }
            case 'all': {
               actor.sheet.render(true);
               break;
            }
            default: {
               break;
            }
         }
      }
      else if (actor.isOwner && getSetting('autoOpenCharacterSheetsPlayer')) {
         actor.sheet.render(true);
      }

      return;
   }

   async onTurnEnd() {
      const actor = this.parent;
      // Operations that should only be performed once
      if (isFirstOwner(actor)) {
         // Initialize variables
         const chatContext = {};

         await this._calculateTurnEndEffects(chatContext);
         if (await this._calculateTurnHealingAndDamage(chatContext, 'turnEnd') === true) {
            actor.update({
               system: actor.system
            });
         }

         // Get turn messages]
         const message = this.turnMessage?.turnEnd;
         if (message) {
            chatContext.message = message;
         }

         // End of turn report
         if (Object.keys(chatContext).length > 0) {

            // Prepare chat context
            chatContext.type = 'turnEndReport';
            chatContext.name = actor.name;
            chatContext.img = actor.img;

            // Send the report to chat
            this._whisperUsers(chatContext, getOwners(this.parent), this.getTurnReportUserID(), true);
         }
      }

      return;
   }

   async _calculateTurnStartEffects(chatContext) {
      // Decrease effect duration if appropriate
      if (getSetting('autoDecreaseEffectDuration') && this.effect?.turnStart) {
         for (const effect of this.effect.turnStart) {
            if (effect.system.duration.remaining > 0) {
               effect.system.duration.remaining -= 1;
               await effect.update({
                  system: {
                     duration: {
                        remaining: effect.system.duration.remaining
                     }
                  }
               });
            }
         }
      }

      // Report effects if appropriate
      if (getSetting('reportEffects')) {
         // Add efects to chat context
         if (this.effect) {

            // Permanent effects
            if (this.effect.permanent) {
               chatContext.permanentEffects = this.effect.permanent.map(this.getEffectReportData);
            }

            // Turn start effects
            if (this.effect.turnStart) {
               chatContext.turnStartEffects = this.effect.turnStart.map(this.getEffectReportData);
            }

            // Turn end effects
            if (this.effect.turnEnd) {
               chatContext.turnEndEffects = this.effect.turnEnd.map(this.getEffectReportData);
            }

            // Initiative order effects
            if (this.effect.initiative) {
               chatContext.initiativeEffects = this.effect.initiative.map(this.getEffectReportData);
            }

            // Custom order effects
            if (this.effect.custom) {
               chatContext.customEffects = this.effect.custom.map(this.getEffectReportData);
            }

            // Expired effects
            if (this.effect.expired) {
               chatContext.expiredEffects = this.effect.expired.map(this.getEffectReportData);
            }
         }

         // Add conditons to chat context
         if (this.conditions) {
            chatContext.conditions = [];
            this.conditions.forEach((condition) => {
               const retVal = { label: condition.label, img: condition.icon };
               const description = effect.flags?.titan?.description;
               if (description) {
                  retVal.description = description;
               }
               chatContext.conditions.push(retVal);
            });
         }
      }

      // Remove expired effects if appropriate
      const expiredEffects = this.effect.expired;
      if (expiredEffects) {
         switch (getSetting('autoRemoveExpiredEffects')) {
            case 'showButton': {
               chatContext.expiredEffectsRemoved = false;
               break;
            }
            case 'enabled': {
               chatContext.expiredEffectsRemoved = true;

               // Delete each expired effect
               for (const effect of expiredEffects) {
                  await effect.delete();
               }
               break;
            }
            default: {
               break;
            }
         }
      }
   }

   async _calculateTurnEndEffects(chatContext) {
      // Decrease effect duration if appropriate
      if (getSetting('autoDecreaseEffectDuration') && this.effect?.turnEnd) {
         // Advance each turn end effect
         const expiredEffects = [];
         for (const effect of this.effect.turnEnd) {
            if (effect.system.duration.remaining > 0) {
               effect.system.duration.remaining -= 1;
               await effect.update({
                  system: {
                     duration: {
                        remaining: effect.system.duration.remaining
                     }
                  }
               });

               // Add to expired effects if it expired
               if (effect.system.duration.remaining <= 0) {
                  expiredEffects.push(effect);
               }
            }
         }

         // If there are any expired effects
         if (expiredEffects.length > 0) {

            // Report effects if appropriate
            const reportEffects = getSetting('reportEffects');
            if (reportEffects) {
               chatContext.expiredEffects = this.effect.expired.map(this.getEffectReportData);
            }

            // Remove expired effects if appropriate
            switch (getSetting('autoRemoveExpiredEffects')) {
               case 'showButton': {
                  // Display button for removing the effects
                  chatContext.expiredEffectsRemoved = false;
                  break;
               }
               case 'enabled': {
                  // Delete each expired effect
                  for (const effect of expiredEffects) {
                     await effect.delete();
                  }

                  // Update chat context if appropriate
                  if (reportEffects) {
                     chatContext.expiredEffectsRemoved = true;
                  }
                  break;
               }
               default: {
                  break;
               }
            }
         }
      }

      return;
   }

   async _calculateTurnHealingAndDamage(chatContext, selector) {
      let shouldUpdateActor = false;

      // Fast healing report
      if (getSetting('reportHealingDamage')) {
         const fastHealing = this.fastHealing;
         if (fastHealing && fastHealing[selector]) {
            chatContext.fastHealing = foundry.utils.deepClone(fastHealing[selector]);
         }
      }

      // Persistent damage report
      if (getSetting('reportTakingDamage')) {
         const persistentDamage = this.persistentDamage;
         if (persistentDamage && persistentDamage[selector]) {
            chatContext.persistentDamage = foundry.utils.deepClone(persistentDamage[selector]);
         }
      }

      // Auto apply dealing and damage
      const autoApplyFastHealing = getSetting('autoApplyFastHealing');
      const autoApplyPersistentDamage = getSetting('autoApplyPersistentDamage');
      let turnStaminaMod = 0;

      // Get the amount of fast healing to be apply
      if (autoApplyFastHealing !== 'disabled') {
         const fastHealing = this.fastHealing;
         if (fastHealing) {
            const selectorFastHealing = fastHealing[selector];
            if (selectorFastHealing) {
               turnStaminaMod += getSumOfValuesInObject(selectorFastHealing);
               chatContext.fastHealing = foundry.utils.deepClone(selectorFastHealing);
            }
         }
      }

      // Get the amount of persistent damage to apply
      if (autoApplyPersistentDamage !== 'disabled') {
         const persistentDamage = this.persistentDamage;
         if (persistentDamage) {
            const selectorPersistentDamage = persistentDamage[selector];
            if (selectorPersistentDamage) {
               turnStaminaMod -= getSumOfValuesInObject(selectorPersistentDamage);
               chatContext.persistentDamage = foundry.utils.deepClone(selectorPersistentDamage);
            }
         }
      }

      // If stamina would be changed
      if (turnStaminaMod !== 0) {
         const stamina = this.parent.system.resource.stamina;

         // If stamina would be healed
         if (turnStaminaMod > 0) {

            // Update the actor if appropriate
            const confirmed = autoApplyFastHealing === 'enabled';
            if (confirmed) {
               await this.applyHealing(turnStaminaMod, { updateActor: false, report: false });
               shouldUpdateActor = true;
            }

            // Update the chat context
            chatContext.healingApplied = {
               total: turnStaminaMod,
               confirmed: confirmed
            };
         }

         // If stamina would be damaged
         else {
            const wounds = this.parent.system.resource.wounds;
            if (wounds.max > 0) {
               chatContext.wounds = {
                  max: wounds.max,
                  value: wounds.value
               };
            }

            // Update the actor if appropriate
            const confirmed = autoApplyPersistentDamage === 'enabled';
            if (confirmed) {
               await this.applyDamage(-turnStaminaMod, { updateActor: false, ignoreArmor: true, report: false });
               shouldUpdateActor = true;
            }

            // Update the chat context
            chatContext.damageApplied = {
               total: -turnStaminaMod,
               confirmed: confirmed
            };
         }

         // Update the chat contaxt
         chatContext.stamina = {
            max: stamina.max,
            value: stamina.value
         };
      }

      return shouldUpdateActor;
   }

   async _calculateResolveRegain(chatContext) {
      let shouldUpdateActor = false;

      // Calculate resolve regain
      const autoRegainResolve = getSetting('autoRegainResolve');
      if (autoRegainResolve !== 'disabled') {

         // If the resolve value is below max
         const resolve = this.parent.system.resource.resolve;
         if (resolve.value < resolve.max) {

            // If any resolve would be regained
            const maxResolveRegained = getSetting('resolveBaseRegain') + this.parent.system.mod.resolveRegain.value;
            if (maxResolveRegained > 0) {

               // Update the actor if appropriate
               const confirmed = autoRegainResolve === 'enabled';
               if (confirmed) {
                  this.regainResolve(maxResolveRegained, false);
                  shouldUpdateActor = true;
               }

               // Update the chat context
               chatContext.resolve = {
                  value: resolve.value,
                  max: resolve.max
               };
               chatContext.resolveRegain = {
                  total: maxResolveRegained,
                  confirmed: confirmed,
               };
            }
         }
      }

      return shouldUpdateActor;
   }

   async _whisperUsers(chatContext, users, userId, playSound = true) {
      const whisperMessage = {
         user: userId,
         speaker: ChatMessage.getSpeaker({ actor: this.parent }),
         type: CONST.CHAT_MESSAGE_TYPES.OTHER,
         whisper: users,
         flags: {
            titan: chatContext
         }
      };

      if (playSound) {
         whisperMessage.sound = CONFIG.sounds.notification;
      }
      return await ChatMessage.create(whisperMessage);
   }

   async toggleMultiAttack(itemId) {
      if (this.parent.isOwner) {
         const item = this.parent.items.get(itemId);

         // If the item is valid
         if (item && item.type === 'weapon') {
            await item.update({
               system: {
                  multiAttack: !item.system.multiAttack
               }
            });
         }
      }

      return;
   }

   // Toggle equipped
   async toggleEquipped(itemId) {
      if (this.parent.isOwner) {
         const item = this.parent.items.get(itemId);

         // If the item is valid
         if (item) {
            // If the item is armor
            if (item.type === 'armor') {
               // If the armor is equipped, un-equip it
               if (this.parent.system.equipped.armor === itemId) {
                  this.unEquipArmor();
               }

               // Else, equip it
               else {
                  this.equipArmor(itemId);
               }
            }

            // If the item is a shield
            else if (item.type === 'shield') {
               // If the armor is equipped, un-equip it
               if (this.parent.system.equipped.shield === itemId) {
                  this.unEquipShield();
               }

               // Else, equip it
               else {
                  this.equipShield(itemId);
               }
            }

            // Otherwise, update the equipped value on the item
            else if (item.system.equipped !== undefined) {
               const updateData = {
                  system: {
                     equipped: !item.system.equipped,
                  },
               };

               await item.update(updateData);
            }
         }
      }

      return;
   }

   async toggleEffectActive(itemId) {
      if (this.parent.isOwner) {
         const item = this.parent.items.get(itemId);
         if (item && item.system.active !== undefined) {
            const newActive = !item.system.active;
            item.system.active = newActive;
            return await item.update({
               system: {
                  active: newActive
               }
            });
         }
      }
   }

   async decrementEffectDuration(itemId) {
      if (this.parent.isOwner) {
         const item = this.parent.items.get(itemId);
         if (item && item.system.duration?.remaining) {
            item.system.duration.remaining -= 1;
            return await item.update({
               system: {
                  duration: {
                     remaining: item.system.duration.remaining
                  }
               }
            });
         }
      }
   }

   async incrementEffectDuration(itemId) {
      if (this.parent.isOwner) {
         const item = this.parent.items.get(itemId);
         if (item && item.system.duration?.remaining !== undefined) {
            item.system.duration.remaining += 1;
            return await item.update({
               system: {
                  duration: {
                     remaining: item.system.duration.remaining
                  }
               }
            });
         }
      }
   }

   getArmor() {
      const armor = this.parent.system.equipped.armor;
      if (armor !== null && armor !== '') {
         return this.parent.items.get(armor);
      }
      return false;
   }

   async equipArmor(armorId) {
      if (this.parent.isOwner) {
         // Ensure the armor is valid
         const armor = this.parent.items.get(armorId);
         if (!armor && armor.type === 'armor') {
            console.error('TITAN | Error equipping Armor. Invalid Armor ID.');
            console.trace();
         }

         // Update the armor
         this.parent.system.equipped.armor = armorId;
         await this.parent.update({
            system: {
               equipped: {
                  armor: armorId
               },
            },
         });
      }

      return;
   }

   async unEquipArmor() {
      if (this.parent.isOwner) {
         // Remove the armor
         this.parent.system.equipped.armor = null;
         await this.parent.update({
            system: {
               equipped: {
                  armor: null
               },
            },
         });
      }

      return;
   }

   getShield() {
      const shield = this.parent.system.equipped.shield;
      if (shield !== null && shield !== '') {
         return this.parent.items.get(shield);
      }
      return false;
   }

   async equipShield(shieldId) {
      if (this.parent.isOwner) {
         // Ensure the shield is valid
         const shield = this.parent.items.get(shieldId);
         if (!shield && shield.type === 'shield') {
            console.error('TITAN | Error equipping Shield. Invalid Shield ID.');
            console.trace();

            return;
         }

         // Update the shield
         this.parent.system.equipped.shield = shieldId;
         this.parent.update({
            system: {
               equipped: {
                  shield: shieldId
               },
            },
         });
      }

      return;
   }

   async unEquipShield() {
      if (this.parent.isOwner) {
         // Remove the shield
         this.parent.system.equipped.shield = null;
         await this.parent.update({
            system: {
               equipped: {
                  shield: null
               },
            },
         });
      }

      return;
   }

   async deleteItem(itemId, confirmed) {
      const actor = this.parent;
      if (actor.isOwner) {

         // Confirm the item is valid
         const item = actor.items.get(itemId);
         if (item) {

            // Check if the deletion is confirmed
            if (confirmed || !confirmDeletingItems()) {
               // Perform type specific deleting
               switch (item.type) {
                  case 'armor': {
                     const armorId = actor.system.equipped.armor;
                     if (armorId === itemId) {
                        await this.unEquipArmor();
                     }
                     break;
                  }
                  case 'shield': {
                     const shieldId = actor.system.equipped.armor;
                     if (shieldId === itemId) {
                        await this.unEquipShield();
                     }

                     break;
                  }
                  default: {
                     break;
                  }
               }

               return this._internalDeleteItem(item);
            }

            // Otherwise, confirm deleting the item
            const dialog = new ConfirmDeleteItemDialog(actor, item);
            dialog.render(true);

            return;
         }
      }

      return;
   }

   async _internalDeleteItem(item) {
      // Delete the item
      await item.delete();

      // Delete the item from the sheet if appropriate
      const sheet = this.parent._sheet;
      if (sheet) {
         sheet.deleteItem(item._id);
      }

      return;
   }

   async toggleInspiration() {
      if (this.parent.isOwner) {
         this.parent.system.inspiration = !this.parent.system.inspiration;
         await this.parent.update({
            system: {
               inspiration: this.parent.system.inspiration
            }
         });
      }

      return;
   }

   getTurnReportUserID() {
      const playerOwner = getBestPlayerOwner(this.parent);
      return playerOwner ? playerOwner.id : game.user.id;
   }

   getEffectReportData(effect) {
      // Initial retval
      const retVal = {
         label: effect.name,
         img: effect.img,
         itemId: effect._id,
      };

      // Add the description if it is not blank
      if (!isHTMLBlank(effect.system.description)) {
         retVal.description = effect.system.description;
      }

      switch (effect.system.duration.type) {
         case 'custom': {
            retVal.custom = effect.system.duration.custom;
            retVal.remaining = effect.system.duration.remaining;
            break;
         }
         case 'initiative': {
            retVal.remaining = effect.system.duration.remaining;
            retVal.initiative = effect.system.duration.initiative;
            break;
         }
         case 'turnEnd':
         case 'turnStart': {
            retVal.remaining = effect.system.duration.remaining;
            break;
         }
         default: {
            break;
         }
      }

      return retVal;
   }
}
