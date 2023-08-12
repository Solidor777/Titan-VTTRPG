import { localize, confirmDeletingItems } from '~/helpers/Utility';
import { Hashing } from '@typhonjs-fvtt/runtime/util';
import TitanPlayerComponent from '~/actor/types/player/Player.js';
import TitanNPCComponent from '~/actor/types/npc/NPC.js';
import ConfirmDeleteItemDialog from '~/actor/dialogs/ConfirmDeleteItemDialog';
export default class TitanActor extends Actor {

   async _preCreate(data, options, user) {
      await super._preCreate(data, options, user);

      // Initialize type component
      this._initializeTypeComponent();

      // Initialize creation data
      const uuid = this.flags?.titan?.uuid;
      if (!uuid) {

         // UUID
         const initialData = {
            flags: {
               titan: {
                  uuid: Hashing.uuidv4()
               }
            }
         };

         // Type specific data
         if (this.typeComponent) {
            this.typeComponent.setInitialData(initialData);
         }

         this.updateSource(initialData);
      }
   }

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
            this.character = this.typeComponent;
            this.player = this.typeComponent;
            break;
         }

         // NPC
         case 'npc': {
            this.typeComponent = new TitanNPCComponent(this);
            this.character = this.typeComponent;
            this.npc = this.typeComponent;
            break;
         }

         // Default is an error
         default: {
            console.error('TITAN: Invalid actor type when preparing derived data.');
            console.trace();
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

   async deleteItem(itemId, confirmed) {
      if (this.isOwner) {
         // Handle type specific deletion
         if (this.type === 'player' || this.type === 'npc') {
            return this.typeComponent.deleteItem(itemId, confirmed);
         }

         // Ensure the item is valid
         const item = this.items.get(itemId);
         if (!item) {
            return false;
         }

         // Check if the deletion is confirmed
         if (confirmed || !confirmDeletingItems()) {

            // Delete the item
            if (this._sheet) {
               this._sheet.deleteItem(itemId);
            }

            return await item.delete();
         }

         // Otherwise, confirm deleting the item
         const dialog = new ConfirmDeleteItemDialog(this, item);
         dialog.render(true);

         return;
      }
   }

   async addItem(type) {
      if (this.isOwner) {
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
            case 'shield': {
               itemName = localize('newShield');
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

         const itemData = {
            name: itemName,
            type: type,
         };

         return await this.createEmbeddedDocuments('Item', [itemData]);
      }
   }
}
