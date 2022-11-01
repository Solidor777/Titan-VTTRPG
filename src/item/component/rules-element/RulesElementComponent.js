import { getFlatModifierTemplate } from "~/rules-element/FlatModifier.js";

export async function addRulesElement() {
   if (this.parent.isOwner) {
      // Get a new element
      const newElement = getFlatModifierTemplate();

      // Set the element type to this item
      newElement.type = this.parent.type;

      // Add the item to the rules element ware
      const idx = this.parent.system.rulesElement.push(newElement) - 1;
      await this.parent.update({
         system: this.parent.system
      });

      // Alert the type component
      if (this.typeComponent) {
         this.typeComponent.onAddRulesElement(idx);
      }
   }

   return;
}

export async function removeRulesElement(idx) {
   if (this.parent.isOwner) {
      // Remove the element
      this.parent.system.rulesElement.splice(idx, 1);
      await this.parent.update({
         system: this.parent.system
      });

      // Alert the type component
      if (this.typeComponent) {
         this.typeComponent.onRemoveRulesElement(idx);
      }
   }


   return;
}