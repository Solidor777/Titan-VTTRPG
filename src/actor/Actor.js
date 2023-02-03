import { localize } from '~/helpers/Utility';
import TitanPlayerComponent from '~/actor/types/player/Player.js';
import TitanNPCComponent from '~/actor/types/npc/NPC.js';
export default class TitanActor extends Actor {

   async _preCreate(data, options, user) {
      await super._preCreate(data, options, user);

      const initData = {
         'prototypeToken.bar1': { attribute: 'resource.stamina' },
         'prototypeToken.bar2': { attribute: 'resource.wounds' },
         'prototypeToken.displayName': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
         'prototypeToken.displayBars': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      };

      if (data.type === 'player') {
         initData['prototypeToken.vision'] = true;
         initData['prototypeToken.actorLink'] = true;
         initData['prototypeToken.disposition'] = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
      }
      else if (data.type === 'npc') {
         initData['prototypeToken.disposition'] = CONST.TOKEN_DISPOSITIONS.HOSTILE;
      }

      this.updateSource(initData);
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

   deleteItem(itemId) {
      if (this.isOwner) {
         // Ensure the item is valid
         const item = this.items.get(itemId);
         if (!item) {
            return false;
         }

         // Handle type specific deletion
         if (this.type === 'player' || this.type === 'npc') {
            this.typeComponent.deleteItem(itemId);
         }

         // Delete the item
         item.delete();
      }
   }

   addItem(type) {
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

         let itemData = {
            name: itemName,
            type: type,
         };

         this.createEmbeddedDocuments('Item', [itemData]);
      }
   }
}
