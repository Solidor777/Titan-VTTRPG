import { getSetting } from '~/helpers/Utility';
import TitanCharacterComponent from '~/actor/types/character/Character';

export default class TitanNPCComponent extends TitanCharacterComponent {
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
            systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaMultiplier')), 1);
            systemData.resource.resolve.maxBase = Math.ceil(Math.ceil(systemData.attribute.soul.baseValue * getSetting('resolveMultiplier')), 1);
            systemData.resource.wounds.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('woundsMultiplier')), 1);
            break;
         }
         case 'elite': {
            systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaMultiplier')), 1);
            systemData.resource.resolve.maxBase = Math.ceil(Math.ceil(systemData.attribute.soul.baseValue * getSetting('resolveMultiplier')), 1);
            systemData.resource.wounds.maxBase = 0;
            break;
         }
         case 'warrior': {
            systemData.resource.stamina.maxBase = Math.max(Math.ceil(totalBaseAttributeValue * getSetting('staminaMultiplier')), 1);
            systemData.resource.resolve.maxBase = 0;
            systemData.resource.wounds.maxBase = 0;
            break;
         }
         case 'minion': {
            systemData.resource.stamina.maxBase = 1;
            systemData.resource.resolve.maxBase = 0;
            systemData.resource.wounds.maxBase = 0;
            break;
         }
         default: {
            break;
         }
      }
   }
}