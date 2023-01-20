import TitanActorSheet from "~/actor/sheet/ActorSheet";
import { getOptions } from "~/helpers/Utility";
import CharacterSheetDeleteItemDialog from "./CharacterSheetDeleteItemDialog";
import CharacterSheetInventoryAddItemDialog from "./tabs/inventory/CharacterSheetInventoryAddItemDialog";

export default class TitanCharacterSheet extends TitanActorSheet {
   // Toggle equipped
   async toggleEquipped(itemId) {
      if (this.reactive.document.isOwner) {
         this.reactive.document.typeComponent.toggleEquipped(itemId);
      }

      return;
   }

   // Toggle multi attack
   async toggleMultiAttack(itemId) {
      if (this.reactive.document.isOwner) {
         this.reactive.document.typeComponent.toggleMultiAttack(itemId);
      }

      return;
   }

   // Check rolls
   async rollResistanceCheck(resistance) {
      if (this.reactive.document.isOwner) {
         await this.reactive.document.typeComponent.rollResistanceCheck({
            resistance: resistance,
            getOptions: getOptions(),
         });
      }

      return;
   }

   // Function for rolling a skill check
   async rollSkillCheck(skill) {
      if (this.reactive.document.isOwner) {
         await this.reactive.document.typeComponent.rollAttributeCheck({
            skill: skill,
            getOptions: getOptions(),
         });

      }

      return;
   }

   // Function for rolling a straight attribute check
   async rollAttributeCheck(attribute) {
      if (this.reactive.document.isOwner) {
         await this.reactive.document.typeComponent.rollAttributeCheck({
            attribute: attribute,
            getOptions: getOptions(),
         });
      }

      return;
   }

   // Function for rolling an attack check
   async rollAttackCheck(itemId, attackIdx) {
      if (this.reactive.document.isOwner) {
         await this.reactive.document.typeComponent.rollAttackCheck({
            itemId: itemId,
            attackIdx: attackIdx,
            getOptions: getOptions(),
         });
      }

      return;
   }

   // Function for rolling an casting check
   async rollCastingCheck(itemId) {
      if (this.reactive.document.isOwner) {
         await this.reactive.document.typeComponent.rollCastingCheck({
            itemId: itemId,
            getOptions: getOptions(),
         });
      }

      return;
   }

   // Function for rolling an casting check
   async rollItemCheck(itemId, checkIdx) {
      if (this.reactive.document.isOwner) {
         await this.reactive.document.typeComponent.rollItemCheck({
            itemId: itemId,
            checkIdx: checkIdx,
            getOptions: getOptions(),
         });
      }

      return;
   }

   // Embedded item edit
   async editItem(itemId) {
      const item = this.reactive.document.items.get(itemId);
      item.sheet.render(true);
      return;
   }

   // Delete Item
   async deleteItem(itemId, deletionConfirmed) {
      console.log(deletionConfirmed);
      if (this.reactive.document.isOwner) {
         if (!deletionConfirmed && game.settings.get('titan', 'confirmDeletingItems')) {
            const item = this.reactive.document.items.get(itemId);
            if (item) {
               const dialog = new CharacterSheetDeleteItemDialog(this, item.name, itemId);
               dialog.render(true);
            }
         }
         else {
            this.reactive.state.deleteItem(itemId);
            this.reactive.document.deleteItem(itemId);
         }
      }

      return;
   }

   // Add item
   async addItem(type) {
      if (this.reactive.document.isOwner) {
         this.reactive.document.addItem(type);
      }
      return;
   }

   _clearTempEffectsFromState() {
      if (this.reactive.document.isOwner) {
         // Delete all Temp Effects and Mods
         let temporaryEffects = this.reactive.document.items.filter((item) => {
            return item.type === 'effect' && item.system.duration === 'temporary';
         });
         temporaryEffects.forEach((item) => {
            return this.reactive.state.deleteItem(item._id);
         });
      }

      return;
   }

   async removeTemporaryEffects(report) {
      if (this.reactive.document.isOwner) {
         this._clearTempEffectsFromState();
         await this.reactive.document.typeComponent.removeTemporaryEffects(report);
      }
      return;
   }

   async shortRest(report) {
      if (this.reactive.document.isOwner) {
         this._clearTempEffectsFromState();
         await this.reactive.document.typeComponent.shortRest(report);
      }
      return;
   }

   async longRest(report) {
      if (this.reactive.document.isOwner) {
         this._clearTempEffectsFromState();
         await this.reactive.document.typeComponent.longRest(report);
      }
      return;
   }

   addInventoryItem() {
      if (this.reactive.document.isOwner) {
         const dialog = new CharacterSheetInventoryAddItemDialog(this);
         dialog.render(true);
      }
      return;
   }
}