import ActionQueue from '~/helpers/ActionQueue.js';
import ActorDataModel from '~/document/types/actor/ActorDataModel.js';
import AttackCheck from '~/check/types/attack-check/AttackCheck.js';
import AttackCheckDialog from '~/check/types/attack-check/dialog/AttackCheckDialog.js';
import AttributeCheck from '~/check/types/attribute-check/AttributeCheck.js';
import AttributeCheckDialog from '~/check/types/attribute-check/dialog/AttributeCheckDialog.js';
import CastingCheck from '~/check/types/casting-check/CastingCheck.js';
import CastingCheckDialog from '~/check/types/casting-check/dialog/CastingCheckDialog.js';
import ConfirmDeleteItemDialog from '~/document/types/actor/dialogs/ConfirmDeleteItemDialog.js';
import ConfirmRemoveExpiredEffectsDialog
   from '~/document/types/actor/types/character/dialogs/ConfirmRemoveExpiredEffectsDialog.js';
import ItemCheck from '~/check/types/item-check/ItemCheck.js';
import ItemCheckDialog from '~/check/types/item-check/dialog/ItemCheckDialog.js';
import ResistanceCheck from '~/check/types/resistance-check/ResistanceCheck.js';
import ResistanceCheckDialog from '~/check/types/resistance-check/dialog/ResistanceCheckDialog.js';
import appendUnique from '~/helpers/utility-functions/AppendUnique.js';
import appendUniqueByFunctionValue from '~/helpers/utility-functions/appendUniqueByFunctionValue.js';
import camelize from '~/helpers/utility-functions/Camelize.js';
import capitalize from '~/helpers/utility-functions/Capitalize.js';
import clamp from '~/helpers/utility-functions/Clamp.js';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttackCheckParameters from '~/check/types/attack-check/AttackCheckParameters.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createAttributeCheckParameters from '~/check/types/attribute-check/AttributeCheckParameters.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createCastingCheckParameters from '~/check/types/casting-check/CastingCheckParameters.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import createItemCheckParameters from '~/check/types/item-check/ItemCheckParameters.js';
import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';
import createResistanceCheckParameters from '~/check/types/resistance-check/ResistanceCheckParameters.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import getBestPlayerOwner from '~/helpers/utility-functions/GetBestPlayerOwner.js';
import getOwners from '~/helpers/utility-functions/GetOwners.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import getSumOfObjectValues from '~/helpers/utility-functions/GetSumOfObjectValues.js';
import getTargetedCharacters from '~/helpers/utility-functions/GetTargetedCharacters.js';
import isCurrentUserBestOwner from '~/helpers/utility-functions/IsCurrentUserBestOwner.js';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import localize from '~/helpers/utility-functions/Localize.js';
import pushUnique from '~/helpers/utility-functions/PushUnique.js';
import shouldConfirmDeletingItems from '~/helpers/utility-functions/ShouldConfirmDeletingItems.js';
import shouldGetCheckOptions from '~/helpers/utility-functions/ShouldGetCheckOptions.js';
import sort from '~/helpers/utility-functions/Sort.js';
import sortObjectsIntoContainerByFunctionValue
   from '~/helpers/utility-functions/SortObjectsIntoContainerByFunctionValue.js';
import sortObjectsIntoContainerByKeyValue from '~/helpers/utility-functions/SortObjectsIntoContainerByKeyValue.js';

/**
 * Actor data model with extra functionality for Characters.
 * @augments ActorDataModel
 */
export default class CharacterDataModel extends ActorDataModel {

   /* === Construction === */

   /**
    * Gets the cached rulesElements on the parent actor,
    * sorted by their type.
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

   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Gets a schema field formatted as a mod for a Character state (skills, attributes, resistances, etc.).
      /**
       *
       */
      function getStatModSchema() {
         return createSchemaField({
            static: createIntegerField(0),
         });
      }

      // Gets a schema field formatted as a Character attribute (body, mind, or soul).
      /**
       * @param initial
       */
      function getBaseStatSchema(initial) {
         return createSchemaField({
            baseValue: createIntegerField(initial),
            mod: getStatModSchema(),
         });
      }

      // Gets a schema field formatted as a Character resistance (reflexes, resilience, or willpower).
      /**
       *
       */
      function getDerivedStatSchema() {
         return createSchemaField({
            mod: getStatModSchema(),
         });
      }

      // Gets a schema field formatted as a Character skill (athletics, perception, etc.).
      /**
       * @param defaultAttribute
       */
      function getSkillSchema(defaultAttribute) {
         return createSchemaField({
            defaultAttribute: createStringField(defaultAttribute),
            training: getBaseStatSchema(),
            expertise: getBaseStatSchema(),
         });
      }

      // Gets a schema field formatted as a Character resource (stamina, resolve, or wounds).
      /**
       * @param initial
       */
      function getResourceSchema(initial) {
         return createSchemaField({
            value: createIntegerField(initial),
            mod: getStatModSchema(),
         });
      }

      // Add attributes
      schema.attribute = createSchemaField({
         body: getBaseStatSchema(1),
         mind: getBaseStatSchema(1),
         soul: getBaseStatSchema(1),
      });

      // Add resistances
      schema.resistance = createSchemaField({
         reflexes: getDerivedStatSchema(1),
         resilience: getDerivedStatSchema(1),
         willpower: getDerivedStatSchema(1),
      });

      // Add skills
      schema.skill = createSchemaField({
         arcana: getSkillSchema(getSetting('defaultAttribute.arcana')),
         athletics: getSkillSchema(getSetting('defaultAttribute.athletics')),
         deception: getSkillSchema(getSetting('defaultAttribute.deception')),
         dexterity: getSkillSchema(getSetting('defaultAttribute.dexterity')),
         diplomacy: getSkillSchema(getSetting('defaultAttribute.diplomacy')),
         engineering: getSkillSchema(getSetting('defaultAttribute.engineering')),
         intimidation: getSkillSchema(getSetting('defaultAttribute.intimidation')),
         investigation: getSkillSchema(getSetting('defaultAttribute.investigation')),
         lore: getSkillSchema(getSetting('defaultAttribute.lore')),
         medicine: getSkillSchema(getSetting('defaultAttribute.medicine')),
         meleeWeapons: getSkillSchema(getSetting('defaultAttribute.meleeWeapons')),
         metaphysics: getSkillSchema(getSetting('defaultAttribute.metaphysics')),
         nature: getSkillSchema(getSetting('defaultAttribute.nature')),
         perception: getSkillSchema(getSetting('defaultAttribute.perception')),
         performance: getSkillSchema(getSetting('defaultAttribute.performance')),
         rangedWeapons: getSkillSchema(getSetting('defaultAttribute.rangedWeapons')),
         subterfuge: getSkillSchema(getSetting('defaultAttribute.subterfuge')),
         stealth: getSkillSchema(getSetting('defaultAttribute.stealth')),
      });

      // Add ratings
      schema.rating = createSchemaField({
         awareness: getDerivedStatSchema(),
         defense: getDerivedStatSchema(),
         melee: getDerivedStatSchema(),
         accuracy: getDerivedStatSchema(),
         initiative: getDerivedStatSchema(),
      });

      // Add resources
      schema.resource = createSchemaField({
         stamina: getResourceSchema(Math.ceil(3 * getSetting('staminaBaseMultiplier'))),
         resolve: getResourceSchema(Math.ceil(1 * getSetting('resolveBaseMultiplier'))),
         wounds: getResourceSchema(0),
      });

      // Add speeds
      schema.speed = createSchemaField({
         stride: getBaseStatSchema(),
         fly: getBaseStatSchema(),
         climb: getBaseStatSchema(),
         swim: getBaseStatSchema(),
         burrow: getBaseStatSchema(),
      });

      // Add mods
      schema.mod = createSchemaField({
         armor: getDerivedStatSchema(),
         damage: getDerivedStatSchema(),
         healing: getDerivedStatSchema(),
         resolveRegain: getDerivedStatSchema(),
         woundRegain: getDerivedStatSchema(),
      });

      // Add equipment
      schema.equipped = createSchemaField({
         armor: createStringField(null),
         shield: createStringField(null),
      });

      // Add bio
      schema.bio = createSchemaField({
         description: createStringField(),
      });

      return schema;
   }

   _getInitialPrototypeTokenData(data) {
      return {
         displayName: data.prototypeToken?.displayName ?? CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
         displayBars: data.prototypeToken?.displayBars ?? CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
         bar1: data.prototypeToken?.bar1 ?? {attribute: 'resource.stamina'},
         bar2: data.prototypeToken?.bar2 ?? {attribute: 'resource.resolve'},
      };
   }

   /**
    * Gets all the standard conditions affecting this Character.
    * @returns {ActiveEffect[]|boolean} Array of standard conditions affecting this actor, or false if there are none.
    */
   getConditions() {
      const conditions = this.parent.effects.filter((effect) => effect.flags.titan?.type === 'condition');
      return conditions.length > 0 ? conditions : null;
   }

   /**
    * Gets all the Effect items affecting this Character that have Expired.
    * @returns {TitanItem[]|boolean} Array of Expired Effect items affecting this character,
    * or false if there are none.
    */
   getExpiredEffectItems() {
      const effects = this.parent.items.filter((item) => item.type === 'effect' && item.system.isExpired);
      return effects.length > 0 ? effects : false;
   }

   /**
    * Gets all the Effect items affecting this character, sorted by their Duration type, and whether they have Expired.
    * @returns {object|boolean} Object containing the sorted Effect items, or False if there are non.
    */
   getSortedEffectItems() {
      const effects = this.parent.items.filter((item) => item.type === 'effect');
      if (effects.length > 0) {
         return sortObjectsIntoContainerByFunctionValue(effects, (effect) => {
            return effect.system.isExpired ? 'expired' : effect.system.duration.type;
         });
      }

      return false;
   }

   /* === Data Preparation === */

   getRollData() {
      const retVal = super.getRollData();
      retVal.attribute = foundry.utils.deepClone(this.attribute);
      retVal.resistance = foundry.utils.deepClone(this.resistance);
      retVal.skill = foundry.utils.deepClone(this.skill);
      retVal.rating = foundry.utils.deepClone(this.rating);
      retVal.resource = foundry.utils.deepClone(this.resource);
      retVal.speed = foundry.utils.deepClone(this.speed);
      retVal.mod = foundry.utils.deepClone(this.mod);
      retVal.equipped = foundry.utils.deepClone(this.equipped);
      retVal.bio = foundry.utils.deepClone(this.bio);

      return retVal;
   }

   prepareDerivedData() {
      super.prepareDerivedData();
      this._calculateBaseRatings();
      this._calculateBaseResistances();
      this._calculateBaseResources();
      this._resetDynamicMods();
      this._applyRulesElements();
      this._applyConditions();
      this._applyArmorAndShields();
      this._applyMods();
      this._clampResources();

      // Ensure the action queue is initialized
      if (isCurrentUserBestOwner(this.parent) && !this.parent.actionQueue) {
         this.parent.actionQueue = new ActionQueue();
      }
   }

   /**
    * Calculates this Character's base ratings.
    * @protected
    */
   _calculateBaseRatings() {
      // Calculate the base value of ratings
      // Initiative = (Mind + Perception + Dexterity) / 2 rounded up
      this.rating.initiative.baseValue =
         Math.ceil((this.attribute.mind.baseValue +
            this.skill.perception.training.baseValue +
            this.skill.dexterity.training.baseValue) / 2);

      // Awareness = (Mind + Perception) / 2 rounded up
      this.rating.awareness.baseValue =
         Math.ceil((this.attribute.mind.baseValue +
            this.skill.perception.training.baseValue) / 2);

      // Defense = (Body + Dexterity) / 2 rounded up
      this.rating.defense.baseValue =
         Math.ceil((this.attribute.body.baseValue +
            this.skill.dexterity.training.baseValue) / 2);

      // Accuracy = (Mind + Training in Ranged Weapons) / 2 rounded up
      this.rating.accuracy.baseValue =
         Math.ceil((this.attribute.mind.baseValue +
            this.skill.rangedWeapons.training.baseValue) / 2);

      // Melee = (Body + Training in Melee Weapons) / 2 rounded up
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

      // Calculate base resource values
      // Stamina = Total Attribute Mod
      this.resource.stamina.maxBase = Math.max(Math.ceil(
         totalBaseAttributeValue * getSetting('staminaBaseMultiplier')), 1);

      // Resolve = Soul / 2 rounded up
      this.resource.resolve.maxBase = Math.max(Math.ceil(
         this.attribute.soul.baseValue * getSetting('resolveBaseMultiplier')), 1);

      // Wounds = Total Attribute mod / 2 rounded up
      this.resource.wounds.maxBase = Math.max(Math.ceil(
         totalBaseAttributeValue * getSetting('woundsBaseMultiplier')), 1);
   }

   /**
    * Calculates this Character's base resistances.
    * @protected
    */
   _calculateBaseResistances() {
      // Calculate resistance base values
      // Reflexes = (Mind + (Body / 2) rounded up)
      this.resistance.reflexes.baseValue =
         this.attribute.mind.baseValue +
         Math.floor(this.attribute.body.baseValue * 0.5);

      // Resilience = (Body + (Soul/2) rounded up)
      this.resistance.resilience.baseValue =
         this.attribute.body.baseValue +
         Math.floor(this.attribute.soul.baseValue * 0.5);

      // Willpower = (Soul + (Mind/2))
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
       * @param mods
       */
      function resetMods(mods) {
         mods.equipment = 0;
         mods.effect = 0;
         mods.ability = 0;
      }

      // Attributes
      for (const attribute of Object.values(this.attribute)) {
         resetMods(attribute.mod);
      }

      // Skills
      for (const skill of Object.values(this.skill)) {
         resetMods(skill.training.mod);
         resetMods(skill.expertise.mod);
      }

      // Resource
      for (const resource of Object.values(this.resource)) {
         resetMods(resource.mod);
      }

      // Resistance
      for (const resistance of Object.values(this.resistance)) {
         resetMods(resistance.mod);
      }

      // Rating
      for (const rating of Object.values(this.rating)) {
         resetMods(rating.mod);
      }

      // Speed
      for (const speed of Object.values(this.speed)) {
         resetMods(speed.mod);
      }

      // Mod
      for (const mod of Object.values(this.mod)) {
         resetMods(mod.mod);
      }
   }

   /**
    * Applies Rules Elements to the Character.
    * @private
    */
   _applyRulesElements() {
      // Get all the Rules Elements.
      const rulesElements = [];
      this.parent.items.forEach((item) => {
         if (item.system.rulesElement && item.system.rulesElement.length > 0) {

            // Copies the elements from an item and sets their source type accordingly
            /**
             * @param item
             * @param type
             */
            function processItemElements(item, type) {
               const copiedElements = foundry.utils.deepClone(item.system.rulesElement);
               for (const element of copiedElements) {
                  element.type = type;
               }
               rulesElements.push(...copiedElements);
            }

            // Equipment, armor, shields, and weapons only apply elements if they are equipped.
            // Abilities and effects should apply their Rules Elements as normal.
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
               case 'effect': {
                  if (item.system.isActive) {
                     processItemElements(item, 'effect');
                  }

                  break;
               }
               default: {
                  break;
               }
            }
         }
      });

      // If there are any elements
      if (rulesElements.length > 0) {

         // Sort the Rules Elements by type, and process them in order
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

         // Create Rules Element object for easy reference later
         this.parent.rulesElementsCache = {};

         // Apply elements
         this._applyMulBaseElements(mulBaseElements);
         this._applyFlatModifierElements(flatModifierElements);
         this._applyFastHealingElements(fastHealingElements);
         this._applyPersistentDamageElements(persistentDamageElements);
         this._applyTurnMessageElements(turnMessageElements);
         this._applyRollMessageElements(rollMessageElements);
         this._applyConditionalRatingModifierElements(conditionalRatingModifierElements);
         this._applyConditionalCheckModifierElements(conditionalCheckModifierElements);
      }

      // Otherwise, set the Rules Elements cache to null
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
         const mulBase = {};

         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            mulBase[selector] = {};

            // Sort elements by key
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key
            for (const [key, keyElements] of Object.entries(keys)) {
               mulBase[selector][key] = {};

               // Sort elements by type
               const types = sortObjectsIntoContainerByKeyValue(keyElements, 'type');

               // Get the stat data
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const modObject = stat.mod;
               const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

               // For each type
               for (const [type, typeElements] of Object.entries(types)) {
                  mulBase[selector][key][type] = 0;
                  // Apply each mod
                  for (const element of typeElements) {
                     modObject[type] += baseValue * (element.value - 1);
                     mulBase[selector][key][type] += element.value;
                  }
               }
            }
         }
         this.rulesElementsCache.mulBase = mulBase;
      } else {
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
         const flatModifier = {};

         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            flatModifier[selector] = {};

            // Sort elements by key
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key
            for (const [key, keyElements] of Object.entries(keys)) {
               flatModifier[selector][key] = {};

               // Sort elements by type
               const types = sortObjectsIntoContainerByKeyValue(keyElements, 'type');

               // Get the stat data
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const modObject = stat.mod;

               // For each type
               for (const [type, typeElements] of Object.entries(types)) {
                  flatModifier[selector][key][type] = 0;

                  // Apply each mod
                  for (const element of typeElements) {
                     modObject[type] += element.value;
                     flatModifier[selector][key][type] += element.value;
                  }
               }
            }
         }

         this.rulesElementsCache.flatModifier = flatModifier;
      } else {
         this.rulesElementsCache.flatModifier = false;
      }
   }

   /**
    * Applies Fast Healing Rules Elements to this Character.
    * @param {FastHealingElement[]} elements - Array of Fast Healing Rules Elements to apply.
    * @private
    */
   _applyFastHealingElements(elements) {
      if (elements.length > 0) {
         const fastHealing = {};

         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            fastHealing[selector] = {};

            // Sort elements by type
            const types = sortObjectsIntoContainerByKeyValue(selectorElements, 'type');

            // For each type
            for (const [type, typeElements] of Object.entries(types)) {
               fastHealing[selector][type] = 0;

               // Apply each mod
               for (const element of typeElements) {
                  fastHealing[selector][type] += (element.value);
               }
            }
         }

         this.rulesElementsCache.fastHealing = fastHealing;
      } else {
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
         const persistentDamage = {};
         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            persistentDamage[selector] = {};

            // Sort elements by type
            const types = sortObjectsIntoContainerByKeyValue(selectorElements, 'type');

            // For each type
            for (const [type, typeElements] of Object.entries(types)) {
               persistentDamage[selector][type] = 0;
               // Apply each mod
               for (const element of typeElements) {
                  persistentDamage[selector][type] += (element.value);
               }
            }
         }

         this.rulesElementsCache.persistentDamage = persistentDamage;
      } else {
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
         const turnMessage = {};
         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            const selectorMessages = [];

            // For each element
            for (const element of selectorElements) {

               // If the message is not blank, then add it
               if (!isHTMLBlank(element.message)) {
                  selectorMessages.push(element.message);
               }
            }

            // Add the messages to the Rules Element cache only if we have valid messages
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
         const messages = {};

         // Sort elements by check type
         const checkTypes = sortObjectsIntoContainerByKeyValue(elements, 'checkType');
         for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
            const checkTypeMessages = {};

            // Sort elements by selector
            const selectors = sortObjectsIntoContainerByKeyValue(checkTypeElements, 'selector');

            // For each selector
            for (const [selector, selectorElements] of Object.entries(selectors)) {

               // Handle special case for any and multi attack messages
               if (selector === 'multiAttack' || selector === 'any') {
                  const selectorMessages = [];

                  // Apply each message
                  for (const element of selectorElements) {
                     if (!isHTMLBlank(element.message)) {
                        selectorMessages.push(element.message);
                     }
                  }

                  // Add the messages to the Rules Element cache only if we have valid messages
                  if (selectorMessages.length > 0) {
                     checkTypeMessages[selector] = selectorMessages;
                  }
               } else {
                  const selectorMessages = {};

                  // Sort elements by key
                  let keys;
                  switch (selector) {
                     // If the key is determined by using input, sort by camel-case keys
                     case 'customTrait':
                     case 'spellTradition': {
                        keys = sortObjectsIntoContainerByFunctionValue(
                           selectorElements,
                           (element) => camelize(element.key));
                        break;
                     }
                     // Otherwise, sort by raw kay
                     default: {
                        keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');
                        break;
                     }
                  }

                  // For each key
                  for (const [key, keyElements] of Object.entries(keys)) {
                     const keyMessages = [];

                     // For each message
                     for (const element of keyElements) {

                        // If the message is not blank, then add it
                        if (!isHTMLBlank(element.message)) {
                           pushUnique(keyMessages, element.message);
                        }
                     }

                     // Add the messages to the Rules Element cache only if we have valid messages
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
         const conditionalRatingModifiers = {};
         // Sort elements by rating
         const ratings = sortObjectsIntoContainerByKeyValue(elements, 'rating');

         // For each rating
         for (const [rating, ratingElements] of Object.entries(ratings)) {
            {
               // Initialize rating map
               conditionalRatingModifiers[rating] = {};
               const ratingMap = conditionalRatingModifiers[rating];

               // Sort elements by selector
               const selectors = sortObjectsIntoContainerByKeyValue(ratingElements, 'selector');

               // For each selector
               for (const [selector, selectorElements] of Object.entries(selectors)) {

                  // Hand special case for multi attack
                  if (selector === 'multiAttack') {
                     ratingMap.multiAttack = {};

                     // Sort elements by type
                     const types = sortObjectsIntoContainerByKeyValue(selectorElements, 'type');
                     for (const [type, typeElements] of Object.entries(types)) {

                        // Add the value of the multi attack bonus
                        ratingMap.multiAttack[type] = 0;
                        for (const element of typeElements) {
                           ratingMap.multiAttack[type] += element.value;
                        }
                     }
                  } else {
                     // Initialize rating map
                     ratingMap[selector] = {};
                     const selectorMap = ratingMap[selector];

                     // Sort elements by key
                     let keys;
                     switch (selector) {
                        // If the key can be determined by user input, sort by the camel-case keys
                        case 'customWeaponTrait':
                        case 'customArmorTrait':
                        case 'customShieldTrait': {
                           keys = sortObjectsIntoContainerByFunctionValue(
                              selectorElements,
                              (element) => camelize(element.key),
                           );
                           break;
                        }
                        default: {
                           // Other, sort by the raw key
                           keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');
                           break;
                        }
                     }

                     // For each key
                     for (const [key, keyElements] of Object.entries(keys)) {
                        // Initialize key value
                        selectorMap[key] = {};
                        {
                           const keyMap = selectorMap[key];

                           // Sort elements by type
                           const types = sortObjectsIntoContainerByKeyValue(keyElements, 'type');

                           // For each type
                           for (const [type, typeElements] of Object.entries(types)) {
                              keyMap[type] = 0;

                              // For each element
                              for (const element of typeElements) {

                                 // Add to the key value
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

            // Apply armor trait defense modifiers
            const armor = this.getEquippedArmor();
            if (armor) {
               this._applyItemTraitDefenseMods(conditionalRatingModifiers.defense, armor);
            }

            // Apply shield trait defense modifiers
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
    * @param {ConditionalRatingModifierElement[]} elements - Array of Conditional Rating Modifier Rules Elements
    * that modify defense.
    * @param {TitanItem} item - Item to check for satisfying modifier conditions.
    * @private
    */
   _applyItemTraitDefenseMods(elements, item) {
      if (item) {
         // Get item traits
         const itemRollData = item.system.getRollData();
         const itemTraits = itemRollData.trait.map((trait) => trait.name);

         // If the item has traits
         if (itemTraits.length > 0) {

            // Get the item trait mods for this trait
            const itemTraitMods = this._getConditionalRatingModsForSelectorKeys(
               elements,
               `${itemRollData.type}Trait`,
               itemTraits,
            );

            // If there are valid item trait mods
            if (itemTraitMods) {

               // Add the value of each mod
               for (const [type, value] of Object.entries(itemTraitMods)) {
                  this.rating.defense.mod[type] += value;
               }
            }
         }

         // Cache the unique Custom Traits
         const customTraits = [];
         for (const trait of itemRollData.customTrait) {
            pushUnique(customTraits, camelize(trait.name));
         }

         // If there are Custom Traits
         if (customTraits.length > 0) {
            const capitalizedItemType = item.type.charAt(0).toUpperCase() + item.type.slice(1);

            // Get custom trait mods
            const customTraitMods = this._getConditionalRatingModsForSelectorKeys(
               elements,
               `custom${capitalizedItemType}Trait`,
               customTraits,
            );

            // If there are valid custom trait mods
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
         const conditionalCheckModifiers = {};

         // Sort elements by modifier type
         const modifierTypes = sortObjectsIntoContainerByKeyValue(elements, 'modifierType');

         // For each modifier type
         for (const [modifierType, modifierTypeElements] of Object.entries(modifierTypes)) {
            const modifierTypeMap = {};
            conditionalCheckModifiers[modifierType] = modifierTypeMap;

            // Sort elements by check type
            const checkTypes = sortObjectsIntoContainerByKeyValue(modifierTypeElements, 'checkType');

            // For each check type
            for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
               const checkTypeMap = {};
               modifierTypeMap[checkType] = checkTypeMap;

               // Sort elements by selector
               const selectors = sortObjectsIntoContainerByKeyValue(checkTypeElements, 'selector');

               // For each selector
               for (const [selector, selectorElements] of Object.entries(selectors)) {
                  switch (selector) {
                     // Special case handling for any and multi-attack
                     case 'any':
                     case 'multiAttack': {
                        checkTypeMap[selector] = 0;
                        for (const element of selectorElements) {
                           checkTypeMap[selector] += element.value;
                        }
                        break;
                     }

                     // Normal flow
                     default: {
                        checkTypeMap[selector] = {};
                        const selectorMap = checkTypeMap[selector];

                        // Sort the objects by key
                        let keys;
                        switch (selector) {
                           // If the key can be determined by user input, sort by the camel-case keys
                           case 'customTrait':
                           case 'spellTradition': {
                              keys = sortObjectsIntoContainerByFunctionValue(
                                 selectorElements,
                                 (element) => camelize(element.key),
                              );
                              break;
                           }
                           default:
                              // Otherwise, sort by the raw key
                              keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');
                              break;
                        }

                        // For each key
                        for (const [key, keyElements] of Object.entries(keys)) {
                           // Initialize key value
                           selectorMap[key] = 0;
                           {
                              // For each element
                              for (const element of keyElements) {

                                 // Add to the key value
                                 selectorMap[key] += element.value;
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
    * Applies the effects of conditions to the Character.
    * @private
    */
   _applyConditions() {
      // If there are any valid conditions
      const conditions = this.getConditions();
      if (conditions) {

         // Make the modifications for each condition
         for (const condition of conditions) {
            switch (condition.name) {

               // Blinded
               case 'blinded': {

                  // Decrease Melee, Accuracy, and Defense by 1
                  this.rating.melee.mod.effect -= 1;
                  this.rating.accuracy.mod.effect -= 1;
                  this.rating.defense.mod.effect -= 1;

                  break;
               }

               // Contaminated
               case 'contaminated': {

                  // Decrease all Skills and Resistances by 1
                  for (const attribute of Object.values(this.attribute)) {
                     attribute.mod.effect -= 1;
                  }
                  for (const resistance of Object.values(this.resistance)) {
                     resistance.mod.effect -= 1;
                  }
                  break;
               }

               // Prone
               case 'prone': {

                  // Decrease Speed by half
                  for (const speed of Object.values(this.speed)) {

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

                  // Decrease Melee, Accuracy, and Defense by 1
                  this.rating.melee.mod.effect -= 1;
                  this.rating.accuracy.mod.effect -= 1;
                  this.rating.defense.mod.effect -= 1;

                  // Decrease Speed to 0
                  for (const speed of Object.values(this.speed)) {

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

                  // Calculate the total awareness
                  const awareness = this.rating.awareness;
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

                  // Decrease Defense by 1
                  this.rating.defense.mod.effect -= 1;

                  break;
               }

               default: {
                  break;
               }
            }
         }
      }
   }

   /**
    * Applies Armor and Shield modifiers to the Character's stats.
    * @private
    */
   _applyArmorAndShields() {

      // Apply shield defense bonus
      const shield = this.getShield();
      if (shield) {
         this.rating.defense.mod.equipment += shield.system.defense;
      }

      // Apply armor bonus
      const armor = this.getEquippedArmor();
      if (armor) {
         this.mod.armor.equipment += armor.system.armor.value;

         // Add encumbrance if appropriate
         const armorTraits = armor.system.trait;
         for (let idx = 0; idx < armorTraits.length; idx++) {

            // If heavy, decrease all speeds
            if (armorTraits[idx].name === 'heavy.armor') {
               for (const speed of Object.values(this.speed)) {

                  // Get the base speed
                  let totalSpeed = speed.value;

                  // Add the mods
                  for (const mod of Object.values(speed.mod)) {
                     totalSpeed += mod;
                  }

                  // Decrease speed if it would not drop below 0
                  if (totalSpeed > 0) {
                     speed.mod.equipment -= 1;
                  }
               }
               break;
            }
         }
      }
   }

   /**
    * Applies all stat modifiers.
    * @private
    */
   _applyMods() {
      // Get a reference to the parent system data
      const systemData = this;

      // Helper function for applying the mods
      /**
       * @param stat
       */
      function applyMods(stat) {

         // Stat value = base value + sum of all mod values
         stat.value = stat.baseValue;
         for (const mod of Object.values(stat.mod)) {
            stat.value = Math.max(stat.value + mod, 0);
         }
      }

      // Helper function for applying mods with multiple lowers
      /**
       * @param stats
       */
      function applyModsDeep(stats) {

         // Apply mods to each stat in the stats object
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
      // Slightly different because we apply mods to the max, rather than to the value
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
            mod.value += modMod;
         }
      }
   }

   /* === Conditional rating modifiers === */

   /**
    * Triggered at the end of data preparation to ensure that
    * all resources remain within minimum and maximum bounds.
    * @private
    */
   _clampResources() {
      for (const resource of Object.values(this.resource)) {
         resource.value = clamp(resource.value, 0, resource.max);
      }
   }

   /**
    * Helper function for getting the sum conditional rating modifiers for the inputted selector and an array of keys.
    * @param {object} conditionalRatingModifiers - The parent actor's Rules Element cache of mods for rating.
    * @param {string} selector - The type of condition for modifying the rating.
    * @param {*[]} keys - Array of keys to test against.
    * @returns {object|boolean} Object containing the mods to apply, sorted by source type,
    * or false if there were no mods matching the input.
    * @private
    */
   _getConditionalRatingModsForSelectorKeys(
      conditionalRatingModifiers,
      selector,
      keys,
   ) {
      // Initialize return value object for categorizing the bonuses by type
      const retVal = {};

      // If there are mods for this selector
      const selectorMods = conditionalRatingModifiers[selector];
      if (selectorMods) {

         // Add the mods for each matching key
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

   /* === Checks === */

   /**
    * Helper function for getting the conditional rating modifiers for the inputted selector and key pair.
    * @param {object} conditionalRatingModifiers - The parent actor's Rules Element cache of mods for rating.
    * @param {string} selector - The type of condition for modifying the rating
    * (attackType, etc.).
    * @param {string} key - The specific result of the condition for modifying the rating
    * (melee, ranged, etc.).
    * @returns {object|boolean} Object containing the mods to apply, sorted by source type,
    * or false if there were no mods matching the input.
    * @private
    */
   _getConditionalRatingModsForSelectorKey(
      conditionalRatingModifiers,
      selector,
      key,
   ) {
      // If there are mods for this selector
      const selectorMods = conditionalRatingModifiers[selector];
      if (selectorMods) {

         // Return the sum of this key for the mod
         const keyMod = selectorMods[key];
         if (keyMod) {
            return keyMod;
         }
      }

      return false;
   }

   /**
    * Requests an Attribute Check from this Character.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestAttributeCheck(options) {
      // If we do not need to confirm the parameters
      if (!shouldGetCheckOptions()) {

         // Get and roll the check
         await this.rollAttributeCheck(options);
      }

      // If we need to confirm the parameters, the options are valid, and we are an owner
      else {

         // Create a dialog for adjusting the check
         this._createAttributeCheckDialog(options);
      }
   }

   /**
    * Creates an Attribute check, rolls it, and sends it to chat.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async rollAttributeCheck(options) {

      // If the check options are valid
      if (this.parent.isOwner && this.validateAttributeCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeAttributeCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getAttributeCheckParameters(checkOptions);

         // Create the check
         const check = new AttributeCheck(checkParameters);

         // Get the messages for the check
         const checkMessages = this._getAttributeCheckMessages(checkParameters);

         // Roll the check and send it to chat
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of an Attribute Check.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @private
    */
   _createAttributeCheckDialog(options) {
      // If the check options are valid
      if (this.parent.isOwner && this.validateAttributeCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeAttributeCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getAttributeCheckParameters(checkOptions);

         // Create and display the check dialog
         new AttributeCheckDialog(checkOptions, checkParameters, this.parent).render(true);
      }
   }

   /**
    * Validates the options for an Attribute check.
    * @param {object} options - Options for the Check.
    * @returns {boolean} Whether the check options were valid.
    */
   validateAttributeCheckOptions(options) {
      // Ensure options were provided
      if (!options) {
         game.titan.error(
            'Attribute Check failed before construction. No Check Options were provided.',
            true,
            this);
      }

      // Ensure an attribute or skill were provided
      if ((!options.attribute || options.attribute === 'default') &&
         (!options.skill || options.skill === 'none')) {
         game.titan.error(
            'Attribute Check failed before construction. No Attribute or Skill provided.',
            true,
            options,
            this);

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

      // If no attribute is set
      if (checkOptions.attribute === 'default') {
         // We know from prior validation that a skill must have been set.
         // Set the attribute to the default for the set skill.
         checkOptions.attribute = this.skill[checkOptions.skill].defaultAttribute;
      }

      // Get conditional modifiers if none were provided
      // Dice mod
      if (options.diceMod === undefined) {
         checkOptions.diceMod =
            this.getAttributeCheckMod('dice', checkOptions.attribute, checkOptions.skill);
      }

      // Expertise mod
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod =
            this.getAttributeCheckMod('expertise', checkOptions.attribute, checkOptions.skill);
      }

      // Training mod
      if (options.trainingMod === undefined) {
         checkOptions.trainingMod =
            this.getAttributeCheckMod('training', checkOptions.attribute, checkOptions.skill);
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
      // Contaminated creatures have -1 to all dice rolls
      let retVal = 0;

      // Check for conditional modifiers for this check type
      const checkMods = this.rulesElementsCache?.conditionalCheckModifier?.[modifierType];
      if (checkMods) {

         // If mods for Attribute Checks exist
         // There are currently no conditional Resistance Check modifier elements,
         // So all conditional check elements are Attribute Checks by default.
         // Those, all simple Attribute Check modifiers are stored under 'any'.
         const anyCheckMods = checkMods.any;
         if (anyCheckMods) {

            // Get mods for this attribute
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'attribute', attribute);

            // Get mods for this skill
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'skill', skill);

            // Get mods for any checks
            if (anyCheckMods.any) {
               retVal += anyCheckMods.any;
            }
         }
      }
      return retVal;
   }

   /**
    * Gets the parameters for an Attribute Check to be rolled by this Character, accounting for the provided options.
    * @param {AttributeCheckOptions} options - Options for the Check.
    * @returns {AttributeCheckParameters} Parameters for the check, calculated from the provided options.
    */
   getAttributeCheckParameters(options) {
      // Initialize check parameters
      const parameters = createAttributeCheckParameters(options);

      // Initialize common attribute based check parameters
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Attribute Check.
    * @param {AttributeCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check,
    * or false if there are none.
    * @private
    */
   _getAttributeCheckMessages(parameters) {
      // If there are roll messages to be checked
      if (this.rulesElementsCache?.rollMessage) {
         const messages = [];

         // Get messages that apply to any check type
         const anyCheckMessages = this.rulesElementsCache.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            const skill = parameters.skill;
            if (skill && skill !== 'none') {
               this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);
            }
         }

         // Get messages that apply specifically to Attribute Checks
         const attributeCheckMessages = this.rulesElementsCache.rollMessage?.attribute;
         if (attributeCheckMessages) {

            // Get messages that apply to any Attribute Check
            this._getCheckMessagesForAny(attributeCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(attributeCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            this._getCheckMessagesForSkill(attributeCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests an Attribute Check from this Character.
    * @param {ResistanceCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestResistanceCheck(options) {
      // If we do not need to confirm the parameters
      if (!shouldGetCheckOptions()) {

         // Get and roll the check
         await this.rollResistanceCheck(options);
      }

      // If we need to confirm the parameters, the options are valid, and we are an owner
      else {

         // Create a dialog for adjusting the check
         this._createResistanceCheckDialog(options);
      }
   }

   /**
    * Creates a Resistance Check, rolls it, and sends it to chat.
    * @param {ResistanceCheckOptions} options - Options for the Resistance Check.
    * @returns {Promise<void>}
    */
   async rollResistanceCheck(options) {

      // If the check options are valid
      if (this.parent.isOwner && this.validateResistanceCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeResistanceCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getResistanceCheckParameters(checkOptions);

         // Create the check
         const check = new ResistanceCheck(checkParameters);

         // Get the messages for the check
         const checkMessages = this._getResistanceCheckMessages(checkParameters);

         // Roll the check and send it to chat
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of a Resistance Check.
    * @param {ResistanceCheckOptions} options - Options for the Check.
    * @private
    */
   _createResistanceCheckDialog(options) {
      // If the check options are valid
      if (this.parent.isOwner && this.validateResistanceCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeResistanceCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getResistanceCheckParameters(checkOptions);

         // Create and display the check dialog
         new ResistanceCheckDialog(checkOptions, checkParameters, this.parent).render(true);
      }
   }

   /**
    * Validates the options for a Resistance check.
    * @param {object} options - Initial options for the check.
    * @returns {boolean} Whether the check options were valid.
    */
   validateResistanceCheckOptions(options) {
      // Ensure options were provided
      if (!options) {
         game.titan.error(
            'Resistance Check failed before construction. No Check Options were provided.',
            true,
            this);
      }

      // Ensure a resistance is set
      if (!options.resistance) {
         game.titan.error(
            'Resistance Check failed before construction. No Resistance provided.',
            true,
            options,
            this);

         return false;
      }

      return true;
   }

   /**
    * Populates Resistance Check Options with this Character's specific data, unless specific overrides were applied.
    * @param {object} options - Options for the Check.
    * @returns {ResistanceCheckOptions} The new, fully-populated Resistance Check Options.
    */
   initializeResistanceCheckOptions(options) {
      // For now, there are no actor specific resistance check modifiers,
      // so we only need to fill out the options object.
      return createResistanceCheckOptions(options);
   }

   /**
    * Gets the parameters for a Resistance Check to be rolled by this Character, accounting for the provided options.
    * @param {ResistanceCheckOptions} options - Options for the Check.
    * @returns {ResistanceCheckParameters} Parameters for the check, calculated from the provided options.
    */
   getResistanceCheckParameters(options) {
      // Initialize check parameters
      const parameters = createResistanceCheckParameters(options);
      const actorRollData = this.getRollData();

      // Get the resistance dice
      parameters.resistanceDice = actorRollData.resistance[parameters.resistance].value;

      // Add the dice mod to the total dice
      parameters.totalDice = parameters.resistanceDice + parameters.diceMod;

      // Calculate the total expertise
      parameters.totalExpertise = parameters.expertiseMod * (parameters.doubleExpertise === true ? 2 : 1);

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Resistance Check.
    * @param {ResistanceCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, if any,
    * or false if there are none.
    * @private
    */
   _getResistanceCheckMessages(parameters) {
      // If there are roll messages to be checked
      if (this.rulesElementsCache?.rollMessage) {
         const messages = [];

         // Get messages that apply to any check type
         const anyCheckMessages = this.rulesElementsCache.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check
            this._getCheckMessagesForAny(anyCheckMessages, messages);
         }

         // Get messages that apply to specifically Resistance Checks
         const resistanceCheckMessages = this.rulesElementsCache.rollMessage.resistance;
         if (resistanceCheckMessages) {

            // Get messages that apply to any Resistance Check
            this._getCheckMessagesForAny(resistanceCheckMessages, messages);

            // Get messages that apply to this Resistance
            this._getResistanceMessages(resistanceCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests an Attack Check from this Character.
    * @param {AttackCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestAttackCheck(options) {
      // If we do not need to confirm the parameters
      if (!shouldGetCheckOptions()) {

         // Get and roll the check
         await this.rollAttackCheck(options);
      }

      // If we need to confirm the parameters, the options are valid, and we are an owner
      else {

         // Create a dialog for adjusting the check
         this._createAttackCheckDialog(options);
      }
   }

   /**
    * Creates an Attack Check, rolls it, and sends it to chat.
    * @param {AttackCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async rollAttackCheck(options) {

      // If the check options are valid
      if (this.parent.isOwner && this.validateAttackCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeAttackCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getAttackCheckParameters(checkOptions);

         // Create the check
         const check = new AttackCheck(checkParameters);

         // Get the messages for the check
         const checkMessages = this._getAttackCheckMessages(checkParameters);

         // Roll the check and send it to chat
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of an Attack Check.
    * @param {AttackCheckOptions} options - Options for the Check.
    * @private
    */
   _createAttackCheckDialog(options) {
      // If the check options are valid
      if (this.parent.isOwner && this.validateAttackCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeAttackCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getAttackCheckParameters(checkOptions);

         // Create and display the check dialog
         new AttackCheckDialog(checkOptions, checkParameters, this.parent).render(true);
      }
   }

   /**
    * Validates the options for an Attack Check.
    * @param {object} options - Options for the Check.
    * @returns {boolean} Whether the check options were valid.
    */
   validateAttackCheckOptions(options) {
      // Ensure options were provided
      if (!options) {
         game.titan.error(
            'Attack Check failed before construction. No Check Options were provided.',
            true,
            this);
      }

      // Ensure an item ID  was provided.
      if (!options.itemId) {
         game.titan.error(
            'Attack Check failed before construction. No Item ID was provided.',
            true,
            options,
            this);

         return false;
      }

      // Ensure the item exists in the parent actor.
      const item = this.parent.items.get(options.itemId);
      if (!item) {
         game.titan.error(
            'Attack Check failed before construction. Item ID was invalid.',
            true,
            options,
            this);

         return false;
      }

      // Ensure the attack index is in a valid range.
      const numAttacks = item.system.attack.length;
      if ((options.attackIdx && options.attackIdx > numAttacks) ||
         numAttacks === 0) {
         game.titan.error(
            'Attack Check failed before construction. Attack Idx was out of range.',
            true,
            options,
            this);

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

      // If no attribute is set
      if (checkOptions.attribute === 'default') {

         // Set the attribute to the value stored in the attack.
         checkOptions.attribute = attack.attribute;
      }

      // If no skill is set
      if (checkOptions.skill === 'default') {

         // Set the skill to the value stored in the attack.
         checkOptions.skill = attack.skill;
      }

      // If multi-attack is not set
      if (options.multiAttack === undefined) {

         // Set multi-attack to the value stored in item.
         checkOptions.multiAttack = itemRollData.multiAttack;
      }

      // If plus extra successes damage is not set
      if (options.plusExtraSuccessDamage === undefined) {

         // Set plus extra successes damage to the value stored in the attack.
         checkOptions.plusExtraSuccessDamage = attack.plusExtraSuccessDamage;
      }

      // If attack-type is not set
      if (options.type === undefined) {

         // Set the type to the value stored in the attack.
         checkOptions.type = attack.type;
      }

      // If the range is not set
      if (options.range === undefined) {

         // Set the range to the value stored in the attack.
         checkOptions.range = attack.range;
      }

      // Update flags for attack traits
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

      // Cache the unique custom and attack traits
      const customTraits = [];
      for (const trait of itemRollData.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }
      for (const trait of attack.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }

      // Get conditional modifiers
      // Dice mod
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

      // Expertise mod
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

      // Training mod
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

      // Damage mod
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

      // Melee
      if (options.attackerMelee === undefined) {
         checkOptions.attackerMelee = this.rating.melee.value + this._getAttackRatingMod(
            'melee',
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Accuracy
      if (options.attackerAccuracy === undefined) {
         checkOptions.attackerAccuracy = this.rating.accuracy.value + this._getAttackRatingMod(
            'accuracy',
            checkOptions.multiAttack,
            checkOptions.type,
            attackTraits,
            customTraits,
         );
      }

      // Target defense
      if (options.targetDefense === undefined) {
         const targets = getTargetedCharacters();
         if (targets.length > 0) {
            checkOptions.targetDefense = targets[0].system.getRollData().rating.defense.value;
         } else {
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
      let retVal = 0;

      // If there are any conditional modifiers for this modifier type
      const checkMods = this.rulesElementsCache?.conditionalCheckModifier?.[modifierType];
      if (checkMods) {

         // Get mods that apply to any type of check
         const anyCheckMods = checkMods.any;
         if (anyCheckMods) {

            // Get mods that apply to the check's Attribute
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'attribute', attribute);

            // Get mods that apply to the check's Skill
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'skill', skill);

            // Get mods that apply to the check's Custom Traits
            if (customTraits.length > 0) {
               retVal += this._getConditionalCheckModsForSelectorKeys(
                  anyCheckMods,
                  'customTrait',
                  customTraits,
               );
            }

            // Get mods that apply to any check
            if (anyCheckMods.any) {
               retVal += anyCheckMods.any;
            }
         }

         // Get mods that apply to attack checks
         const attackCheckMods = checkMods.attack;
         if (attackCheckMods) {

            // Get mods that apply to the attack attribute
            retVal += this._getConditionalCheckModsForSelectorKey(attackCheckMods, 'attribute', attribute);

            // Get mods that apply to the attack skill
            retVal += this._getConditionalCheckModsForSelectorKey(attackCheckMods, 'skill', skill);

            // Get mods that apply to the attack type
            retVal += this._getConditionalCheckModsForSelectorKey(attackCheckMods, 'attackType', type);

            // Get mods that apply to attack traits
            if (attackTraits.length > 0) {
               retVal += this._getConditionalCheckModsForSelectorKeys(
                  attackCheckMods,
                  'attackTrait',
                  attackTraits,
               );
            }

            // Get mods that apply to the check's Custom Traits
            if (customTraits.length > 0) {
               retVal += this._getConditionalCheckModsForSelectorKeys(
                  attackCheckMods,
                  'customTrait',
                  customTraits,
               );
            }

            // Get mods that apply to multi-attacks
            if (multiAttack && attackCheckMods.multiAttack) {
               retVal += attackCheckMods.multiAttack;
            }

            // Get mods that apply to any attack check
            if (attackCheckMods.any) {
               retVal += attackCheckMods.any;
            }
         }
      }

      return retVal;
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
      let retVal = 0;

      // If there are modifiers for this rating
      const conditionalRatingMods = this.rulesElementsCache?.conditionalRatingModifier?.[rating];
      if (conditionalRatingMods) {

         // Get mods that apply to attack traits
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

         // Get mods that apply to the check's Custom Traits
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

         // Get modifiers for attack type
         const attackTypeMods = this._getConditionalRatingModsForSelectorKey(
            conditionalRatingMods,
            'attackType',
            type,
         );
         if (attackTypeMods) {
            retVal += getSumOfObjectValues(attackTypeMods);
         }

         // Get multi-attack modifiers if multi-attacking
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
      // Initialize check parameters
      const parameters = createAttackCheckParameters(options);

      // Initialize common attribute based check parameters
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      // If this is a multi-attack
      if (parameters.multiAttack) {

         // Divide the dice and expertise by half
         // Round the total dice up if the attack has the flurry trait
         // Otherwise, round down
         parameters.totalDice = parameters.flurry ?
            Math.ceil(parameters.totalDice / 2) :
            Math.floor(parameters.totalDice / 2);

         // Always round the expertise down
         parameters.totalExpertise = Math.floor(parameters.totalExpertise / 2);
      }

      // Calculate the attacker's attack rating
      parameters.attackerRating = parameters.type === 'melee' ?
         parameters.attackerMelee :
         parameters.attackerAccuracy;

      // Calculate the difficulty of the check from the target defense rating, and the attacker rating.
      // Difficulty = 4 + (defense rating - attacker rating), min 2, max 6
      parameters.difficulty = clamp(parameters.targetDefense - parameters.attackerRating + 4, 2, 6);

      // Cache the item and attack stats from the item roll data
      const itemRollData = this.parent.items.get(options.itemId).system.getRollData();
      const attackData = itemRollData.attack[options.attackIdx];
      parameters.img = itemRollData.img;
      parameters.itemName = itemRollData.name;
      parameters.attackNotes = itemRollData.attackNotes;
      parameters.damage = attackData.damage;
      parameters.attackTrait = attackData.trait;

      // Ensure each custom trait in the parameters is unique
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
    * @returns {string[]|boolean} Array of messages to attach to the check, if any,
    * or false if there are none.
    * @private
    */
   _getAttackCheckMessages(parameters) {
      // If there are roll messages to be checked
      if (this.rulesElementsCache?.rollMessage) {
         const messages = [];

         // Get messages that apply to any check type
         const anyCheckMessages = this.rulesElementsCache.rollMessage.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits
            this._getCustomTraitMessages(anyCheckMessages, parameters, messages);
         }

         // Get messages that apply specifically to Attack Checks
         const attackCheckMessages = this.rulesElementsCache.rollMessage.attack;
         if (attackCheckMessages) {

            // Get messages that apply to any Attack Check
            this._getCheckMessagesForAny(attackCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            this._getCheckMessagesForSkill(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with this attack Type
            this._getAttackTypeMessages(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with these attack Traits
            this._getAttackTraitMessages(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits
            this._getCustomTraitMessages(attackCheckMessages, parameters, messages);

            // Get messages that apply to checks with multi-attack set
            this._getMultiAttackMessages(attackCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests a Casting Check from this Character.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestCastingCheck(options) {
      // If we do not need to confirm the parameters
      if (!shouldGetCheckOptions()) {

         // Get and roll the check
         await this.rollCastingCheck(options);
      }

      // If we need to confirm the parameters, the options are valid, and we are an owner
      else {

         // Create a dialog for adjusting the check
         this._createCastingCheckDialog(options);
      }
   }

   /**
    * Creates a Casting Check, rolls it, and sends it to chat.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async rollCastingCheck(options) {

      // If the check options are valid
      if (this.parent.isOwner && this.validateCastingCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeCastingCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getCastingCheckParameters(checkOptions);

         // Create the check
         const check = new CastingCheck(checkParameters);

         // Get the messages for the check
         const checkMessages = this._getCastingCheckMessages(checkParameters);

         // Roll the check and send it to chat
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of a Casting Check.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @private
    */
   _createCastingCheckDialog(options) {
      // If the check options are valid
      if (this.parent.isOwner && this.validateCastingCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeCastingCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getCastingCheckParameters(checkOptions);

         // Create and display the check dialog
         new CastingCheckDialog(checkOptions, checkParameters, this.parent).render(true);
      }
   }

   /**
    * Validates the options for a Casting Check.
    * @param {object} options - Options for the Check.
    * @returns {boolean} Whether the check options were valid.
    */
   validateCastingCheckOptions(options) {
      // Ensure options were provided
      if (!options) {
         game.titan.error(
            'Casting Check failed before construction. No Check Options were provided.',
            true,
            this);
      }

      // Ensure an item ID  was provided.
      if (!options.itemId) {
         game.titan.error(
            'Casting Check failed before construction. No Item ID was provided.',
            true,
            options,
            this);

         return false;
      }

      // Ensure the item exists in the parent actor.
      const item = this.parent.items.get(options.itemId);
      if (!item) {
         game.titan.error(
            'Casting Check failed before construction. Item ID was invalid.',
            true,
            options,
            this);

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

      // Cache the item roll data
      const itemRollData = this.parent.items.get(checkOptions.itemId).system.getRollData();
      const checkData = itemRollData.castingCheck;

      // If no attribute is set.
      if (checkOptions.attribute === 'default') {

         // Set the attribute to the value stored in the item.
         checkOptions.attribute = checkData.attribute;
      }

      // If no skill is set
      if (checkOptions.skill === 'default') {

         // Set the skill to the value stored in the item.
         checkOptions.skill = checkData.skill;
      }

      // If complexity is not set
      if (!options.complexity) {

         // Set the complexity to the value stored in the item.
         checkOptions.complexity = checkData.complexity;
      }

      // If difficulty is not set
      if (!options.difficulty) {

         // Set the complexity to the value stored in the item.
         checkOptions.difficulty = checkData.difficulty;
      }

      // Cache the Custom Traits
      const customTraits = [];
      for (const trait of itemRollData.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }

      // Get conditional modifiers
      // Dice mod
      if (options.diceMod === undefined) {
         checkOptions.diceMod = this.getCastingCheckMod(
            'dice',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Expertise mod
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod = this.getCastingCheckMod(
            'expertiseMod',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Training mod
      if (options.trainingMod === undefined) {
         checkOptions.trainingMod = this.getCastingCheckMod(
            'training',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Damage mod
      if (options.damageMod === undefined) {
         checkOptions.damageMod = this.getCastingCheckMod(
            'damage',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
      }

      // Healing mod
      if (options.healingMod === undefined) {
         checkOptions.healingMod = this.getCastingCheckMod(
            'healing',
            checkOptions.attribute,
            checkOptions.skill,
            itemRollData.tradition,
            customTraits,
         );
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
      let retVal = 0;

      // If there are any conditional modifiers for this modifier type
      const checkMods = this.rulesElementsCache?.conditionalCheckModifier?.[modifierType];
      if (checkMods) {

         // Get mods that apply to any type of check
         const anyCheckMods = checkMods.any;
         if (anyCheckMods) {

            // Get mods that apply to the check's Attribute
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'attribute', attribute);

            // Get mods that apply to the check's Skill
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'skill', skill);

            // Get mods that apply to the check's Custom Traits
            if (customTraits.length > 0) {
               retVal += this._getConditionalCheckModsForSelectorKeys(
                  anyCheckMods,
                  'customTrait',
                  customTraits,
               );
            }

            // Get mods that apply to any check
            if (anyCheckMods.any) {
               retVal += anyCheckMods.any;
            }
         }

         // Get mods that apply to Casting Checks
         const castingCheckMods = checkMods.casting;
         if (castingCheckMods) {

            // Get mods that apply to the check's Attribute
            retVal += this._getConditionalCheckModsForSelectorKey(castingCheckMods, 'attribute', attribute);

            // Get mods that apply to the check's Skill
            retVal += this._getConditionalCheckModsForSelectorKey(castingCheckMods, 'skill', skill);

            // Get mods that apply to the spell's tradition
            retVal += this._getConditionalCheckModsForSelectorKey(
               castingCheckMods,
               'spellTradition',
               tradition,
            );

            // Get mods that apply to the check's Custom Traits
            if (customTraits.length > 0) {
               retVal += this._getConditionalCheckModsForSelectorKeys(
                  castingCheckMods,
                  'customTrait',
                  customTraits,
               );
            }

            // Get mods that apply to any Casting Check
            if (castingCheckMods.any) {
               retVal += castingCheckMods.any;
            }
         }
      }

      return retVal;
   }

   /**
    * Gets the parameters for a Casting Check to be rolled by this Character, accounting for the provided options.
    * @param {CastingCheckOptions} options - Options for the Check.
    * @returns {CastingCheckParameters} Parameters for the check, calculated from the provided options.
    */
   getCastingCheckParameters(options) {
      // Initialize check parameters
      const parameters = createCastingCheckParameters(options);

      // Initialize common attribute based check parameters
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      // Cache the item stats from the item roll data
      const itemRollData = this.parent.items.get(options.itemId).system.getRollData();
      parameters.img = itemRollData.img;
      parameters.itemName = itemRollData.name;
      parameters.itemDescription = itemRollData.description;
      parameters.customTrait = itemRollData.customTrait;
      parameters.tradition = itemRollData.tradition;

      // Cache and localize the standard aspects
      const standardAspects = itemRollData.aspect;
      for (const aspect of standardAspects) {
         aspect.label = localize(aspect.unit ?? aspect.label);
      }

      // Process each aspect
      /**
       * @param aspects
       */
      function processAspects(aspects) {

         // For each aspect
         for (const aspect of aspects) {

            // Cache whether this spell has resistance checks
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

            // If this aspect is damage, add its initial value to the parameters
            if (aspect.isDamage) {
               parameters.damage += aspect.initialValue;
            }

            // If this aspect is healing, add its initial value to the parameters
            if (aspect.isHealing) {
               parameters.healing += aspect.initialValue;
            }

            // If the aspect is scaling, add it to the scaling aspects
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

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Casting Check.
    * @param {CastingCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, if any,
    * or false if there are none.
    * @private
    */
   _getCastingCheckMessages(parameters) {
      // If there are roll messages to be checked
      if (this.rulesElementsCache?.rollMessage) {
         const messages = [];

         // Get messages that apply to any check type
         const anyCheckMessages = this.rulesElementsCache?.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits
            this._getCustomTraitMessages(anyCheckMessages, parameters, messages);
         }

         // Get messages that apply specifically to Casting Checks
         const castingCheckMessages = this.rulesElementsCache?.rollMessage?.casting;
         if (castingCheckMessages) {

            // Get messages that apply to any Casting Check
            this._getCheckMessagesForAny(castingCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(castingCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            this._getCheckMessagesForSkill(castingCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits
            this._getCustomTraitMessages(castingCheckMessages, parameters, messages);

            // Get messages that apply to checks with the spell's Tradition
            this._getSpellTraditionMessages(castingCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Requests an Item Check from this Character.
    * @param {ItemCheckOptions} options - Options for the Check.
    * @returns {Promise<void>}
    */
   async requestItemCheck(options) {
      // If we do not need to confirm the parameters
      if (!shouldGetCheckOptions()) {

         // Get and roll the check
         await this.rollItemCheck(options);
      }

      // If we need to confirm the parameters, the options are valid, and we are an owner
      else {

         // Create a dialog for adjusting the check
         this._createItemCheckDialog(options);
      }
   }

   /**
    * Creates an Item Check, rolls it, and sends it to chat.
    * @param {ItemCheckOptions} options - Validated check options.
    * @returns {Promise<void>}
    */
   async rollItemCheck(options) {

      // If the check options are valid
      if (this.parent.isOwner && this.validateItemCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeItemCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getItemCheckParameters(checkOptions);

         // Create the check
         const check = new ItemCheck(checkParameters);

         // Get the messages for the check
         const checkMessages = this._getItemCheckMessages(checkParameters);

         // Roll the check and send it to chat
         await this._rollCheck(check, checkMessages);
      }
   }

   /**
    * Creates a dialog for setting the options of an Item Check.
    * @param {ItemCheckOptions} options - Options for the Check.
    * @private
    */
   _createItemCheckDialog(options) {
      // If the check options are valid
      if (this.parent.isOwner && this.validateItemCheckOptions(options)) {

         // Ensure the check options are initialized
         const checkOptions = this.initializeItemCheckOptions(options);

         // Calculate the parameters
         const checkParameters = this.getItemCheckParameters(checkOptions);

         // Create and display the check dialog
         new ItemCheckDialog(checkOptions, checkParameters, this.parent).render(true);
      }
   }

   /**
    * Validates the options for an Item Check.
    * @param {object} options - Options for the Check.
    * @returns {boolean} Whether the check options were valid.
    */
   validateItemCheckOptions(options) {
      // Ensure options were provided
      if (!options) {
         game.titan.error(
            'Item Check failed before construction. No Check Options were provided.',
            true,
            this);
      }

      // Ensure an item ID or Item Roll Data was provided.
      let itemRollData = options.itemRollData ?? this.parent.items.get(options.itemId)?.getRollData();
      if (!itemRollData) {
         game.titan.error(
            'Item Check failed before construction. No valid Item ID or Item Roll Data was provided.',
            true,
            options,
            this);
         return false;
      }

      // Ensure the check index is in a valid range.
      const numChecks = itemRollData.check.length;
      if ((options.checkIdx && options.checkIdx > numChecks) ||
         numChecks === 0) {
         game.titan.error(
            'Item Check failed before construction. Check Idx was out of range.',
            true,
            options,
            this);
         return false;
      }

      return true;
   }

   /**
    * Populates Item Check Options with this Character's specific data, unless specific overrides were applied.
    * @param {object} options - Options for the Check.
    * @returns {ItemCheckOptions} The new, fully-populated Item Check Options.
    */
   initializeItemCheckOptions(options) {
      const checkOptions = createItemCheckOptions(options);

      // Cache the item and roll data
      const itemRollData = options.itemRollData ?
         options.itemRollData :
         this.parent.items.get(checkOptions.itemId).system.getRollData();
      const checkData = itemRollData.check[checkOptions.checkIdx];

      // If no attribute is set.
      if (checkOptions.attribute === 'default') {

         // Set the attribute to the value stored in the item.
         checkOptions.attribute = checkData.attribute;
      }

      // If no skill is set
      if (checkOptions.skill === 'default') {

         // Set the skill to the value stored in the item.
         checkOptions.skill = checkData.skill;
      }

      // If complexity is not set
      if (!options.complexity) {

         // Set the complexity to the value stored in the item.
         checkOptions.complexity = checkData.complexity;
      }

      // If difficulty is not set
      if (!options.difficulty) {

         // Set the complexity to the value stored in the item.
         checkOptions.difficulty = checkData.difficulty;
      }

      // Cache the Custom Traits
      const customTraits = [];
      for (const trait of itemRollData.customTrait) {
         pushUnique(customTraits, camelize(trait.name));
      }

      // Get conditional modifiers
      // Dice mod
      if (options.diceMod === undefined) {
         checkOptions.diceMod = this.getItemCheckMod(
            'diceMod',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Expertise mod
      if (options.expertiseMod === undefined) {
         checkOptions.expertiseMod = this.getItemCheckMod(
            'expertiseMod',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Training mod
      if (options.trainingMod === undefined) {
         checkOptions.trainingMod = this.getItemCheckMod(
            'training',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Damage mod
      if (options.damageMod === undefined) {
         checkOptions.damageMod = this.getItemCheckMod(
            'damage',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
      }

      // Healing mod
      if (options.healingMod === undefined) {
         checkOptions.healingMod = this.getItemCheckMod(
            'healing',
            checkOptions.attribute,
            checkOptions.skill,
            customTraits,
         );
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
      let retVal = 0;

      // If there are any conditional modifiers for this modifier type
      const checkMods = this.rulesElementsCache?.conditionalCheckModifier?.[modifierType];
      if (checkMods) {

         // Get mods that apply to any type of check
         const anyCheckMods = checkMods.any;
         if (anyCheckMods) {

            // Get mods that apply to the check's Attribute
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'attribute', attribute);

            // Get mods that apply to the check's Skill
            retVal += this._getConditionalCheckModsForSelectorKey(anyCheckMods, 'skill', skill);

            // Get mods that apply to the check's Custom Traits
            if (customTraits.length > 0) {
               retVal += this._getConditionalCheckModsForSelectorKeys(
                  anyCheckMods,
                  'customTrait',
                  customTraits,
               );
            }

            // Get mods that apply to any check
            if (anyCheckMods.any) {
               retVal += anyCheckMods.any;
            }
         }

         // Get mods that apply to Item Checks
         const itemCheckMods = checkMods.item;
         if (itemCheckMods) {

            // Get mods that apply to the check's Attribute
            retVal += this._getConditionalCheckModsForSelectorKey(itemCheckMods, 'attribute', attribute);

            // Get mods that apply to the check's Skill
            retVal += this._getConditionalCheckModsForSelectorKey(itemCheckMods, 'skill', skill);

            // Get mods that apply to the check's Custom Traits
            if (customTraits.length > 0) {
               retVal += this._getConditionalCheckModsForSelectorKeys(
                  itemCheckMods,
                  'customTrait',
                  customTraits,
               );
            }

            // Get mods that apply to any Item Check
            if (itemCheckMods.any) {
               retVal += itemCheckMods.any;
            }
         }
      }

      return retVal;
   }

   /**
    * Gets the parameters for an Item Check to be rolled by this Character, accounting for the provided options.
    * @param {ItemCheckOptions} options - Options for the Check.
    * @returns {ItemCheckParameters} Parameters for the check, calculated from the provided options.
    * @private
    */
   getItemCheckParameters(options) {
      // Initialize check parameters
      const parameters = createItemCheckParameters(options);

      // Initialize common attribute based check parameters
      const actorRollData = this.getRollData();
      this._initializeAttributeBasedCheck(parameters, actorRollData);

      // Cache the item stats from the item roll data
      const itemRollData = options.itemRollData ?
         options.itemRollData :
         this.parent.items.get(options.itemId).system.getRollData();
      const checkData = itemRollData.check[options.checkIdx];
      parameters.img = itemRollData.img;
      parameters.itemName = itemRollData.name;
      parameters.itemDescription = itemRollData.description;
      parameters.customTrait = itemRollData.customTrait;
      parameters.checkLabel = checkData.label;
      parameters.resolveCost = checkData.resolveCost;
      parameters.resistanceCheck = checkData.resistanceCheck;

      // Set the opposed check data
      if (checkData.opposedCheck.enabled) {
         parameters.opposedCheck = {
            attribute: checkData.opposedCheck.attribute,
            skill: checkData.opposedCheck.skill,
         };
      }

      // If this check has damage or healing
      if (checkData.isDamage || checkData.isHealing) {

         // Set the base damage if appropriate
         if (checkData.isDamage) {
            parameters.damage = checkData.initialValue;

            // Set whether the damage can be reduced
            if ((parameters.damageReducedBy === 'opposedCheck' && parameters.opposedCheck.enabled) ||
               (parameters.damageReducedBy === 'resistanceCheck' && parameters.resistanceCheck !== 'none')) {
               parameters.damageReducedBy = checkData.damageReducedBy;
            }
         }

         // Set the base healing if appropriate
         if (checkData.isHealing) {
            parameters.healing = checkData.initialValue;
         }

         // Set scaling if appropriate
         parameters.scaling = checkData.scaling;
      }

      return parameters;
   }

   /**
    * Gets conditional messages to that apply to a specific Item Check.
    * @param {ItemCheckParameters} parameters - Parameters of the Check to get messages for.
    * @returns {string[]|boolean} Array of messages to attach to the check, if any,
    * or false if there are none.
    * @private
    */
   _getItemCheckMessages(parameters) {
      // If there are roll messages to be checked
      if (this.rulesElementsCache?.rollMessage) {
         const messages = [];

         // Get messages that apply to any check type
         const anyCheckMessages = this.rulesElementsCache?.rollMessage?.any;
         if (anyCheckMessages) {

            // Get messages that apply to any check
            this._getCheckMessagesForAny(anyCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            this._getCheckMessagesForSkill(anyCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits
            this._getCustomTraitMessages(anyCheckMessages, parameters, messages);
         }

         // Get messages that apply specifically to Item Checks
         const itemCheckMessages = this.rulesElementsCache?.rollMessage?.item;
         if (itemCheckMessages) {

            // Get messages that apply to any Item Check
            this._getCheckMessagesForAny(itemCheckMessages, messages);

            // Get messages that apply to checks with this Attribute
            this._getCheckMessagesForAttribute(itemCheckMessages, parameters, messages);

            // Get messages that apply to checks with this Skill
            this._getCheckMessagesForSkill(itemCheckMessages, parameters, messages);

            // Get messages that apply to checks with these Custom Traits
            this._getCustomTraitMessages(itemCheckMessages, parameters, messages);
         }

         return messages.length > 0 ? messages : false;
      }

      return false;
   }

   /**
    * Helper function for applying attribute and skill modifiers to a check.
    * Not used by every check, but the logic is common among most.
    * @param {AttributeCheckParameters} parameters - The check parameters. Will be modified by this function.
    * @param {object} actorRollData - The actor roll data.
    * @private
    */
   _initializeAttributeBasedCheck(parameters, actorRollData) {
      // If the attribute was set to default, then determine the attribute from the skill
      if (parameters.attribute === 'default') {
         parameters.attribute = actorRollData.skill[parameters.skill].defaultAttribute;
      }

      // Calculate the attribute dice
      parameters.attributeDice = actorRollData.attribute[parameters.attribute].value;

      // Calculate the skill training and expertise
      if (parameters.skill !== 'none') {
         const skillData = actorRollData.skill[parameters.skill];
         parameters.skillTrainingDice = skillData.training.value;
         parameters.skillExpertise = skillData.expertise.value;
      }

      // Calculate the total training dice
      parameters.totalTrainingDice = parameters.skillTrainingDice + parameters.trainingMod;
      if (parameters.doubleTraining) {
         parameters.totalTrainingDice *= 2;
      }

      // Calculate the total expertise
      parameters.totalExpertise = parameters.skillExpertise + parameters.expertiseMod;
      if (parameters.doubleExpertise) {
         parameters.totalExpertise *= 2;
      }

      // Calculate the total dice
      parameters.totalDice = parameters.attributeDice + parameters.totalTrainingDice + parameters.diceMod;
   }

   /**
    * Helper function for getting the conditional check modifiers for the inputted selector and key pair.
    * @param {object} conditionalCheckModifiers - The parent actor's Rules Element cache of mods for desire check
    * and modifier type.
    * @param {string} selector - The type of condition for modifying the check
    * (any, attribute, trait, etc.).
    * @param {string} key - The specific result of the condition for modifying the check
    * (body, melee, etc.).
    * @returns {number} The mod to apply to the requested check.
    * @private
    */
   _getConditionalCheckModsForSelectorKey(
      conditionalCheckModifiers,
      selector,
      key) {
      // If there are mods for this selector
      const selectorMods = conditionalCheckModifiers[selector];
      if (selectorMods) {

         // Return the key for this mod
         const keyMod = selectorMods[key];
         if (keyMod) {
            return keyMod;
         }
      }

      return 0;
   }

   /**
    * Helper function for getting the sum conditional check modifiers for the inputted selector and an array of keys.
    * @param {object} conditionalCheckModifiers - The parent actor's Rules Element cache of mods for desire check
    * and modifier type.
    * @param {string} selector - The type of condition for modifying the check
    * (trait, customTrait.).
    * @param {*[]} keys - Array of keys to test against.
    * @returns {number} The mod to apply to the requested check.
    * @private
    */
   _getConditionalCheckModsForSelectorKeys(
      conditionalCheckModifiers,
      selector,
      keys,
   ) {
      let retVal = 0;

      // If there are Rules Elements for this selector
      const selectorMods = conditionalCheckModifier[selector];
      if (selectorMods) {

         // Add the mods for each matching key
         keys.forEach((key) => {
            const keyMod = selectorMods[key];
            if (keyMod) {
               retVal += keyMod;
            }
         });
      }

      return retVal;
   }

   /**
    * Searches a category Roll Message elements which match the inputted Selector and Key values.
    * @param {object} categoryMessages - Messages that apply to a specific category of checks.
    * @param {string} selector - Desired Selector value to filter for.
    * @param {string} key - Desired Key value to filter for.
    * @returns {string[]|boolean} Array of messages whose Selector and Key values match those provided,
    * or false if there were no natches.
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
    * @returns {string[]|boolean} Array of messages whose Selector and Key values match those provided,
    * or false if there were no natches.
    * @private
    */
   _getRollMessagesForSelectorKeys(categoryMessages, selector, keys) {
      // Get the messages whose Selector matches the provided value
      const selectorMessages = categoryMessages[selector];
      if (selectorMessages) {
         const messages = [];

         // For each key
         for (const key of keys) {

            // Add the messages whose key matches the current key
            const keyMessages = selectorMessages[key];
            if (keyMessages) {

               // Ensure each message is unique
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
    * @param {AttributeCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getCheckMessagesForAttribute(
      categoryMessages,
      parameters,
      outMessages,
   ) {

      // Get messages that apply to checks using this Attribute
      const attributeRollMessages = this._getRollMessages(
         categoryMessages,
         'attribute',
         parameters.attribute,
      );

      // Append the messages if any were found
      if (attributeRollMessages) {
         appendUnique(outMessages, attributeRollMessages);
      }
   }

   /**
    * Appends all check messages that apply to checks of a specific type (Attack, Attribute, Any, etc.) that use this
    * check's Skill.
    * @param {object} categoryMessages - All messages that apply to a specific category of checks.
    * @param {AttributeCheckParameters} parameters - Parameters for the check.
    * @param {string[]} outMessages - Array of messages to append the retrieved messages to.
    * @private
    */
   _getCheckMessagesForSkill(
      categoryMessages,
      parameters,
      outMessages,
   ) {

      // Get messages that apply to checks using this Skill
      const skillRollMessages = this._getRollMessages(
         categoryMessages, 'skill',
         parameters.skill,
      );

      // Append the messages if any were found
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

      // Get messages that apply to checks using this Resistance
      const resistanceRollMessages = this._getRollMessages(
         resistanceCheckMessages,
         'resistance',
         parameters.resistance,
      );

      // Append the messages if any were found
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

      // Get messages that apply to checks of this attack type
      const attackTypeMessages = this._getRollMessages(
         attackCheckMessages,
         'attackType',
         parameters.type,
      );

      // Append the messages if any were found
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
      // If there are attack traits
      if (parameters.attackTrait.length > 0) {

         // Get all messages that apply to the provided traits
         const attackTraits = parameters.attackTrait.map((trait) => trait.name);
         const attackTraitMessages = this._getRollMessagesForSelectorKeys(
            attackCheckMessages,
            'attackTrait',
            attackTraits);

         // Append the messages if any were found
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
      // If there are Custom Traits
      if (parameters.customTrait.length > 0) {

         // Get unique list of Custom Traits
         const customTraits = [];
         for (const trait of customTraits) {
            pushUnique(customTraits, camelize(trait.name));
         }

         // Get all messages that apply to the provided traits
         const customTraitMessages = this._getRollMessagesForSelectorKeys(
            categoryMessages,
            'customTrait',
            customTraits,
         );

         // Append the messages if any were found
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

      // If this check is a multi-attack, append all multi-attack messages
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

      // Get messages that apply to checks of this Tradition
      const spellTraditionMessages = this._getRollMessages(
         castingCheckMessages,
         'spellTradition',
         camelize(parameters.tradition),
      );

      // Append the messages if any were found
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
      // Expend resolve if appropriate
      // Double truing
      let resolveSpent = 0;
      if (parameters.doubleTraining && getSetting('autoSpendResolveDoubleTraining')) {
         resolveSpent += 1;
      }

      // Double expertise
      if (parameters.doubleExpertise && getSetting('autoSpendResolveDoubleExpertise')) {
         resolveSpent += 1;
      }

      // Resolve cost
      if (parameters.resolveCost && getSetting('autoSpendResolveChecks')) {
         resolveSpent += parameters.resolveCost;
      }

      // Spend resolve is any resolve was used
      if (resolveSpent > 0) {
         return this.spendResolve(resolveSpent, {playSound: false});
      }
   }

   /**
    * Options for applying Damage to a Character.
    * @typedef {object} DamageOptions
    * @property {boolean?} [ignoreArmor = false] Whether to Ignore Armor when applying the Damage.
    * @property {boolean?} [ineffective = false] Whether the Attack had the Ineffective trait.
    * @property {boolean?} [penetrating = false] Whether the Attack had the Penetrating trait.
    * @property {boolean?} [updateActor = true] Whether to update the Character after applying the Damage.
    * When updating multiple values, it is useful to set this to false.
    * @property {boolean?} [report = true] Whether to send a Chat Message report, provided this setting is
    * enabled. When sending multiple reports, it is useful to set this to
    * false.
    * @property {boolean?} [playSound = true] Whether to play a sound when sending the report.
    */

   /**
    * Takes a pre-initialized check, rolls it, and sends it to chat, expending resolve as appropriate;.
    * @param {TitanCheck} check - The check to send to chat.
    * @param {string[]} messages - Messages to attach to the check.
    * @returns {ChatMessage} The chat message being sent.
    * @private
    */
   async _rollCheck(check, messages) {
      // Expend resolve if appropriate
      await this._expendCheckResolve(check);

      // Evaluate the check and send it to chat
      return await check.sendToChat({
         speaker: this.parent.getSpeaker(),
         message: messages,
      });
   }

   /**
    * Data for a report detailing the Damage applied to a character.
    * @typedef {object} DamageReport
    * @property {string} type The Chat Message type (damageReport).
    * @property {boolean?} ignoreArmor Whether to the attack Ignored Armor.
    * @property {number?} damageResisted The amount of Damage resisted.
    * @property {number?} damageTaken The amount of Damage taken.
    * @property {number?} staminaLost The amount of Stamina lost.
    * @property {object?} wounds The character's Wounds, if any.
    * @property {number?} wounds.max The character's maximum Wounds, if any.
    * @property {number?} wounds.value The character's current Wounds, if any.
    * @property {number?} woundsSuffered The number of Wounds suffered, if any.
    * @property {object?} stamina The character's Stamina.
    * @property {number} stamina.max The character's maximum Stamina.
    * @property {number} stamina.value The character's current Stamina.
    * @property {object?} tags Tags applied to the damage.
    * @property {boolean?} tags.ineffective Whether the Attack had the Ineffective trait.
    * @property {boolean?} tags.penetrating Whether the Attack had the Penetrating trait.
    * @property {string} actorImg The character's image.
    * @property {string} actorName The character's name.
    */

   /**
    * Applies Damage to the Character.
    * @param {number} damage - Amount of Damage to apply.
    * @param {DamageOptions?} options - Options for applying the Damage.
    * @returns {Promise<DamageReport|void>} Results of applying the Damage.
    */
   async applyDamage(damage, options) {
      if (this.parent.isOwner && damage > 0) {

         // If the damage ignores armor then no damage is resisted.
         // Otherwise, resist damage equal to the Characters armor.
         let damageResistance = options?.ignoreArmor ? 0 : this.mod.armor.value;


         // If damage would be resisted and there are options to apply
         if (damageResistance > 0 && options) {

            // If the damage is ineffective, then damage resistance is doubled
            if (options.ineffective) {
               damageResistance *= 2;
            }

            // If the damage is penetrating, then damage resistance is reduced by 1
            if (options.penetrating) {
               damageResistance -= 1;
            }
         }

         // Cache values for the report if appropriate
         let woundsSuffered = 0;
         let staminaLost = 0;
         let damageResisted = Math.min(damage, damageResistance);

         // If any damage was taken
         const damageTaken = damageResistance < damage ? damage - damageResistance : 0;
         if (damageTaken > 0) {

            // If the Character does not have enough Stamina remaining
            const stamina = this.resource.stamina;
            const wounds = this.resource.wounds;
            woundsSuffered = 0;
            if (stamina.value < damageTaken && wounds.value < wounds.max) {

               // If the Character has a Stamina deficit >= 5, then they take 3 Wounds
               if (stamina.value + 5 <= damageTaken) {
                  woundsSuffered = 3;
               }

               // Otherwise, if the Character has a Stamina deficit >= 5, then they take 2 Wounds
               else if (stamina.value + 2 <= damageTaken) {
                  woundsSuffered = 2;
               }

               // Otherwise, they take 1 Wound
               else {
                  woundsSuffered = 1;
               }

               // Update the wounds
               wounds.value = Math.min(wounds.value + woundsSuffered, wounds.max);
            }

            // Update the Stamina
            staminaLost = Math.min(stamina.value, damageTaken);
            stamina.value -= staminaLost;

            // Update the actor document unless explicitly instructed otherwise
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

         // Cache the data to report
         const reportData = this._createDamageReportData(
            damageTaken,
            damageResisted,
            staminaLost,
            woundsSuffered,
            options,
         );

         // Report taking and resisting damage if appropriate
         if (options?.report !== false && getSetting('reportTakingDamage')) {

            // Send the report to chat
            await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
         }

         return reportData;
      }
   }

   /**
    * Options for applying Healing to a Character.
    * @typedef {object} HealingOptions
    * @property {boolean?} [updateActor = true] Whether to update the Character after applying the Healing. When
    * updating multiple values, it is useful to set this to false.
    * @property {boolean?} [report = true] Whether to send a Chat Message report, provided this setting is
    * enabled. When sending multiple reports, it is useful to set this to
    * false.
    * @property {boolean?} [playSound = true] Whether to play a sound when sending the report.
    */

   /**
    * Initializes data for a report detailing Damage applied to this character.
    * @param {number} damageTaken - The amount of Damage taken.
    * @param {number} damageResisted - The amount of Damage resisted.
    * @param {number} staminaLost - The amount of Stamina lost.
    * @param {number?} woundsSuffered - The number of Wounds suffered, if any.
    * @param {object?} options - The options for the Damage.
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
      // Initialize data
      const retVal = {
         type: 'damageReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
      };

      // Add wounds if appropriate
      if (this.resource.wounds.max > 0) {
         retVal.wounds = {
            value: this.resource.wounds.value,
            max: this.resource.wounds.max,
         };
      }

      // Add results
      // Damage taken
      if (damageTaken > 0) {
         retVal.damageTaken = damageTaken;

         // Add the stamina if any damage was taken
         retVal.stamina = {
            value: this.resource.stamina.value,
            max: this.resource.stamina.max,
         };
      }

      // Damage resisted
      if (damageResisted > 0) {
         retVal.damageResisted = damageResisted;
      }

      // Stamina lost
      if (staminaLost > 0) {
         retVal.staminaLost = staminaLost;
      }

      // Wounds suffered
      if (woundsSuffered > 0) {
         retVal.woundsSuffered = woundsSuffered;
      }

      // Add any damage options that were applied
      if (options && (options.ignoreArmor || options.ineffective || options.penetrating)) {

         // Ignore armor
         if (options.ignoreArmor && this.mod.armor.value > 0) {
            retVal.ignoredArmor = true;
         }

         // Ineffective
         if (options.ineffective) {
            retVal.tags = {};
            retVal.tags.ineffective = true;
         }

         // Penetrating
         if (options.penetrating) {
            retVal.tags ??= {};
            retVal.tags.penetrating = true;
         }
      }

      return retVal;
   }

   /**
    * Data for a report detailing the Healing applied to a character.
    * @typedef {object} HealingReport
    * @property {string} type The Chat Message type (healingReport).
    * @property {string} actorImg The character's image.
    * @property {string} actorName The character's name.
    * @property {number} staminaRestored The amount of Stamina healed.
    * @property {object} stamina The character's Stamina.
    * @property {number} stamina.value The character's current Stamina.
    * @property {number} stamina.max The character's maximum Stamina.
    * @property {object?} wounds The character's Wounds, if any.
    * @property {number?} wounds.value The character's current Wounds, if any.
    * @property {number?} wounds.max The character's maximum Wounds, if any.
    */

   /**
    * Applies Healing to the character.
    * @param {number} healing - Amount of Healing to apply.
    * @param {HealingOptions?} options - Options for restoring the Stamina.
    * @returns {Promise<HealingReport|void>} Results of applying the Healing.
    */
   async applyHealing(healing, options) {
      if (healing > 0 && this.parent.isOwner) {

         // If the actor's stamina is less than max
         const stamina = this.resource.stamina;
         if (stamina.value < stamina.max) {

            // Calculate the stamina recovered
            const staminaRestored = Math.min(healing, stamina.max - stamina.value);
            stamina.value += staminaRestored;

            // Update the actor document unless explicitly instructed otherwise
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

            // Get the report data
            const reportData = this._createHealingReportData(staminaRestored);

            // Report healing damage if appropriate
            if (options?.report !== false && getSetting('reportHealingDamage')) {

               // Send the report to chat
               await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
            }

            return reportData;
         }
      }
   }

   /**
    * Options for restoring a Character's Resolve.
    * @typedef {object} RestoreResolveOptions
    * @property {boolean?} [updateActor = true] Whether to update the Character after restoring the Resolve.
    * When updating multiple values, it is useful to set this to false.
    * @property {boolean?} [report = true] Whether to send a Chat Message report, provided this setting
    * is enabled. When sending multiple reports, it is useful to set this
    * to false.
    * @property {boolean?} [playSound = true] Whether to play a sound when sending the report.
    */

   /**
    * Initializes data for a report detailing Healing applied to this character.
    * @param {number} staminaRestored - The amount of Stamina Healed.
    * @returns {HealingReport} Populated data for the report.
    * @private
    */
   _createHealingReportData(staminaRestored) {
      // Initialize data
      const retVal = {
         type: 'healingReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
         staminaRestored: staminaRestored,
         stamina: {
            value: this.resource.stamina.value,
            max: this.resource.stamina.max,
         },
      };

      // Add wounds if appropriate
      if (this.resource.wounds.max > 0) {
         retVal.wounds = {
            value: this.resource.wounds.value,
            max: this.resource.wounds.max,
         };
      }

      return retVal;
   }

   /**
    * Options for spending a Character's Resolve.
    * @typedef {object} SpendResolveOptions
    * @property {boolean?} [updateActor = true] Whether to update the Character after spending the Resolve.
    * When updating multiple values, it is useful to set this to
    * false.
    * @property {boolean?} [report = true] Whether to send a Chat Message report, provided this setting
    * is enabled. When sending multiple reports, it is useful to set
    * this to false.
    * @property {boolean?} [playSound = true] Whether to play a sound when sending the report.
    */

   /**
    * Restores the Character's Resolve.
    * @param {number} resolveRestored - Amount of Resolve to restore.
    * @param {RestoreResolveOptions?} options - Options for restoring the Resolve.
    * @returns {Promise<void>} Returns after the Resolve has been restored.
    */
   async regainResolve(resolveRestored, options) {
      if (resolveRestored > 0 && this.parent.isOwner) {

         // Update the resolve if appropriate
         const resolve = this.resource.resolve;
         resolve.value = Math.min(resolve.max, resolve.value + resolveRestored);

         // Update the actor document unless explicitly instructed otherwise
         if (options?.updateActor !== false) {

            return this.parent.update({
               system: {
                  resource: {
                     resolve: resolve,
                  },
               },
            });
         }

         // TODO Restore resolve report
      }
   }

   /**
    * Data for a report detailing Resolve spent by the character.
    * @typedef {object} SpendResolveReport
    * @property {string} type The Chat Message type (spendResolveReport).
    * @property {string} actorImg The character's image.
    * @property {string} actorName The character's name.
    * @property {number} resolveSpent The amount of Resolve spent.
    * @property {number?} resolveShortage How much the character overspent their Resolve.
    */

   /**
    * Spends the Character's Resolve.
    * @param {number} resolveSpent - Amount of Resolve to spend.
    * @param {SpendResolveOptions?} options - Options for restoring the Resolve.
    * @returns {Promise<SpendResolveReport|void>} Results of spending Resolve.
    */
   async spendResolve(resolveSpent, options) {
      if (resolveSpent > 0 && this.parent.isOwner) {

         // Update the resolve if appropriate
         const resolve = this.resource.resolve;
         const initialResolve = resolve.value;
         if (resolve.value >= resolveSpent) {
            resolve.value = Math.max(0, resolve.value - resolveSpent);

            // Update the actor document unless explicitly instructed otherwise
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

         // Get the report data
         const reportData = this._createSpendResolveReportData(resolveSpent, initialResolve);

         // Report regaining resolve if appropriate
         if (options?.report !== false && getSetting('reportSpendingResolve')) {
            await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
         }

         return reportData;
      }
   }

   /**
    * Options for Rending the character's Armor.
    * @typedef {object} RendOptions
    * @property {boolean?} [magical = false] Whether the rending Attack was magical.
    * @property {boolean?} [updateArmor = true] Whether to update the Armor after applying the Rend. When updating
    * multiple values, it is useful to set this to false.
    * @property {boolean?} [report = true] Whether to send a Chat Message report, provided this setting is
    * enabled. When sending multiple reports, it is useful to set this to
    * false.
    * @property {boolean?} [playSound = true] Whether to play a sound when sending the report.
    */

   /**
    * Initializes data for a report detailing Resolve spent by the character.
    * @param {number} resolveSpent - The amount of Resolve spent.
    * @param {number} initialResolve - The initial Resolve held by this character.
    * @returns {SpendResolveReport} Populated data for the report.
    * @private
    */
   _createSpendResolveReportData(resolveSpent, initialResolve) {
      // Initialize data
      const retVal = {
         type: 'spendResolveReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
         resolveSpent: resolveSpent,
         resolve: {
            value: this.resource.resolve.value,
            max: this.resource.resolve.max,
         },
      };

      // Report if the character was short on resolve
      if (initialResolve < resolveSpent) {
         retVal.resolveShortage = resolveSpent - initialResolve;
      }

      return retVal;
   }

   /**
    * Data for a report detailing Rend applied to the character's Armor.
    * @typedef {object} RendReport
    * @property {string} type The Chat Message type (rendReport).
    * @property {string} actorImg The character's image.
    * @property {string} actorName The character's name.
    * @property {string} armorImg The armor's image.
    * @property {string} armorName The armor's name.
    * @property {number?} armorLost The amount of Armor lost.
    */

   /**
    * Rends the Character's Armor.
    * @param {number} rend - Amount of Rend to apply.
    * @param {RendOptions?} options - Options for applying the Rend.
    * @returns {Promise<RendReport|void>} Resolves of Rending the Armor.
    */
   async applyRend(rend, options) {
      if (rend > 0 && this.parent.isOwner) {

         // If this character has armor
         const armor = this.getEquippedArmor();
         if (armor && armor.system.armor.value > 0) {

            // Check if the armor is Magical
            let isArmorMagical = false;
            for (const trait of armor.system.trait) {
               if (trait.name === 'magical') {
                  isArmorMagical = true;
                  break;
               }
            }

            // If armor is magical, and the attack is not magical, then the rend should be resisted
            const armorLost = (!isArmorMagical || options?.magical !== true) ?
               Math.min(armor.system.armor.value, rend) :
               0;

            // Otherwise, decrease the armor by the rend amount
            if (armorLost > 0) {
               armor.system.armor.value -= armorLost;

               // Update the armor document unless explicitly instructed otherwise
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

            // Get the report data
            const reportData = this._createRendReportData(armorLost, armor);

            // Report rending armor if appropriate
            if (options?.report !== false && getSetting('reportRendingArmor')) {

               // Send the report to chat
               await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
            }

            return reportData;
         }
      }
   }

   /**
    * Options for Repairing the character's Armor.
    * @typedef {object} RepairsOptions
    * @property {boolean?} [updateArmor = true] Whether to update the Armor after applying the repairs.
    * When updating multiple values, it is useful to set this to false.
    * @property {boolean?} [report = true] Whether to send a Chat Message report, provided this setting is
    * enabled. When sending multiple reports, it is useful to set this to
    * false.
    * @property {boolean?} [playSound = true] Whether to play a sound when sending the report.
    */

   /**
    * Initializes data for a report detailing Rend applied to this character.
    * @param {number} armorLost - The amount of Armor lost.
    * @param {TitanItem} armor - Reference to the Armor being Rent.
    * @returns {RendReport} Populated data for the report.
    * @private
    */
   _createRendReportData(armorLost, armor) {
      // Initialize data
      const retVal = {
         type: 'rendReport',
         actorImg: this.parent.img,
         actorName: this.parent.name,
         armorImg: armor.img,
         armorName: armor.name,
      };

      // If any armor was lost, add the armor lost and armor value to the chat message
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
    * Data for a report detailing Repairs made to the character's Armor.
    * @typedef {object} RepairsReport
    * @property {string} type The Chat Message type (repairsReport).
    * @property {string} actorImg The character's image.
    * @property {string} actorName The character's name.
    * @property {string} armorImg The armor's image.
    * @property {string} armorName The armor's name.
    * @property {number} armorRepaired The amount of Armor repaired.
    */

   /**
    * Repairs the Character's Armor.
    * @param {number} repairs - Amount of repairs to apply.
    * @param {RepairsOptions?} options - Options for applying the repairs.
    * @returns {Promise<RepairsReport|void>} Returns after the repairs have been applied.
    */
   async applyRepairs(repairs, options) {
      if (repairs > 0 && this.parent.isOwner) {

         // If this character has damaged armor
         const armor = this.getEquippedArmor();
         if (armor && armor.system.armor.value < armor.system.armor.max) {

            // Apply the repairs
            const armorRepaired = Math.min(repairs, armor.system.armor.max - armor.system.armor.value);
            armor.system.armor.value += armorRepaired;

            // Update the armor document unless explicitly instructed otherwise
            if (options?.updateArmor !== false) {
               await armor.update({
                  system: {
                     armor: {
                        value: armor.system.armor.value,
                     },
                  },
               });
            }

            // Get the report data
            const reportData = this._createRepairsReportData(armorRepaired, armor);

            // Report repairing  armor if appropriate
            if (options?.report !== false && getSetting('reportRepairingArmor')) {

               // Send the report to chat
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
      // Initialize data
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
      if (this.parent.isOwner &&
         this.parent.items.some((item) => item.type === 'effect' && item.system.isExpired)) {

         // Remove effects if removal does not need to be confirmed
         if (!shouldConfirmDeletingItems()) {
            await this.removeExpiredEffects();
         }

         // Otherwise, create a dialog to confirm removing the effects
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
      if (this.parent.isOwner) {
         const expiredEffects = this.getExpiredEffectItems();
         if (expiredEffects) {
            for (const effect of expiredEffects) {
               await this._deleteItem(effect);
            }
         }
      }
   }

   /**
    * Removes all combat effects from the Character, including Effect items and Static Mods, while also restoring
    * Resolve to its maximum value.
    * @param {object?} options - Options for the operation.
    * @param {boolean?} options.updateActor - Whether to update the actor after performing the operation.
    * @param {boolean?} options.report - Whether to send a Chat Message report after performing the operation.
    * @returns {Promise<void>}
    */
   async removeCombatEffects(options) {
      if (this.parent.isOwner) {
         // Delete all combat effect items
         const combatEffects = this.parent.items.filter((item) => item.system.isCombatEffect);
         for (const effect of combatEffects) {
            await this._deleteItem(effect);
         }

         // Reset static mods
         // Attribute
         for (const value of Object.values(this.attribute)) {
            value.mod.static = 0;
         }

         // Resistances
         for (const value of Object.values(this.resistance)) {
            value.mod.static = 0;
         }

         // Skills
         for (const value of Object.values(this.skill)) {
            value.training.mod.static = 0;
            value.expertise.mod.static = 0;
         }

         // Ratings
         for (const value of Object.values(this.rating)) {
            value.mod.static = 0;
         }

         // Speed
         for (const value of Object.values(this.speed)) {
            value.mod.static = 0;
         }

         // Mod
         for (const value of Object.values(this.mod)) {
            value.mod.static = 0;
         }

         // Restore resolve
         this.resource.resolve.value = this.resource.resolve.max;

         // Update the actor unless explicitly instructed otherwise.
         if (options?.updateActor !== false) {
            await this.parent.update({
               system: {
                  attribute: this.attribute,
                  resistance: this.resistance,
                  skill: this.skill,
                  resource: this.resource,
                  rating: this.rating,
                  speed: this.speed,
                  mod: this.mod,
               },
            });
         }

         // Send a chat message report if appropriate
         if (getSetting('reportResting') && options?.report !== false) {

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
    * Performs a Short Rest.
    * Removes all combat effects from the Character, including Effect items and Static Mods.
    * Restores Stamina and Resolve to their maximum value.
    * @param {object?} options - Options for the operation.
    * @param {boolean?} options.updateActor - Whether to update the actor after performing the operation.
    * @param {boolean?} options.report - Whether to send a Chat Message report after performing the operation.
    * @returns {Promise<void>}
    */
   async shortRest(options) {
      if (this.parent.isOwner) {
         // Restore stamina
         this.resource.stamina.value = this.resource.stamina.max;

         // Remove combat effects updates the actor
         await this.removeCombatEffects({
            report: false,
            updateActor: options?.updateActor !== false,
         });

         // Send a chat message report if appropriate
         if (getSetting('reportResting') && options?.report !== false) {

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
    * Performs a Long Rest.
    * Removes all combat effects from the Character, including Effect items and Static Mods.
    * Restores Stamina and Resolve to their maximum value.
    * Restores Wounds equal to the character's Wound Regain.
    * @param {object?} options - Options for the operation.
    * @param {boolean?} options.updateActor - Whether to update the actor after performing the operation.
    * @param {boolean?} options.report - Whether to send a Chat Message report after performing the operation.
    * @returns {Promise<void>}
    */
   async longRest(options) {
      if (this.parent.isOwner) {

         // Decrease wounds
         let woundsHealed = 0;
         const wounds = this.resource.wounds;
         if (wounds.value > 0) {
            woundsHealed = Math.min(getSetting('woundsBaseRegain') + this.mod.woundRegain.value, wounds.value);
            wounds.value -= woundsHealed;
         }

         // Short rest updates the actor
         await this.shortRest({
            report: false,
            updateActor: options?.updateActor !== false,
         });

         // Send a chat message report if appropriate
         if (getSetting('reportResting') && options?.report !== false) {

            const reportData = {
               type: 'longRestReport',
               actorImg: this.parent.img,
               actorName: this.parent.name,
            };

            // Add wounds healed if appropriate
            if (woundsHealed > 0) {
               reportData.woundsHealed = woundsHealed;
               reportData.wounds = {
                  value: wounds.value,
                  max: wounds.max,
               };
            }

            // Send the report to chat
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
         if (getSetting('autoDecreaseEffectDuration')) {
            let initiativeEffects = this.parent.items.filter((item) =>
               item.type === 'effect' && item.system.duration.type === 'initiative');
            if (initiativeEffects) {

               // Calculate which effects to advance
               let effectsToAdvance;

               // If this turn is the start of a new round,
               // advance effects with an initiative lesser or equal to the current turn's initiative,
               // or greater than the previous turn's initiative
               if (isNewRound) {
                  effectsToAdvance = initiativeEffects.filter((effect) => {
                     const initiative = effect.system.duration.initiative;
                     return (initiative < previousInitiative || initiative >= currentInitiative);
                  });
               } else {
                  // If this turn is the start of a new round,
                  // advance effects with an initiative lesser or equal to the current turn's initiative,
                  // or greater than the previous turn's initiative
                  effectsToAdvance = initiativeEffects.filter((effect) => {
                     const initiative = effect.system.duration.initiative;
                     return (initiative < previousInitiative && initiative >= currentInitiative);
                  });
               }

               // If there are any effects to advance
               if (effectsToAdvance.length > 0) {
                  let expiredEffects = [];

                  // Decrease the duration of each effect by 1 round
                  for (const effect of effectsToAdvance) {
                     effect.system.duration.remaining -= 1;
                     await effect.update({
                        system: {
                           duration: {
                              remaining: effect.system.duration.remaining,
                           },
                        },
                     });

                     // Add the effect to the container of expired effects if necessary
                     if (effect.system.duration.remaining <= 0) {
                        expiredEffects.push(effect);
                     }
                  }

                  // If there are any expired effects
                  if (expiredEffects.length > 0) {
                     const reportData = {};

                     // Get the report data for each expired effect if appropriate
                     const reportEffects = getSetting('reportEffects');
                     const autoRemoveExpiredEffects = getSetting('autoRemoveExpiredEffects');
                     const shouldSendReport = (reportEffects || autoRemoveExpiredEffects === 'showButton');
                     if (shouldSendReport) {
                        reportData.effects = {
                           expired: this._getEffectReportData(expiredEffects),
                        };
                     }

                     // Process the expired effects
                     await this._processExpiredEffects(autoRemoveExpiredEffects, expiredEffects, reportData);


                     // Send the report to chat if appropriate
                     if (shouldSendReport) {

                        // Prepare the report data
                        reportData.type = 'effectsExpiredReport';
                        reportData.actorName = this.parent.name;
                        reportData.actorImg = this.parent.img;
                        reportData.expiredEffectsRemoved = autoRemoveExpiredEffects === 'enabled';

                        // Send the report to chat
                        return this._whisperOwners(reportData, this._getTurnReportUserID(), true);
                     }
                  }
               }
            }
         }
      }
   }

   /**
    * Called at the Start of this Character's Turn in combat to open the character's sheet,
    * update Turn-Start effects, and send Turn-Start messages, if appropriate.
    * @returns {Promise<void>}
    */
   async onTurnStart() {
      // Handle opening the sheet if appropriate.
      // If the current user a GM...
      if (game.user.isGM) {
         switch (getSetting('autoOpenCharacterSheetsGM')) {

            // If set for NPCs only, open the sheet only if it has no player owners
            case 'npcsOnly': {
               if (!this.parent.hasPlayerOwner) {
                  this.parent.sheet.render(true);
               }
               break;
            }

            // If set for pcs only, open the sheet only if it has player owners
            case 'pcsOnly': {
               if (this.parent.hasPlayerOwner) {
                  this.parent.sheet.render(true);
               }
               break;
            }

            // If set for all, open the sheet
            case 'all': {
               this.parent.sheet.render(true);
               break;
            }

            default: {
               break;
            }
         }
      } else if (this.parent.isOwner && getSetting('autoOpenCharacterSheetsPlayer')) {
         // If the current user is a player and an owner,
         // open the sheet if auto open sheets is enabled for players.
         this.parent.sheet.render(true);
      }

      // Perform start-of-turn updates
      if (isCurrentUserBestOwner(this.parent)) {

         // Initialize variables
         const reportData = {};
         let shouldUpdateActor = false;

         // Calculate healing or damage
         if (await this._calculateTurnHealingAndDamage(reportData, 'turnStart')) {
            shouldUpdateActor = true;
         }

         // Calculate resolve regain
         if (await this._calculateResolveRegain(reportData)) {
            shouldUpdateActor = true;
         }

         // Update actor if appropriate
         if (shouldUpdateActor) {
            await this.parent.update({
               system: {
                  resource: this.resource,
               },
            });
         }

         // Get turn messages
         const message = this.rulesElementsCache?.turnMessage?.turnStart;
         if (message) {
            reportData.message = foundry.utils.deepClone(message);
         }

         // Update the duration of turn effects
         await this._decreaseTurnEffectDuration(reportData, 'turnStart');

         // Calculate whether to report effects and whether to remove expired effects
         const reportEffects = getSetting('reportEffects');
         const autoRemoveExpiredEffects = getSetting('autoRemoveExpiredEffects');
         const expiredEffects = this.getExpiredEffectItems();

         // If report effects is true, add all effects to the report
         if (reportEffects) {

            // Get sorted effects
            const sortedEffects = this.getSortedEffectItems();
            if (sortedEffects) {
               reportData.effects = {};

               // Add effects to the report
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

            // Get conditions
            let conditions = this.getConditions();
            if (conditions) {

               // Add conditions to the report
               conditions = conditions.sort((a, b) => sort(a.name, b.name));
               reportData.conditions = conditions.map((condition) => {
                  return {
                     label: condition.name,
                     img: condition.img,
                     description: condition.flags.titan.description,
                  };
               });
            }
         }

         // Otherwise, add expired effects to the report if we need to show a button for removing them
         else if (expiredEffects && autoRemoveExpiredEffects === 'showButton') {
            reportData.effects = {
               expired: this._getEffectReportData(expiredEffects),
            };
         }

         // Process expired effects
         await this._processExpiredEffects(autoRemoveExpiredEffects, expiredEffects, reportData);


         // Send a report if appropriate
         if (Object.keys(reportData).length > 0) {

            // Prepare the report data
            reportData.type = 'turnStartReport';
            reportData.actorImg = this.parent.img;
            reportData.actorName = this.parent.name;

            await this._whisperOwners(reportData, this._getTurnReportUserID(), true);

            return reportData;
         }
      }
   }

   /**
    * Called at the End of this Character's Turn in combat to update Turn-End effects, and send Turn end messages,
    * if appropriate.
    * @returns {Promise<void>}
    */
   async onTurnEnd() {
      // Perform end-of-turn updates
      if (isCurrentUserBestOwner(this.parent)) {

         // Initialize variables
         const reportData = {};
         let shouldUpdateActor = false;

         // Calculate healing or damage
         if (await this._calculateTurnHealingAndDamage(reportData, 'turnEnd')) {
            shouldUpdateActor = true;
         }

         // Update actor if appropriate
         if (shouldUpdateActor) {
            await this.parent.update({
               system: {
                  resource: this.resource,
               },
            });
         }

         // Get turn messages
         const message = this.rulesElementsCache?.turnMessage?.turnEnd;
         if (message) {
            reportData.message = foundry.utils.deepClone(message);
         }

         // Update the duration of turn effects
         await this._decreaseTurnEffectDuration(reportData, 'turnEnd');

         // Calculate whether to report effects and whether to remove expired effects
         const reportEffects = getSetting('reportEffects');
         const autoRemoveExpiredEffects = getSetting('autoRemoveExpiredEffects');
         const expiredEffects = this.getExpiredEffectItems();

         // Otherwise, add expired effects to the report if appropriate
         if (expiredEffects && (reportEffects || autoRemoveExpiredEffects === 'showButton')) {
            reportData.effects = {
               expired: this._getEffectReportData(expiredEffects),
            };
         }

         // Process expired effects
         await this._processExpiredEffects(autoRemoveExpiredEffects, expiredEffects, reportData);

         // Send a report if appropriate
         if (Object.keys(reportData).length > 0) {

            // Prepare chat context
            reportData.type = 'turnEndReport';
            reportData.actorName = this.parent.name;
            reportData.actorImg = this.parent.img;

            // Send the report to chat
            await this._whisperOwners(reportData, this._getTurnReportUserID(), true);

            return reportData;
         }
      }
   }

   /**
    * Base report Data for an Effect item.
    * @typedef {object} EffectReportData
    * @property {string} label The name of the Effect item.
    * @property {string} img The image used by the Effect item.
    * @property {string?} description The description of the Effect item, if appropriate.
    */

   /**
    * Decreases the duration of the turn effects, removes expired effects,
    * and logs report data if appropriate.
    * @param {object} reportData - Object for storing any necessary data for a message report.
    * @param {string} selector - Used to determine whether we are checking for turnStart Effects, or turnEnd Effects.
    * @private
    */
   async _decreaseTurnEffectDuration(reportData, selector) {
      // Decrease effect duration if appropriate
      if (getSetting('autoDecreaseEffectDuration')) {
         const turnEffects = this.parent.items.filter((item) =>
            item.type === 'effect' && item.system.duration.type === selector);
         if (turnEffects.length > 0) {
            for (const effect of turnEffects) {
               if (effect.system.duration.remaining > 0) {
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
   }


   /**
    * Report Data for a Turn Effect item.
    * @typedef {object} TurnEffectReportData
    * @property {string} label The name of the Effect item.
    * @property {string} img The image used by the Effect item.
    * @property {string?} description The description of the Effect item, if appropriate.
    * @property {number} remaining The remaining turns for the Effect item.
    */

   /**
    * Retrieves the Effect Report Data for an array of Effect items.
    * @param {TitanItem[]} effectItems - The Effect items to get report data for.
    * @returns {EffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getEffectReportData(effectItems) {
      return effectItems.sort((a, b) => sort(a.name, b.name)).map((effectItem) => {
         const retVal = {
            label: effectItem.name,
            img: effectItem.img,
         };

         // Add the effect description if it is not blank
         if (!isHTMLBlank(effectItem.system.description)) {
            retVal.description = effectItem.system.description;
         }

         return retVal;
      });
   }

   /**
    * Report Data for a Turn Effect item.
    * @typedef {object} InitiativeEffectReportData
    * @property {string} label The name of the Effect item.
    * @property {string} img The image used by the Effect item.
    * @property {string?} description The description of the Effect item, if appropriate.
    * @property {number} remaining The remaining turns for the Effect item.
    * @property {float} initiative The initiative count on which the Effect duration is reduced.
    */

   /**
    * Retrieves the Effect Report Data for an array of Turn Start or Turn End Effect items.
    * @param {TitanItem[]} effectItems - The Effect items to get report data for.
    * @returns {TurnEffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getTurnEffectReportData(effectItems) {
      return effectItems.sort((a, b) => sort(a.name, b.name)).map((effectItem) => {
         const retVal = {
            label: effectItem.name,
            img: effectItem.img,
            remaining: effectItem.system.duration.remaining,
         };

         // Add the effect description if it is not blank
         if (!isHTMLBlank(effectItem.system.description)) {
            retVal.description = effectItem.system.description;
         }

         return retVal;
      });
   }

   /**
    * Report Data for a Custom Effect item.
    * @typedef {object} CustomEffectReportData
    * @property {string} label The name of the Effect item.
    * @property {string} img The image used by the Effect item.
    * @property {string?} description The description of the Effect item, if appropriate.
    * @property {number} remaining The remaining turns for the Effect item.
    * @property {string} custom Custom duration of the Effect item.
    */

   /**
    * Retrieves the Effect Report Data for an array of Initiative Effect items.
    * @param {TitanItem[]} effectItems - The Effect items to get report data for.
    * @returns {InitiativeEffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getInitiativeEffectReportData(effectItems) {
      return effectItems.sort((a, b) => sort(a.name, b.name)).map((effectItem) => {
         const retVal = {
            label: effectItem.name,
            img: effectItem.img,
            remaining: effectItem.system.duration.remaining,
            initiative: effectItem.system.duration.initiative,
         };

         // Add the effect description if it is not blank
         if (!isHTMLBlank(effectItem.system.description)) {
            retVal.description = effectItem.system.description;
         }

         return retVal;
      });
   }

   /**
    * Retrieves the Effect Report Data for an array of Initiative Effect items.
    * @param {TitanItem[]} effectItems - The Effect items to get report data for.
    * @returns {CustomEffectReportData[]} Array of objects containing the report data for the effect.
    */
   _getCustomEffectReportData(effectItems) {
      return effectItems.sort((a, b) => sort(a.name, b.name)).map((effectItem) => {
         const retVal = {
            label: effectItem.name,
            img: effectItem.img,
            remaining: effectItem.system.duration.remaining,
            custom: effectItem.system.duration.custom,
         };

         // Add the effect description if it is not blank
         if (!isHTMLBlank(effectItem.system.description)) {
            retVal.description = effectItem.system.description;
         }

         return retVal;
      });
   }

   /**
    * Processes effects that have expired, either by removing them from the character, or adding a button to the
    * report data.
    * @param {string} autoRemoveExpiredEffects - The setting for automatically removing expired effects.
    * @param {TitanItem[]} expiredEffects - The expired effects items for this character.
    * @param {object} reportData - Report data object for storing the result of removing expired
    * effects, such as whether they were removed, or whether a button
    * should be shown to remove them.
    * @returns {Promise<void>}
    */
   async _processExpiredEffects(autoRemoveExpiredEffects, expiredEffects, reportData) {
      if (expiredEffects && autoRemoveExpiredEffects !== 'disabled') {
         switch (autoRemoveExpiredEffects) {
            // Delete each expired effect if appropriate
            case 'enabled': {
               reportData.expiredEffectsRemoved = true;
               for (const effect of expiredEffects) {
                  await this._deleteItem(effect);
               }
               break;
            }

            // Otherwise, log that expired effects were not removed
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
      let shouldUpdateActor = false;

      // If any Fast Healing or Persistent Damage rules elements affect this character
      const rulesElements = this.rulesElementsCache;
      if (rulesElements && (rulesElements.fastHealing || rulesElements.persistentDamage)) {

         // Cache the Fast Healing and Persistent Damage rules elements for this selector
         const fastHealingElements = rulesElements.fastHealing?.[selector];
         const persistentDamageElements = rulesElements.persistentDamage?.[selector];

         // Determine whether to auto apply dealing and damage
         const autoApplyHealing = getSetting('autoApplyFastHealing');
         const autoApplyDamage = getSetting('autoApplyPersistentDamage');

         // Determine whether healing and damage are already confirmed
         const healingConfirmed = autoApplyHealing === 'enabled';
         const damageConfirmed = autoApplyDamage === 'enabled';

         // Calculate the total healing and damage
         let healing = 0;
         let damage = 0;
         let turnStaminaMod = 0;

         // Get the amount of fast healing to be applied
         if (fastHealingElements && autoApplyHealing !== 'disabled') {
            healing = getSumOfObjectValues(fastHealingElements);
            if (healingConfirmed) {
               turnStaminaMod += healing;
            }
         }

         // Get the amount of persistent damage to apply
         if (persistentDamageElements && autoApplyDamage !== 'disabled') {
            damage = getSumOfObjectValues(persistentDamageElements);
            if (damageConfirmed) {
               turnStaminaMod -= damage;
            }
         }

         // If there is any healing or damage...
         if (healing > 0 || damage > 0) {

            // Apply healing if appropriate
            if (turnStaminaMod > 0 && this.resource.stamina.value < this.resource.stamina.max) {
               await this.applyHealing(turnStaminaMod, {updateActor: false, report: false});
               shouldUpdateActor = true;
            }

            // Otherwise, apply damage if appropriate
            else if (turnStaminaMod < 0) {
               await this.applyDamage(-turnStaminaMod,
                  {updateActor: false, ignoreArmor: true, report: false});
               shouldUpdateActor = true;
            }

            // If we should report the healing and damage, or if we need to show a button for either...
            if ((healing > 0 &&
                  (this.resource.stamina.value < this.resource.stamina.max || damage > 0) &&
                  (getSetting('reportHealingDamage') || autoApplyHealing === 'showButton')) ||
               (damage > 0 && (getSetting('reportTakingDamage') || autoApplyDamage === 'showButton'))) {

               // Add the Fast Healing data
               if (healing > 0) {
                  reportData.fastHealing = foundry.utils.deepClone(fastHealingElements);
                  reportData.fastHealing.total = healing;
                  reportData.fastHealing.confirmed = healingConfirmed;
               }

               // Add the Persistent Damage data
               if (damage > 0) {
                  reportData.persistentDamage = foundry.utils.deepClone(persistentDamageElements);
                  reportData.persistentDamage.total = damage;
                  reportData.persistentDamage.confirmed = damageConfirmed;
               }

               // Add stamina
               reportData.stamina = {
                  max: this.resource.stamina.max,
                  value: this.resource.stamina.value,
               };

               // Add wounds if appropriate
               if (damage > 0 && this.resource.wounds.max > 0) {
                  reportData.wounds = {
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
      let shouldUpdateActor = false;

      // Determine whether to auto-regain resolve
      const autoRegainResolve = getSetting('autoRegainResolve');
      if (autoRegainResolve !== 'disabled') {

         // If the resolve value is below max
         const resolve = this.resource.resolve;
         if (resolve.value < resolve.max) {

            // If any resolve will be regained
            const maxResolveRegained = getSetting('resolveBaseRegain') + this.mod.resolveRegain.value;
            if (maxResolveRegained > 0) {

               // Update the resources if appropriate
               const confirmed = autoRegainResolve === 'enabled';
               if (confirmed) {
                  await this.regainResolve(maxResolveRegained, {
                     updateActor: false,
                     report: false,
                  });
                  shouldUpdateActor = true;
               }

               // Update the report data if appropriate
               if (getSetting('reportRegainingResolve') || !confirmed) {
                  reportData.resolve = {
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
    * Sends a private message to the character's owners.
    * @param {object} messageData - Object containing the message data.
    * @param {string} userId - The ID of the user sending the message.
    * @param {boolean} [playSound] - Whether to play a sound when sending the message.
    * @returns {Promise<void>}
    * @private
    */
   async _whisperOwners(messageData, userId, playSound = true) {
      // Initialize message
      const message = {
         user: userId,
         speaker: this.parent.getSpeaker(),
         type: CONST.CHAT_MESSAGE_STYLES.OTHER,
         whisper: getOwners(this.parent),
         flags: {
            titan: messageData,
         },
      };

      // Add sound if appropriate
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
      if (this.parent.isOwner) {

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
    * Toggles the equipped state of an item.
    * If the item is Armor or a Shield, it will either equip it or un-equip it to this character.
    * Otherwise, the Equipped property will be toggled on it.
    * If the item has an "equipped" property in the "system" object, it will update the value of "equipped".
    * @param {string} itemId - The ID of the item to equip or un-equip.
    * @returns {Promise<void>}
    */
   async toggleEquipped(itemId) {
      if (this.parent.isOwner) {

         // Update the item if the item is valid.
         const item = this.parent.items.get(itemId);
         if (item) {

            // If the item is Armor
            if (item.type === 'armor') {

               // Un-equip the item if equipped
               if (this.equipped.armor === itemId) {
                  await this.unEquipArmor();
               }

               // Equip the item if unequipped
               else {
                  await this.equipArmor(itemId);
               }
            }

            // If the item is a Shield
            else if (item.type === 'shield') {

               // Un-equip the item if equipped
               if (this.equipped.shield === itemId) {
                  await this.unEquipShield();
               }

               // Equip the item if unequipped
               else {
                  await this.equipShield(itemId);
               }
            }

            // If the item has the Equipped property, toggle it
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
    * Toggles the active state of an Effect Item.
    * @param {string} itemId - The ID of the item to toggle the active state for.
    * @returns {Promise<void>}
    */
   async toggleEffectActive(itemId) {
      if (this.parent.isOwner) {

         // Update the item if valid
         const item = this.parent.items.get(itemId);
         if (item && item.type === 'effect') {
            item.system.active = !item.system.active;
            await item.update({
               system: {
                  active: item.system.active,
               },
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
      if (this.parent.isOwner) {

         // Update the equipped armor on this character if the armor item is valid
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
      if (this.parent.isOwner) {

         // Update the equipped armor on this character
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
      if (this.parent.isOwner) {

         // Update the equipped shield on this character if the shield item is valid
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
      if (this.parent.isOwner) {

         // Update the equipped shield on this character
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
    * Adds an item of the inputted type to the Character.
    * @param {string} type - The type of item to add.
    */
   async addItem(type) {
      if (this.parent.isOwner) {
         // Get the desired name
         let desiredName = localize(`new${capitalize(type)}`);

         // Add a number if necessary
         const duplicateNames = this.parent.items.filter((item) => item.name.includes(desiredName));
         if (duplicateNames.length > 0) {
            desiredName += ` (${duplicateNames.length})`;
         }

         await this.parent.createEmbeddedDocuments('Item', [
            {
               name: desiredName,
               type: type,
            },
         ]);
      }
   }

   /**
    * Requests for an item to be deleted from the Character.
    * @param {string} itemId - The ID of the item being deleted.
    */
   async requestItemDeletion(itemId) {
      if (this.parent.isOwner) {

         // If the deletion does not need to be confirmed, then delete the item
         if (!shouldConfirmDeletingItems()) {
            await this.safeDeleteItem(itemId);
         }

         // Otherwise, confirm deleting the item
         const item = this.parent.items.get(itemId);
         if (item) {
            new ConfirmDeleteItemDialog(this.parent, item).render(true);
         }
      }
   }

   /**
    * Deletes an item from the Character, while ensuring that this is a valid operation, and un-equipping the item
    * if appropriate.
    * @param {string} itemId - The ID of the item to delete.
    * @returns {Promise<void>}
    */
   async safeDeleteItem(itemId) {
      if (this.parent.isOwner) {
         // Ensure the item is valid
         const item = this.parent.items.get(itemId);
         if (item) {

            // Perform type specific deleting
            switch (item.type) {

               // Un-equip armor before deletion
               case 'armor': {
                  if (this.equipped.armor === itemId) {
                     await this.unEquipArmor();
                  }
                  break;
               }

               // Un-equip should before deletion
               case 'shield': {
                  if (this.equipped.armor === itemId) {
                     await this.unEquipShield();
                  }
                  break;
               }
               default: {
                  break;
               }
            }

            await this._deleteItem(item);
         }
      }
   }

   /**
    * Deletes the given item.
    * Assumes the item is still valid when the deletion is called.
    * @param {TitanItem} item - The item to be deleted.
    * @private
    */
   async _deleteItem(item) {
      // Delete the item
      await item.safeDelete();

      // Delete the item from the sheet state if appropriate
      const sheet = this.parent._sheet;
      if (sheet) {
         sheet.deleteItem(item._id);
      }
   }

   /**
    * Retrieves the user ID to associate with turn reports.
    * This is the UD of the Best Player Owner.
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
      // Calculate the amount of XP spent=
      let spentXp = 0;

      // Add cost of current attribute
      for (const attribute of Object.values(this.attribute)) {
         spentXp += this._calculateAttributeXPCost(attribute.baseValue);
      }

      // Add cost of current skill
      for (const skill of Object.values(this.skill)) {
         spentXp += this._calculateSkillXPCost(skill.training.baseValue);
         spentXp += this._calculateSkillXPCost(skill.expertise.baseValue);
      }

      // Add cost of spells and abilities
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

   /**
    * Calculates the total XP cost for a Skill at a given rank.
    * @param {number} value - The rank of the Skill.
    * @returns {number} The total XP cost of the Skill.
    */
   _calculateSkillXPCost(value) {
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
}
