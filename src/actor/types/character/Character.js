import { clamp, localize, getSetting, getCheckOptions, confirmDeletingItems, documentSort } from '~/helpers/Utility.js';
import { applyFlatModifier } from '~/rules-element/FlatModifier.js';
import { applyMulBase } from '~/rules-element/MulBase.js';
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

export default class TitanCharacterComponent extends TitanTypeComponent {

   // Apply rules element bindings
   applyFlatModifier = applyFlatModifier.bind(this);
   applyMulBase = applyMulBase.bind(this);

   _getSpentXP() {
      const systemData = this.parent.system;
      // Calculate the amount of XP spent
      let spentXp = 0;

      // Add cost of current attribute
      for (const [key, attribute] of Object.entries(systemData.attribute)) {
         spentXp += this._getAttributeXPCost(attribute.baseValue);
      }

      // Add cost of current skill
      for (const [key, skill] of Object.entries(systemData.skill)) {
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
      this._applyRulesElements();
      this._applyStatusEffects();
      this._applyEquipmentSlots();
      this._applyMods();
      this._clampResources();

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
         Math.ceil(systemData.attribute.body.baseValue / 2);

      // Resilience = (Body + (Soul/2) rounded up)
      systemData.resistance.resilience.baseValue =
         systemData.attribute.body.baseValue +
         Math.ceil(systemData.attribute.soul.baseValue / 2);

      // Willpower = (Soul + (Mind/2))
      systemData.resistance.willpower.baseValue =
         systemData.attribute.soul.baseValue +
         Math.ceil(systemData.attribute.mind.baseValue / 2);
   }

   _calculateBaseResources() {
      const systemData = this.parent.system;
      const totalBaseAttributeValue =
         systemData.attribute.body.baseValue +
         systemData.attribute.mind.baseValue +
         systemData.attribute.soul.baseValue;

      // Calculate base resource values
      // Stamina = Total Attribute Mod
      systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaMultiplier')), 1);

      // Resolve = Soul / 2 rounded up
      systemData.resource.resolve.maxBase = Math.ceil(Math.ceil(systemData.attribute.soul.baseValue * getSetting('resolveMultiplier')), 1);

      // Wounds = Total Attribute mod / 2 rounded up
      systemData.resource.wounds.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('woundsMultiplier')), 1);
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
      for (const [key, attribute] of Object.entries(systemData.attribute)) {
         resetMods(attribute.mod);
      }

      // Skills
      for (const [key, skill] of Object.entries(systemData.skill)) {
         resetMods(skill.training.mod);
         resetMods(skill.expertise.mod);
      }

      // Resource
      for (const [key, resource] of Object.entries(systemData.resource)) {
         resetMods(resource.mod);
      }

      // Resistance
      for (const [key, resistance] of Object.entries(systemData.resistance)) {
         resetMods(resistance.mod);
      }

      // Rating
      for (const [key, rating] of Object.entries(systemData.rating)) {
         resetMods(rating.mod);
      }

      // Speed
      for (const [key, speed] of Object.entries(systemData.speed)) {
         resetMods(speed.mod);
      }

      // Mod
      for (const [key, mod] of Object.entries(systemData.mod)) {
         resetMods(mod.mod);
      }

      // Status effects
      for (let [key, status] of Object.entries(systemData.statusEffect)) {
         status = false;
      }

      return;
   }

   _applyRulesElements() {
      // Get all the rules elements
      let rulesElements = [];
      this.parent.items.forEach((item) => {
         if (item.system.rulesElement && item.system.rulesElement.length > 0) {
            // Equipment, armor, shields, and weapons only apply elements if they are equipped
            switch (item.type) {
               case 'armor': {
                  if (this.parent.system.equipped.armor === item._id) {
                     rulesElements = [...rulesElements, ...item.system.rulesElement];
                  }
                  break;
               }
               case 'shield': {
                  if (this.parent.system.equipped.shield === item._id) {
                     rulesElements = [...rulesElements, ...item.system.rulesElement];
                  }
                  break;
               }
               case 'weapon':
               case 'equipment': {
                  if (item.system.equipped) {
                     rulesElements = [...rulesElements, ...item.system.rulesElement];
                  }
                  break;
               }
               default: {
                  rulesElements = [...rulesElements, ...item.system.rulesElement];
               }
            }
         }
      });

      // Sort the rules elements and process them in order

      // Mul Base
      const mulBases = rulesElements.filter((element) => element.operation === 'mulBase');
      mulBases.forEach((mulBase) => {
         this.applyMulBase(mulBase);
      });

      // FlatModifier
      const flatMods = rulesElements.filter((element) => element.operation === 'flatModifier');
      flatMods.forEach((flatMod) => {
         this.applyFlatModifier(flatMod);
      });

      // Start of turn messages
      this.turnStartMessages = rulesElements.filter((element) => element.operation === 'turnStartMessage');

      // Start of turn stam mods
      this.turnStartStamina = 0;
      rulesElements.filter((element) => element.operation === 'turnStartStamina').forEach((element) => this.turnStartStamina += element.mod);

      return;
   }

   _applyStatusEffects() {
      // Get the combat effects
      const temporaryEffects = this.parent.temporaryEffects;

      // Check each effect to see if it is a status effect
      temporaryEffects.forEach((effect) => {
         switch (effect.flags.core.statusId) {
            // Blinded
            case 'blind': {
               this.parent.system.statusEffect.blinded = true;

               // Decrease Melee, Accuracy, and Defense by 1
               systemData.rating.melee.effect -= 1;
               systemData.rating.accuracy.effect -= 1;
               systemData.rating.defense.effect -= 1;

               break;
            }

            // Defeaned
            case 'deaf': {
               // Apply the effect
               this.parent.system.statusEffect.deafened = true;
               break;
            }

            // Fear
            case 'fear': {
               // Apply the effect
               this.parent.system.statusEffect.frightened = true;
               break;
            }

            // Paralysis
            case 'paralysis': {
               // Apply the effect
               this.parent.system.statusEffect.incapacitated = true;
               break;
            }

            // Restrained
            case 'restrain': {
               // Apply the effect
               const systemData = this.parent.system;
               systemData.statusEffect.restrained = true;

               // Decrease Melee, Accuracy, and Defense by 1
               systemData.rating.melee.effect -= 1;
               systemData.rating.accuracy.effect -= 1;
               systemData.rating.defense.effect -= 1;

               // Decrease Speed to 0
               for (const [speedKey, speed] of Object.entries(systemData.speed)) {
                  // Calculate the total speed
                  let speedValue = speed.baseValue;
                  for (const [modKey, mod] of Object.entries(speed.mod)) {
                     speedValue += mod;
                  }

                  // Set the effect speed so that the total speed is 0 
                  if (speedValue > 0) {
                     speed.mod.effect -= speedValue;
                  }
               }

               break;
            }

            // Prone
            case 'prone': {
               // Apply the effect
               const systemData = this.parent.system;
               systemData.statusEffect.prone = true;

               // Decrease Speed by half
               for (const [speedKey, speed] of Object.entries(systemData.speed)) {
                  // Calculate the total speed
                  let speedValue = speed.baseValue;
                  for (const [modKey, mod] of Object.entries(speed.mod)) {
                     speedValue += mod;
                  }

                  // Set the effect mod so that the total speed is 1/2 of normal
                  if (speedValue > 0) {
                     speed.mod.effect -= (Math.ceil(speedValue / 2));
                  }
               }

               break;
            }

            // Sleep
            case 'sleep': {
               // Apply the effect
               const systemData = this.parent.system;
               systemData.statusEffect.sleeping = true;

               // Calculate the total awareness
               const awareness = this.parent.system.rating.awareness;
               let awarenessValue = awareness.baseValue + awareness.mod.static + awareness.equipment;
               for (const [key, mod] of Object.entries(awareness.mod)) {
                  awarenessValue += mod;
               }

               // Set the effect mod so that the total awareness is 1/2 of norma;
               if (awarenessValue > 0) {
                  awareness.mod.effect -= (Math.ceil(awarenessValue / 2));
               }

               break;
            }

            // Sleep
            case 'stun': {
               // Apply the effect
               const systemData = this.parent.system;
               systemData.statusEffect.stunned = true;

               // Decrease Defense by 1
               systemData.rating.defense.mod.effect -= 1;

               break;
            }

            // Poisoned
            case 'poison': {
               // Apply the effect
               const systemData = this.parent.system;
               systemData.statusEffect.contaminated = true;

               // Decrease all Skills and Resistances by 1
               for (const [key, skill] of Object.entries(systemData.skill)) {
                  skill.training.mod.effect -= 1;
               }
               for (const [key, resistance] of Object.entries(systemData.resistance)) {
                  resistance.mod.effect -= 1;
               }
               break;
            }

            // Unconscious
            case 'unconscious': {
               this.parent.system.statusEffect.unconscious = true;
               break;
            }

            default: {
               break;
            }
         }
      });
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
            armor.mod.equipment += equippedArmor.system.armor;
            const armorTraits = equippedArmor.system.trait;

            // Add encumbrance
            for (let idx = 0; idx < armorTraits.length; idx++) {
               if (armorTraits[idx].name === 'heavy.armor') {
                  for (const [key, speed] of Object.entries(this.parent.system.speed)) {
                     let totalSpeed = speed.value;
                     for (const [modKey, mod] of Object.entries(speed.mod)) {
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
         for (const [modKey, mod] of Object.entries(stat.mod)) {
            stat.value = Math.max(stat.value + mod, 0);
         }
      }

      function applyModsDeep(stats) {
         // Each stat
         for (const [key, stat] of Object.entries(stats)) {
            applyMods(stat);
         }
      }

      // Attributes
      applyModsDeep(systemData.attribute);

      // Skills
      for (const [key, skill] of Object.entries(systemData.skill)) {
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
      for (const [key, resource] of Object.entries(systemData.resource)) {
         resource.max = resource.maxBase;
         for (const [modKey, mod] of (Object.entries(resource.mod))) {
            resource.max = Math.max(resource.max + mod, 0);
         }
      }

      // Speeds
      applyModsDeep(systemData.speed);

      // Mods
      for (const [key, mod] of Object.entries(systemData.mod)) {
         mod.value = 0;
         for (const [modKey, modMod] of (Object.entries(mod.mod))) {
            mod.value = Math.max(mod.value + modMod, 0);
         }
      }
      return;
   }

   _clampResources() {
      for (const [key, resource] of Object.entries(this.parent.system.resource)) {
         resource.value = clamp(resource.value, 0, resource.max);
      }
   }

   // Get the initiative check
   async getInitiativeRoll(options) {
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
   async getAttributeCheck(options) {

      // Get the actor check data
      options.actorRollData = this.parent.getRollData();

      // Otherwise, do a skill check
      return new TitanAttributeCheck(options);
   }

   async rollAttributeCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // Check if confirmed
         if (confirmed || !getCheckOptions()) {
            // Get the check
            const attributeCheck = await this.getAttributeCheck(options);
            if (attributeCheck && attributeCheck.isValid) {
               await attributeCheck.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
               });
            }

            return;
         }

         // Otherwise, create an options dialog
         if ((options.skill && options.skill !== 'none') && (!options.attribute || options.attribute === 'default')) {
            options.attribute = this.parent.system.skill[options.skill].defaultAttribute;
         }
         const dialog = new AttributeCheckDialog(this.parent, options);
         dialog.render(true);
         return;
      }

      return;
   }

   // Get a resistance check at the actor
   async getResistanceCheck(options) {

      // Get the actor check data
      options.actorRollData = this.parent.getRollData();

      // Get the check
      const resistanceCheck = new TitanResistanceCheck(options);

      // Return the data
      return resistanceCheck;
   }

   async rollResistanceCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // Check if confirmed
         if (confirmed || !getCheckOptions()) {

            // Roll the resistance check
            const resistanceCheck = await this.getResistanceCheck(options);
            if (resistanceCheck && resistanceCheck.isValid) {
               await resistanceCheck.evaluateCheck();
               await resistanceCheck.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
               });
            }

            return;
         }

         // Otherwise, create an options dialog
         const dialog = new ResistanceCheckDialog(this.parent, options);
         dialog.render(true);
      }

      return;
   }

   // Get an attack check
   async getAttackCheck(options) {
      // Get the weapon check data.
      const checkWeapon = this.parent.items.get(options?.itemId);
      if (!checkWeapon || checkWeapon.type !== 'weapon') {
         console.error('TITAN | Attack check failed. Invalid weapon ID provided to actor.');
         console.trace();

         return;
      }

      // Initialize check options
      options.damageMod = options.damageMod ?? this.parent.system.mod.damage.value;

      // Add the actor check data to the check options
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Add the weapon data to the check options
      const itemRollData = checkWeapon.getRollData();
      options.itemRollData = itemRollData;

      // Get the target check data
      let userTargets = Array.from(game.user.targets);
      if (userTargets.length < 1 && game.user.isGM) {
         userTargets = Array.from(canvas.tokens.controlled);
      }

      if (userTargets[0] && userTargets[0].document.actor._id !== this.parent._id) {
         const targetRollData = userTargets[0].document.actor.getRollData();
         options.targetRollData = targetRollData;
      }

      // Perform the attack
      const attackCheck = new TitanAttackCheck(options);
      return attackCheck;
   }

   async rollAttackCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // Check if confirmed
         if (confirmed || !getCheckOptions()) {
            // Get the attack check
            const attackCheck = await this.getAttackCheck(options);
            if (attackCheck && attackCheck.isValid) {
               await attackCheck.evaluateCheck();
               await attackCheck.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
               });
            }

            return;
         }

         // Otherwise, create an options dialog
         // Get the weapon check data.
         const checkWeapon = this.parent.items.get(options?.itemId);
         if (!checkWeapon) {
            console.error('TITAN | Attack check failed. Invalid weapon ID provided to actor.');
            console.trace();

            return;
         }

         // Get the attack data
         const checkAttack = checkWeapon.system.attack[options.attackIdx];
         if (!checkAttack) {
            console.error('TITAN | Attack check failed. Invalid Attack Index provided to actor.');
            console.trace();

            return;
         }

         // Get the damage mod
         options.damageMod = this.parent.system.mod.damage.value;

         // Get the attacker melee and accuracy
         options.attackerMelee = this.parent.system.rating.melee.value;
         options.attackerAccuracy = this.parent.system.rating.accuracy.value;

         // Get the target defense
         let userTargets = Array.from(game.user.targets);
         if (userTargets.length < 1 && game.user.isGM) {
            userTargets = Array.from(canvas.tokens.controlled);
         }
         if (userTargets[0] && userTargets[0].document.parent._id !== this.parent._id) {
            options.targetDefense = userTargets[0].document.actor.getRollData().rating.defense.value;
         }

         // Get the attack type
         options.type = checkAttack.type;
         options.weaponName = checkWeapon.name;
         options.attackName = checkAttack.label;
         options.multiAttack = options.multiAttack ?? checkWeapon.multiAttack;

         // Create the dialog
         const dialog = new AttackCheckDialog(this.parent, options);
         dialog.render(true);
      }

      return;
   }

   async getCastingCheck(options) {
      // Get the weapon check data.
      const checkSpell = this.parent.items.get(options?.itemId);
      if (!checkSpell || checkSpell.type !== 'spell') {
         console.error('TITAN | Casting check failed. Invalid Spell ID provided to actor.');
         console.trace();

         return;
      }

      // Initialize check options
      options.damageMod = options.damageMod ?? this.parent.system.mod.damage.value;

      // Add the actor check data to the check options
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Add the weapon data to the check options
      const itemRollData = checkSpell.getRollData();
      options.itemRollData = itemRollData;

      // Get the check
      const castingCheck = new TitanCastingCheck(options);
      return castingCheck;
   }

   async rollCastingCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // Check if confirmed
         if (confirmed || !getCheckOptions()) {
            // Get the check
            const castingCheck = await this.getCastingCheck(options);
            if (castingCheck && castingCheck.isValid) {
               await castingCheck.evaluateCheck();
               await castingCheck.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
               });
            }

            return;
         }

         // Otherwise, create a confirmation dialog
         const checkSpell = this.parent.items.get(options?.itemId);
         if (!checkSpell || checkSpell.type !== 'spell') {
            console.error('TITAN | Casting check failed. Invalid Spell ID provided to actor.');
            console.trace();

            return;
         }

         // Get the spell data
         options.difficulty = checkSpell.system.castingCheck.difficulty;
         options.complexity = checkSpell.system.castingCheck.complexity;
         options.attribute = checkSpell.system.castingCheck.attribute;
         options.skill = checkSpell.system.castingCheck.skill;
         options.spellName = checkSpell.name;

         // Get the mods
         options.damageMod = this.parent.system.mod.damage.value;
         options.healingMod = this.parent.system.mod.healing.value;

         // Create the dialog
         const dialog = new CastingCheckDialog(this.parent, options);
         dialog.render(true);
      }

      return;
   }

   async getItemCheck(options) {
      // Get the Item data.
      const checkItem = this.parent.items.get(options?.itemId);
      if (!checkItem) {
         console.error('TITAN | Item Check failed before creation. Invalid Item ID provided to actor.');
         console.trace();

         return;
      }
      options.itemRollData = checkItem.getRollData();

      // Add the actor check data to the check options
      options.actorRollData = this.parent.getRollData();

      // Get the check
      const itemCheck = new TitanItemCheck(options);
      return itemCheck;
   }

   async rollItemCheck(options, confirmed) {
      if (this.parent.isOwner) {
         // Check if confirmed
         if (confirmed || !getCheckOptions()) {
            // Otherwise, get a check
            const itemCheck = await this.getItemCheck(options);
            if (itemCheck && itemCheck.isValid) {
               await itemCheck.evaluateCheck();
               await itemCheck.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  rollMode: game.settings.get('core', 'rollMode'),
               });
            }

            return;
         }

         // Otherwise, create a confirmation dialog
         const checkItem = this.parent.items.get(options?.itemId);
         if (!checkItem) {
            console.error('TITAN | Item check failed. Invalid Item ID provided to actor.');
            console.trace();

            return;
         }
         const checkData = checkItem.system.check[options.checkIdx];
         if (!checkData) {
            console.error(`TITAN | Item check failed. Invalid Check Idx provided to actor (${options.checkIdx}).`);
            console.trace();

            return;
         }

         // Get the spell data
         options.difficulty = checkData.difficulty;
         options.complexity = checkData.complexity;
         options.attribute = checkData.attribute;
         options.skill = checkData.skill;
         options.checkName = checkData.label;
         options.itemName = checkItem.name;

         // Get the mods
         options.damageMod = this.parent.system.mod.damage.value;
         options.healingMod = this.parent.system.mod.healing.value;

         // Create the dialog
         const dialog = new ItemCheckDialog(this.parent, options);
         dialog.render(true);
         return;
      }

      return;
   }

   // Apply damage to the actor
   async applyDamage(damage, ignoreArmor, report) {
      if (this.parent.isOwner) {
         // Calculate the damage amount
         const damageTaken = ignoreArmor ? damage : Math.max(damage - this.parent.system.mod.armor.value, 0);
         const stamina = this.parent.system.resource.stamina;
         const wounds = this.parent.system.resource.wounds;

         // Calculate the number of wounds taken
         let woundsTaken = 0;
         if (stamina.value < damageTaken) {
            if (stamina.value + 5 <= damageTaken) {
               woundsTaken = 3;
            }
            else if (stamina.value + 2 <= damageTaken) {
               woundsTaken = 2;
            }
            else {
               woundsTaken = 1;
            }
         }

         // Update the actor
         stamina.value = Math.max(stamina.value - damageTaken, 0);
         wounds.value += woundsTaken;
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

         // Report
         if (report) {
            const reportSettings = getSetting('reportTakingDamage');
            if (reportSettings !== 'disabled') {

               // Create the chat context
               const chatContext = {
                  type: 'report',
                  img: this.parent.img,
                  header: `${localize('tookDamage')}: ${damageTaken}`,
                  subHeader: [`${this.parent.name}`],
                  icon: 'fas fa-heart',
                  message: [
                     `${localize('stamina')}: ${stamina.value} / ${stamina.max}`,
                     `${localize('wounds')}: ${wounds.value} / ${wounds.max}`
                  ]
               };

               // Wounds taken
               if (woundsTaken > 0) {
                  chatContext.message = [`${localize('woundsTaken')}: ${woundsTaken}`, ...chatContext.message];
               }

               // Damage resisted
               if (damageTaken !== damage) {
                  chatContext.message = [`${localize('damageResisted')}: ${damage - damageTaken}`, ...chatContext.message];
               }

               // Ignore Armor
               if (ignoreArmor) {
                  chatContext.message = [localize('ignoreArmor'), ...chatContext.message];
               }

               // Send the report to chat
               await ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                  type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                  sound: CONFIG.sounds.notification,
                  whisper: game.users.filter((user) =>
                     reportSettings === 'owner' ?
                        this.parent.testUserPermission(user, 'OWNER') :
                        user.isGM
                  ),
                  flags: {
                     titan: {
                        chatContext: chatContext
                     }
                  }
               });
            }

         }

         return {
            damageTaken: damageTaken,
            woundsTaken: woundsTaken
         };
      }

      return;
   }

   async regainResolve(resolveRegained, report) {
      // Update resolve
      const resolve = this.parent.system.resource.resolve;
      resolve.value = Math.min(resolve.max, resolve.value += resolveRegained);

      // Update the actor if appropriate
      await this.parent.update({
         system: {
            resource: {
               resolve: resolve
            }
         }
      });

      return
   }

   async healDamage(healing, report) {
      if (this.parent.isOwner) {
         // Check if the actor's stamina is less than max
         let staminaHealed = 0;
         const stamina = this.parent.system.resource.stamina;
         if (stamina.value < stamina.max) {
            // Update the actor
            staminaHealed = Math.min(healing, stamina.max - stamina.value);
            stamina.value += staminaHealed;
            await this.parent.update({
               system: {
                  resource: {
                     stamina: {
                        value: stamina.value
                     }
                  }
               }
            });

            // Report
            if (report) {
               const reportSettings = getSetting('reportHealingDamage');
               if (reportSettings !== 'disabled') {
                  // Create chat context
                  const wounds = this.parent.system.resource.wounds;
                  const chatContext = {
                     type: 'report',
                     img: this.parent.img,
                     header: `${localize('healedDamage')}: ${staminaHealed}`,
                     subHeader: [this.parent.name],
                     icon: 'fas fa-heart',
                     message: [
                        `${localize('resolve')}: ${stamina.value} / ${stamina.max}`,
                        `${localize('wounds')}: ${wounds.value} / ${wounds.max}`
                     ]
                  };

                  // Send the report to chat
                  await ChatMessage.create({
                     user: game.user.id,
                     speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                     type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                     sound: CONFIG.sounds.notification,
                     whisper: game.users.filter((user) =>
                        reportSettings === 'owner' ?
                           this.parent.testUserPermission(user, 'OWNER') :
                           user.isGM
                     ),
                     flags: {
                        titan: {
                           chatContext: chatContext
                        }
                     }
                  });
               }
            }
         }

         return staminaHealed;
      }

      return;
   }

   async spendResolve(report) {
      if (this.parent.isOwner) {
         // Check if the actor's resolve is less than max
         const resolve = this.parent.system.resource.resolve;
         if (resolve.value > 0) {
            // Update the actor
            resolve.value -= 1;
            await this.parent.update({
               system: {
                  resource: {
                     resolve: {
                        value: resolve.value
                     }
                  }
               }
            });

            // Report
            if (report) {
               const reportSettings = getSetting('reportSpendingResolve');
               if (reportSettings !== 'disabled') {
                  // Create chat context
                  const chatContext = {
                     type: 'report',
                     img: this.parent.img,
                     header: `${localize('spentResolve')}`,
                     subHeader: [this.parent.name],
                     icon: 'fas fa-bolt',
                     message: [`${localize('resolve')}: ${resolve.value} / ${resolve.max}`]
                  };


                  // Send the chat message
                  ChatMessage.create({
                     user: game.user.id,
                     speaker: ChatMessage.getSpeaker({ actor: this.parent }),
                     type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                     sound: CONFIG.sounds.notification,
                     whisper: game.users.filter((user) =>
                        reportSettings === 'owner' ?
                           this.parent.testUserPermission(user, 'OWNER') :
                           user.isGM
                     ),
                     flags: {
                        titan: {
                           chatContext: chatContext
                        }
                     }
                  });
               }
            }
         }
      }

      return;
   }

   async removeExpiredEffects(confirmed) {
      // Get the expired effects
      const actor = this.parent;
      const expiredEffects = await actor.items.filter((item) => item.type === 'effect' && item.typeComponent.isExpired());
      if (expiredEffects.length > 0) {
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
      return;
   }

   async removeCombatEffects(report) {
      const actor = this.parent;
      if (actor.isOwner) {
         const systemData = actor.system;
         // Reset static mods
         // Attribute
         for (const [key, value] of Object.entries(systemData.attribute)) {
            value.mod.static = 0;
         }

         // Skills
         for (const [key, value] of Object.entries(systemData.skill)) {
            value.training.mod.static = 0;
            value.expertise.mod.static = 0;
         }

         // Ratings
         for (const [key, value] of Object.entries(systemData.rating)) {
            value.mod.static = 0;
         }

         // Speed
         for (const [key, value] of Object.entries(systemData.speed)) {
            value.mod.static = 0;
         }

         // Mod
         for (const [key, value] of Object.entries(systemData.mod)) {
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
         if (report) {
            const reportSettings = getSetting('reportResting');
            if (reportSettings !== 'disabled') {
               // Create chat context
               const chatContext = {
                  type: 'report',
                  img: actor.img,
                  header: localize('temporaryEffectsRemoved'),
                  subHeader: [actor.name],
                  icon: 'fas fa-arrow-rotate-left',
                  message: [localize('resolveFullyRestored')]
               };

               // Send the report to chat
               await ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: actor }),
                  type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                  sound: CONFIG.sounds.notification,
                  whisper: game.users.filter((user) =>
                     reportSettings === 'owner' ?
                        actor.testUserPermission(user, 'OWNER') :
                        user.isGM
                  ),
                  flags: {
                     titan: {
                        chatContext: chatContext
                     }
                  }
               });
            }
         }
      }

      return;
   }

   async shortRest(report) {
      const actor = this.parent;
      if (actor.isOwner) {
         // Restore stamina
         actor.system.resource.stamina.value = actor.system.resource.stamina.max;

         // Remove combat efects updates the actor
         await this.removeCombatEffects(false);

         // Report
         if (report) {
            const reportSettings = getSetting('reportResting');
            if (reportSettings !== 'disabled') {
               // Create chat context
               const chatContext = {
                  type: 'report',
                  img: actor.img,
                  header: localize('tookAShortRest'),
                  subHeader: [actor.name],
                  icon: 'fas fa-face-exhaling',
                  message: [
                     localize('temporaryEffectsRemoved'),
                     localize('staminaAndResolveRestored'),
                  ]
               };

               // Send the report to chat
               await ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: actor }),
                  type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                  sound: CONFIG.sounds.notification,
                  whisper: game.users.filter((user) =>
                     reportSettings === 'owner' ?
                        actor.testUserPermission(user, 'OWNER') :
                        user.isGM
                  ),
                  flags: {
                     titan: {
                        chatContext: chatContext
                     }
                  }
               });
            }
         }
      }

      return;
   }

   async longRest(report) {
      const actor = this.parent;
      if (actor.isOwner) {
         // Decrease wounds
         let woundsHealed = 0;
         const wounds = actor.system.resource.wounds;
         if (wounds.value > 0) {
            woundsHealed = Math.min(1 + actor.system.mod.woundRegain.value, wounds.value);
            wounds.value -= woundsHealed;
         }

         // Short rest updates the actor
         await this.shortRest(false);

         // Report
         if (report) {
            const reportSettings = getSetting('reportResting');
            if (reportSettings !== 'disabled') {
               // Create chat context
               const chatContext = {
                  type: 'report',
                  img: actor.img,
                  header: localize('tookALongRest'),
                  subHeader: [actor.name],
                  icon: 'fas fa-bed',
                  message: [
                     localize('temporaryEffectsRemoved'),
                     localize('staminaAndResolveRestored'),
                  ]
               };

               // Add line about wounds healed
               if (woundsHealed > 0) {
                  chatContext.message = [
                     ...chatContext.message,
                     `${localize('woundsHealed')}: ${woundsHealed}`,
                     `${localize('wounds')}: ${wounds.value} / ${wounds.max}`
                  ];
               }

               // Send the report to chat
               await ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: actor }),
                  type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                  sound: CONFIG.sounds.notification,
                  whisper: game.users.filter((user) =>
                     reportSettings === 'owner' ?
                        actor.testUserPermission(user, 'OWNER') :
                        user.isGM
                  ),
                  flags: {
                     titan: {
                        chatContext: chatContext
                     }
                  }
               });
            }
         }
      }

      return;
   }

   async onTurnStart() {
      // Initialize variables
      const chatContext = {};
      const actor = this.parent;
      let updateActor = false;
      const messages = [];

      // Get the settings for effect automation
      const autoDecreaseEffectDuration = (getSetting('autoDecreaseEffectDuration'));
      const reportEffects = getSetting('reportEffects');
      const autoRemoveExpiredEffects = getSetting('autoRemoveExpiredEffects');

      // Check all active effects
      const conditions = [];
      this.parent.effects.filter((effect) => !actor.items.get(effect.origin)).forEach((effect) => {
         // If this is an orphaned effect, then delete it
         if (effect.flags?.titan?.itemId) {
            effect.delete();
         }

         // Otherwise, if we are reporting active effects, add it to the conditions
         else if (reportEffects) {
            conditions.push(effect.label);
         }
      });

      // Update chat context
      if (conditions.length > 0) {
         chatContext.conditions = conditions;
      }

      // If we are doing any effect automation
      if (autoDecreaseEffectDuration || reportEffects || autoRemoveExpiredEffects !== 'disabled') {

         // Sort the effects
         const effectItems = this.parent.items.filter((effect) => effect.type === 'effect').sort((a, b) => documentSort(a, b));
         const expiredEffects = []
         const activeTurnStartEffects = [];
         const activeTurnEndEffects = [];
         effectItems.forEach((effect) => {
            // Decrease the efect duration if appropriate
            if ((autoDecreaseEffectDuration &&
               effect.system.duration.type === 'turnStart' &&
               effect.system.duration.remaining > 0)) {
               effect.system.duration.remaining -= 1;
            }

            // Sort the effect into expired or continuing buckets
            if (effect.typeComponent.isExpired()) {
               expiredEffects.push(effect);
            }
            else {
               if (effect.system.duration.type === 'turnStart') {
                  activeTurnStartEffects.push(effect);
               }
               else {
                  activeTurnEndEffects.push(effect);
               }
            }
         });

         // Update chat context
         if (reportEffects) {

            // Turn start effects
            if (activeTurnStartEffects.length > 0) {
               chatContext.turnStartEffects = activeTurnStartEffects.map((effect) => {
                  return { label: effect.name, remaining: effect.remaining };
               });
            }

            // Turn end effects
            if (activeTurnEndEffects.length > 0) {
               chatContext.turnEndEffects = activeTurnEndEffects.map((effect) => {
                  return { label: effect.name, remaining: effect.remaining };
               });
            }

            // Expired effects
            if (expiredEffects.length > 0) {
               chatContext.expiredEffects = [];
               expiredEffects.forEach((effect) => {
                  // Add the effect to the chat context
                  chatContext.expiredEffects.push(effect.name);

                  // Delete the effect if appropriate
                  if (autoRemoveExpiredEffects === 'enabled') {
                     effect.delete();
                  }
               });
            }
         }
      }

      // Regain resolve
      const autoRegainResolve = getSetting('autoRegainResolve');
      if (autoRegainResolve !== 'disabled') {

         // If the resolve value is below max
         const resolve = actor.system.resource.resolve;
         if (resolve.value < resolve.max) {

            // If any resolve would be regained
            const maxResolveRegained = getSetting('baseResolveRegain') + actor.system.mod.resolveRegain.value;
            if (maxResolveRegained > 0) {

               // Calculate the resolve regains
               const newResolve = Math.min(resolve.max, resolve.value + maxResolveRegained);
               const resolveRegained = newResolve - resolve.value;

               // Update the chat context
               chatContext.resolveRegained = maxResolveRegained;

               // If resolve regained is automatically applied
               if (autoRegainResolve === 'enabled') {
                  // Update the actor
                  resolve.value = newResolve;
                  updateActor = true;
               }

               // Add resolve update to the chat context
               if (getSetting('reportRegainingResolve') === true) {
                  messages.push(`${localize('regainedResolve')}: ${resolveRegained}`);
                  messages.push(`${localize('resolve')}: ${resolve.value} / ${resolve.max}`);
               }
            }
         }
      }


      // Update actor if appropriate
      if (updateActor) {
         actor.update({
            system: actor.system
         });
      }

      // Start of turn report
      if (messages.length > 0 ||
         chatContext.expiredEffects ||
         chatContext.turnStartEffects ||
         chatContext.turnEndEffects ||
         chatContext.conditions ||
         chatContext.resolveRegained) {

         // Prepare chat context
         chatContext.type = 'turnReport';
         chatContext.img = actor.img;
         chatContext.header = localize('turnStart');
         chatContext.subHeader = [actor.name];
         chatContext.icon = 'fas fa-clock';
         chatContext.messages = messages;

         // Send the report to chat
         await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            sound: CONFIG.sounds.notification,
            whisper: game.users.filter((user) =>
               actor.testUserPermission(user, 'OWNER')
            ),
            flags: {
               titan: {
                  chatContext: chatContext
               }
            },
         });
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
      const messages = [];

      // Get the settings for effect automation
      const autoDecreaseEffectDuration = (getSetting('autoDecreaseEffectDuration'));
      const reportEffects = getSetting('reportEffects');
      const autoRemoveExpiredEffects = getSetting('autoRemoveExpiredEffects');

      // If we are doing any effect automation
      if (autoDecreaseEffectDuration || reportEffects || autoRemoveExpiredEffects !== 'disabled') {
         // Sort the effects
         const effectItems = this.parent.items.filter((effect) => effect.type === 'effect');
         const expiredEffects = []
         const activeEffects = [];
         effectItems.forEach((effect) => {
            // Decrease the efect duration if appropriate
            if ((getSetting('autoDecreaseEffectDuration'))) {

            }
         });
      }



      if (getSetting('autoDecreaseEffectDuration')) {
         const expiredEffects = [];
         this.parent.items.filter((effect) => effect.type === 'effect' && effect.system.duration.type === 'turnEnd').forEach((effect) => {
            if (effect.system.duration.remaining > 0) {
               effect.system.duration.remaining -= 1;
               effect.update({
                  system: {
                     duration: effect.system.duration
                  }
               });
            }

            if (effect.system.duration.remaining <= 0) {
               expiredEffects.push(effect);
            }
         });

         // Send message about expired effects
         if (getSetting('reportEffects') && expiredEffects.length > 0) {
            expiredEffects.forEach((effect) => {
               messages.push(`${effect.name} (${localize('expired')})`);
            });
         }
      }

      // End of turn report
      if (messages.length > 0) {
         // Create chat context
         const chatContext = {
            type: 'turnReport',
            img: this.parent.img,
            header: localize('turnEnd'),
            subHeader: [this.parent.name],
            icon: 'fas fa-clock',
            message: messages
         };

         // Add remove temporary effects button if appropriate

         // Send the report to chat
         await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.parent }),
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            sound: CONFIG.sounds.notification,
            whisper: game.users.filter((user) =>
               this.parent.testUserPermission(user, 'OWNER')
            ),
            flags: {
               titan: {
                  chatContext: chatContext
               }
            },
         });
      }

      return;
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
}
