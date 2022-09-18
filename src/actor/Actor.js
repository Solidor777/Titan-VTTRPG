import { localize } from '~/helpers/Utility';
import TitanPlayerComponent from './types/player/Player.js';
import TitanNPCComponent from './types/npc/NPC.js';
export default class TitanActor extends Actor {

   // Prepare calculated data
   prepareDerivedData() {
      // Create type component if necessary
      if (!this.system.typeComponent) {
         switch (this.type) {
            // Player
            case 'player': {
               this.typeComponent = new TitanPlayerComponent(this);
               this.player = this.typeComponent;
               break;
            }

            // NPC
            case 'npc': {
               this._prepareNpcData();
               this.typeComponent = new TitanNPCComponent(this);
               this.npc = this.typeComponent;
               break;
            }

            // Default is an error
            default: {
               console.error('TITAN: Invalid actor type when preparing derived data.');
               break;
            }
         }
      }

      // Prepare type specific data
      if (this.typeComponent) {
         this.typeComponent.prepareDerivedData();
      }

      return;
   }

   deleteItem(id) {
      // Ensure the item is valid
      const item = this.items.get(id);
      if (!item) {
         return false;
      }

      // Handle type specific deletion
      if (this.type === 'player' || this.type === 'npc') {
         this.typeComponent.deleteItem(id);
      }

      // Delete the item
      item.delete();
   }

   addItem(type) {
      let itemName = '';
      switch (type) {
         case 'ability': {
            itemName = localize('newAbility');
            break;
         }
         case 'armor': {
            itemName = localize('newArmor');
            break;
         }
         case 'weapon': {
            itemName = localize('newWeapon');
            break;
         }
         case 'spell': {
            itemName = localize('newSpell');
            break;
         }
         default: {
            itemName = localize('newItem');
            break;
         }
      }

      let itemData = {
         name: itemName,
         type: type,
      };

      this.createEmbeddedDocuments('Item', [itemData]);
   }
}
