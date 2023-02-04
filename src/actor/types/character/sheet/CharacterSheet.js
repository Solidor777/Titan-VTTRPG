import TitanActorSheet from "~/actor/sheet/ActorSheet";
import { getOptions } from "~/helpers/Utility";
import createCharacterSheetState from "./CharacterSheetState";
import CharacterSheetInventoryAddItemDialog from "~/actor/types/character/sheet/tabs/inventory/CharacterSheetInventoryAddItemDialog";

export default class TitanCharacterSheet extends TitanActorSheet {
   constructor(object) {
      super(object);
      this.reactive.state = createCharacterSheetState();
   }

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

   addInventoryItem() {
      if (this.reactive.document.isOwner) {
         const dialog = new CharacterSheetInventoryAddItemDialog(this.reactive.document);
         dialog.render(true);
      }
      return;
   }

   // Delete Item
   deleteItem(itemId) {
      this.reactive.state.deleteItem(itemId);

      return;
   }
}