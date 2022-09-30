import { localize } from '~/helpers/Utility';
import TitanPlayerComponent from './types/player/Player.js';
import TitanNPCComponent from './types/npc/NPC.js';
export default class TitanActor extends Actor {

   // Prepare calculated data
   prepareDerivedData() {
      // Create type component if necessary
      if (!this.typeComponent) {
         this._initializeTypeComponent();
      }

      // Prepare type specific data
      if (this.typeComponent) {
         this.typeComponent.prepareDerivedData();
      }

      return;
   }

   _initializeTypeComponent() {
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

   _onCreate(data, options, userId) {
      super._onCreate(data, options, userId);
      this._initializeTypeComponent();
      if (this.typeComponent) {
         this.typeComponent.onCreate();
      }
   }

   _onDelete(options, userId) {
      if (this.typeComponent) {
         this.typeComponent.onDelete();
      }
      super._onDelete(options, userId);
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

      if (item.type === "effect" && item.system.effectId !== "") {
         const effect = this.effects.get(item.system.effectId);
         effect.delete();
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
         case 'commodity': {
            itemName = localize('newCommodity');
            break;
         }
         case 'effect': {
            itemName = localize('newEffect');
            break;
         }
         case 'equipment': {
            itemName = localize('newEquipment');
            break;
         }
         case 'spell': {
            itemName = localize('newSpell');
            break;
         }
         case 'weapon': {
            itemName = localize('newWeapon');
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
