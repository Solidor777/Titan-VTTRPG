import { getSetting, getOwners } from '~/helpers/Utility';
import TitanCharacterComponent from '~/actor/types/character/Character';

export default class TitanNPCComponent extends TitanCharacterComponent {
   setInitialData(initialData) {
      super.setInitialData(initialData);
      initialData.prototypeToken.disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
      return;
   }

   // Prepare NPC type specific data
   prepareDerivedData() {
      super.prepareDerivedData();
      this.parent.system.xp = this._getSpentXP();

      return;
   }

   _calculateBaseResources() {
      const systemData = this.parent.system;
      const totalBaseAttributeValue =
         systemData.attribute.body.baseValue +
         systemData.attribute.mind.baseValue +
         systemData.attribute.soul.baseValue;

      switch (systemData.role) {
         case 'champion': {
            systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaBaseMultiplier')), 1);
            systemData.resource.resolve.maxBase = Math.ceil(Math.ceil(systemData.attribute.soul.baseValue * getSetting('resolveBaseMultiplier')), 1);
            systemData.resource.wounds.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('woundsBaseMultiplier')), 1);
            break;
         }
         case 'elite': {
            systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaBaseMultiplier')), 1);
            systemData.resource.resolve.maxBase = Math.ceil(Math.ceil(systemData.attribute.soul.baseValue * getSetting('resolveBaseMultiplier')), 1);
            systemData.resource.wounds.maxBase = 0;
            break;
         }
         case 'warrior':
         case 'minion': {
            systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaBaseMultiplier') * getSetting('staminaMinionMultiplier')), 1);
            systemData.resource.resolve.maxBase = 0;
            systemData.resource.wounds.maxBase = 0;
            break;
         }
         default: {
            break;
         }
      }
   }

   // Apply damage to the actor
   async applyDamage(damage = 1, options) {
      // If this is not a minion, do normal damage calculation
      const systemData = this.parent.system;
      if (systemData.role !== 'minion') {
         super.applyDamage(damage, options);
      }

      // If this is a minion, do minion damage calculation
      else {
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
            let overkillDamage = 0;

            // Update the actor
            // Minions die upon taking any damage
            if (damageTaken > 0) {
               stamina.value = 0;
               if (damageTaken > stamina.max) {
                  overkillDamage = damageTaken - stamina.max;
               }
            }
            if (options?.updateActor !== false) {
               await this.parent.update({
                  system: {
                     resource: {
                        stamina: {
                           value: stamina.value
                        },
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
                  }
               };

               // Overkill damage
               if (overkillDamage > 0) {
                  chatContext.overkillDamage = overkillDamage;
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

               // Send the report to chat
               this._whisperUsers(chatContext, getOwners(this.parent), game.user.id, true);
            }
         }
      }
   }
}