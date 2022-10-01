import { clamp } from '~/helpers/Utility.js';
import { applyFlatModifier } from '~/rules-element/FlatModifier';
import ResistanceCheckDialog from '~/check/types/resistance-check/ResistanceCheckDialog.js';
import SkillCheckDialog from '~/check/types/skill-check/SkillCheckDialog.js';
import AttackCheckDialog from '~/check/types/attack-check/AttackCheckDialog.js';
import CastingCheckDialog from '~/check/types/casting-check/CastingCheckDialog.js';
import TitanAttributeCheck from '~/check/types/attribute-check/AttributeCheck.js';
import TitanSkillCheck from '~/check/types/skill-check/SkillCheck.js';
import TitanResistanceCheck from '~/check/types/resistance-check/ResistanceCheck.js';
import TitanAttackCheck from '~/check/types/attack-check/AttackCheck.js';
import TitanCastingCheck from '~/check/types/casting-check/CastingCheck.js';
import TitanItemCheck from '~/check/types/item-check/ItemCheck.js';
import TitanTypeComponent from '~/helpers/TypeComponent.js';

export default class TitanCharacterComponent extends TitanTypeComponent {

   // Apply rules element bindings
   applyFlatModifier = applyFlatModifier.bind(this);

   // Prepare Character type specific data
   prepareDerivedData() {
      this._calculateBaseRatings();
      this._calculateBaseResistances();
      this._calculateBaseResources();
      this._resetDynamicMods();
      this._applyRulesElements();
      this._applyStatusEffects();
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
      systemData.resource.stamina.maxBase = totalBaseAttributeValue;

      // Resolve = Soul / 2 rounded up
      systemData.resource.resolve.maxBase = Math.ceil(
         systemData.attribute.soul.baseValue / 2);

      // Wounds = Total Attribute mod / 2 rounded up
      systemData.resource.wounds.maxBase = Math.ceil(
         totalBaseAttributeValue / 2);
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
            rulesElements = [...rulesElements, ...item.system.rulesElement];
         }
      });

      // Sort the rules elements and process them in order
      // FlatModifier
      const flatMods = rulesElements.filter((element) => element.operation === 'flatModifier');
      flatMods.forEach((flatMod) => {
         this.applyFlatModifier(flatMod);
      });

      return;
   }

   _applyStatusEffects() {
      // Get the temporary effects
      const temporaryEffects = this.parent.temporaryEffects;

      // Check each effect to see if it is a status effect
      temporaryEffects.forEach((effect) => {
         switch (effect.flags.core.statusId) {
            // Blinded
            case 'blind': {
               this.parent.system.statusEffect.blinded = true;
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
               systemData.statusEffect.asleep = true;

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

   _applyMods() {
      // Get a reference to the parent system data
      const systemData = this.parent.system;

      function applyMods(stat) {
         stat.value = stat.baseValue;

         // Each mod in the stat
         for (const [modKey, mod] of Object.entries(stat.mod)) {
            stat.value += mod;
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
         resource.maxValue = resource.maxBase;
         for (const [modKey, mod] of (Object.entries(resource.mod))) {
            resource.maxValue += mod;
         }
      }

      // Speeds
      applyModsDeep(systemData.speed);

      // Add armor from the equipped armor if appropriate
      const equippedArmorId = this.parent.system.equipped.armor;
      if (equippedArmorId) {
         const armor = systemData.mod.armor;
         const equippedArmor = this.parent.items.get(equippedArmorId);
         if (equippedArmor) {
            armor.mod.equipment += equippedArmor.system.armor;
         }
      }

      // Mods
      for (const [key, mod] of Object.entries(systemData.mod)) {
         mod.value = 0;
         for (const [modKey, modMod] of (Object.entries(mod.mod))) {
            mod.value += modMod;
         }
      }
      return;
   }

   _clampResources() {
      for (const [key, resource] of Object.entries(this.parent.system.resource)) {
         resource.value = clamp(resource.value, 0, resource.maxValue);
      }
   }

   // Get the initiative check
   async getInitiativeRoll(options) {
      // Calculate the initiative value
      const initiative = this.parent.system.rating.initiative.value;

      // Get the initiative formula
      let initiativeFormula = '';
      const initiativeSettings = game.settings.get('titan', 'initiativeFormula');
      if (initiativeSettings === 'roll2d6') {
         initiativeFormula = '2d6+';
      }
      else if (initiativeSettings === 'roll1d6') {
         initiativeFormula = '1d6+';
      }

      const roll = new Roll(
         initiativeFormula +
         initiative.toString() +
         (options !== undefined && options.bonus !== undefined ?
            options.bonus.toString() : '')
      );
      const retVal = {
         outRoll: roll,
         outInitiativeMod: initiative,
      };

      return retVal;
   }

   // Get a skill check from the actor
   async getAttributeCheck(options) {

      // Get the actor check data
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Check if the skill is none
      if (options.skill === 'none') {
         // If so, do an attribute check
         delete options.skill;
         delete options.trainingMod;
         const attributeCheck = new TitanAttributeCheck(options);
         return attributeCheck;
      }

      // Otherwise, do a skill check
      const skillCheck = new TitanSkillCheck(options);
      return skillCheck;
   }

   async rollAttributeCheck(options) {
      // If get options, then create a dialog for setting options.
      if (options?.getOptions === true) {
         const dialog = new SkillCheckDialog(this.parent, options);
         dialog.render(true);
         return;
      }

      // Otherwise, get a simple check
      const attributeCheck = await this.getAttributeCheck(options);
      if (attributeCheck && attributeCheck.isValid) {
         await attributeCheck.evaluateCheck();
         await attributeCheck.sendToChat({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.parent }),
            rollMode: game.settings.get('core', 'rollMode'),
         });
      }
   }

   // Get a resistance check at the actor
   async getResistanceCheck(options) {

      // Get the actor check data
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Perform the roll
      const resistanceCheck = new TitanResistanceCheck(options);

      // Return the data
      return resistanceCheck;
   }

   async rollResistanceCheck(options) {
      // If get options, then create a dialog for setting options.
      if (options?.getOptions === true) {
         const dialog = new ResistanceCheckDialog(this.parent, options);
         dialog.render(true);
         return;
      }

      // Otherwise, get a simple check
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

   // Get an attack check
   async getAttackCheck(options) {
      // Get the weapon check data.
      const checkWeapon = this.parent.items.get(options?.itemId);
      if (!checkWeapon || checkWeapon.type !== 'weapon') {
         console.error(
            'TITAN | Attack check failed. Invalid weapon ID provided to actor.'
         );

         return false;
      }

      // Initialize check options
      options.damageMod = options.damageMod ?? this.parent.system.mod.damage.value;

      // Add the actor check data to the check options
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Add the weapon data to the check options
      const weaponRollData = checkWeapon.getRollData();
      options.weaponRollData = weaponRollData;

      // Get the target check data
      let userTargets = Array.from(game.user.targets);
      if (userTargets.length < 1 && game.user.isGM) {
         userTargets = Array.from(canvas.tokens.controlled);
      }

      if (userTargets[0]) {
         const targetRollData = userTargets[0].document.actor.getRollData();
         options.targetRollData = targetRollData;
      }

      // Perform the attack
      const attackCheck = new TitanAttackCheck(options);
      return attackCheck;
   }

   async rollAttackCheck(options) {
      // If get options, then create a dialog for setting options.
      if (options?.getOptions === true) {
         // Get the weapon check data.
         const checkWeapon = this.parent.items.get(options?.itemId);
         if (!checkWeapon) {
            console.error(
               'TITAN | Attack check failed. Invalid weapon ID provided to actor.'
            );

            return false;
         }

         // Get the attack data
         const checkAttack = checkWeapon.system.attack[options.attackIdx];
         if (!checkAttack) {
            console.error(
               'TITAN | Attack check failed. Invalid Attack Index provided to actor.'
            );

            return false;
         }

         // Get the damage mod
         options.damageMod = options.damageMod ?? this.parent.system.mod.damage.value;

         // Get the attacker melee and accuracy
         options.attackerMelee = this.parent.system.rating.melee.value;
         options.attackerAccuracy = this.parent.system.rating.accuracy.value;

         // Get the target defense
         let userTargets = Array.from(game.user.targets);
         if (userTargets.length < 1 && game.user.isGM) {
            userTargets = Array.from(canvas.tokens.controlled);
         }
         if (userTargets[0]) {
            options.targetDefense = userTargets[0].document.actor.getRollData().rating.defense.value;
         }

         // Get the attack type
         options.type = checkAttack.type;
         options.weaponName = checkWeapon.name;
         options.attackName = checkAttack.label;

         // Create the dialog
         const dialog = new AttackCheckDialog(this.parent, options);
         dialog.render(true);
         return;
      }

      // Otherwise, get a check
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

   async getCastingCheck(options) {
      // Get the weapon check data.
      const checkSpell = this.parent.items.get(options?.itemId);
      if (!checkSpell || checkSpell.type !== 'spell') {
         console.error(
            'TITAN | Casting check failed. Invalid Spell ID provided to actor.'
         );

         return false;
      }

      // Initialize check options
      options.damageMod = options.damageMod ?? this.parent.system.mod.damage.value;

      // Add the actor check data to the check options
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Add the weapon data to the check options
      const spellRollData = checkSpell.getRollData();
      options.spellRollData = spellRollData;

      // Get the check
      const castingCheck = new TitanCastingCheck(options);
      return castingCheck;
   }

   async rollCastingCheck(options) {
      // If get options, then create a dialog for setting options.
      if (options?.getOptions === true) {
         // Get the spell check data.
         const checkSpell = this.parent.items.get(options?.itemId);
         if (!checkSpell || checkSpell.type !== 'spell') {
            console.error(
               'TITAN | Casting check failed. Invalid Spell ID provided to actor.'
            );

            return false;
         }

         // Get the spell data
         options.difficulty = options.difficulty ?? checkSpell.system.check.difficulty;
         options.complexity = options.complexity ?? checkSpell.system.check.complexity;
         options.attribute = options.attribute ?? checkSpell.system.check.attribute;
         options.skill = options.skill ?? checkSpell.system.check.skill;
         options.spellName = checkSpell.name;

         // Get the damage mod
         options.damageMod = options.damageMod ?? this.parent.system.mod.damage.value;

         // Create the dialog
         const dialog = new CastingCheckDialog(this.parent, options);
         dialog.render(true);
         return;
      }

      // Otherwise, get a check
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

   async getItemCheck(options) {
      // Get the Item data.
      const checkItem = this.parent.items.get(options?.itemId);
      if (!checkItem) {
         console.error(
            'TITAN | Item Check failed. Invalid Item provided to actor.'
         );

         return false;
      }

      // Get the check data
      const checkData = checkItem.system.check[0];
      if (!checkData) {
         console.error(
            'TITAN | Item Check failed. Invalid Check IDX provided to actor.'
         );

         return false;
      }

      // Populate options
      options.label = options.label ?? checkData.label;
      options.attribute = options.attribute ?? checkData.attribute;
      options.skill = options.skill ?? checkData.skill;
      options.difficulty = options.difficulty ?? checkData.difficulty;
      options.complexity = options.complexity ?? checkData.complexity;
      options.isDamage = options.isDamage ?? checkData.isDamage;
      options.isHealing = options.isHealing ?? checkData.isHealing;
      options.initialValue = options.initialValue ?? checkData.initialValue;
      options.scaling = options.scaling ?? checkData.scaling;
      options.resistanceCheck = options.resistanceCheck ?? checkData.resistanceCheck;
      options.opposedCheck = options.opposedCheck ?? checkData.opposedCheck;
      options.resolveCost = options.resolveCost ?? checkData.resolveCost;
      options.damageMod = options.damageMod ?? this.parent.system.mod.damage.value;
      options.itemName = checkItem.name;
      options.img = checkItem.img;

      // Add the actor check data to the check options
      const actorRollData = this.parent.getRollData();
      options.actorRollData = actorRollData;

      // Get the check
      const itemCheck = new TitanItemCheck(options);
      return itemCheck;
   }

   async rollItemCheck(options) {
      // If get options, then create a dialog for setting options.
      if (options?.getOptions === true) {
         console.log('ToDo.');
      }

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

   // Apply damage to the actor
   async applyDamage(damage, ignoreArmor) {
      // Calculate the damage amount
      const baseDamage = damage;
      if (!ignoreArmor) {
         damage = Math.max(damage - this.parent.system.mod.armor.value, 0);
      }
      const newStamina = this.parent.system.resource.stamina.value - damage;

      // Prepare the update data
      const updateData = {
         system: {
            resource: {
               stamina: {
                  value: Math.max(newStamina, 0),
               },
               wounds: {
                  value: this.parent.system.resource.wounds.value,
               },
            },
         },
      };

      // If the stamina was dropped below 0
      if (newStamina < 0) {
         // Calculate wounds
         if (newStamina < -1) {
            if (newStamina < -3) {
               // 3 Wounds
               updateData.system.resource.wounds.value += 3;
            }
            else {
               // 2 Wounds
               updateData.system.resource.wounds.value += 2;
            }
         }
         else {
            // 1 Wound
            updateData.system.resource.wounds.value += 1;
         }
      }

      // Update the amount of stamina
      await this.parent.update(updateData);

      // Create the damage report message
      const chatContext = {
         type: 'damageReport',
         actorName: this.parent.name,
         baseDamage: baseDamage,
         damage: damage,
         ignoreArmor: ignoreArmor ?? false,
         armor: this.parent.system.mod.armor.value,
         stamina: this.parent.system.resource.stamina,
         wounds: this.parent.system.resource.wounds,
      };

      // Send the damage report to chat
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
         }

      });

      return;
   }

   // Apply damage to the actor
   async healDamage(healing) {
      // Prepare the update data
      const updateData = {
         system: {
            resource: {
               stamina: {
                  value: Math.max(this.parent.system.resource.stamina.value + healing, this.parent.system.resource.stamina.maxValue)
               },
            },
         },
      };

      // Update the amount of stamin
      await this.parent.update(updateData);

      // Create the damage report message
      const chatContext = {
         type: 'healingReport',
         actorName: this.parent.name,
         healing: healing,
         stamina: this.parent.system.resource.stamina,
         wounds: this.parent.system.resource.wounds,
      };

      // Send the damage report to chat
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
         }
      });

      return;
   }

   equipArmor(armorId) {
      // Ensure the armor is valid
      const armor = this.parent.items.get(armorId);
      if (!armor && armor.type === 'armor') {
         console.error('TITAN | Error equipping Armor. Invalid Armor ID.');
      }

      // Update the armor
      let equippedArmor = this.parent.system.equipped.armor;
      equippedArmor = armorId;
      this.parent.update({
         system: {
            equipped: {
               armor: equippedArmor,
            },
         },
      });

      return;
   }

   unEquipArmor() {
      // Remove the armor
      let equippedArmor = this.parent.system.equipped.armor;
      equippedArmor = null;
      this.parent.update({
         system: {
            equipped: {
               armor: equippedArmor,
            },
         },
      });

      return;
   }

   deleteItem(id) {
      // Remove the armor if appropriate
      const armorId = this.parent.system.equipped.armor;
      if (armorId === id) {
         this.unEquipArmor();
      }

      return;
   }

   async clearTemporaryEffects() {
      const systemData = this.parent.system;

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

      // Update the actor
      await this.parent.update({
         system: this.parent.system
      });

      // Delete all Temporary Effects
      let temporaryEffects = this.parent.items.filter((item) => {
         return item.type === 'effect' && item.system.duration === 'temporary';
      });
      temporaryEffects.forEach((item) => {
         return this.parent.deleteItem(item._id);
      });

      return;
   }

   async takeABreather() {
      // Clear temporary effects
      this.clearTemporaryEffects();

      // Reset stamina to max
      const stamina = this.parent.system.resource.stamina.maxValue;

      // Update the actor
      await this.parent.update({
         system: {
            resource: {
               stamina: {
                  value: stamina
               }
            }
         }
      });

      return;
   }

   async rest() {
      await this.takeABreather();

      // Decrease wounds by 1
      let wounds = this.parent.system.resource.wounds.value;
      if (wounds > 0) {
         wounds -= 1;
         await this.parent.update({
            system: {
               resource: {
                  wounds: {
                     value: wounds
                  }
               }
            }
         });
      }

      return;
   }
}
