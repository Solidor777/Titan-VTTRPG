import { getFlatModifierTemplate } from "~/rules-element/FlatModifier";

export async function addRulesElement() {
   // Get a new element
   const newElement = getFlatModifierTemplate();

   // Set the element type to this item
   newElement.type = this.type;

   // Add the item to the rules element ware
   const idx = this.system.rulesElement.push(newElement) - 1;
   await this.update({
      system: this.system
   });

   // Alert the type component
   if (this.typeComponent) {
      this.typeComponent.onAddRulesElement(idx);
   }

   return idx;
}

export async function removeRulesElement(idx) {
   // Remove the element
   this.system.rulesElement.splice(idx, 1);
   await this.update({
      system: this.system
   });

   // Alert the type component
   if (this.typeComponent) {
      this.typeComponent.onRemoveRulesElement(idx);
   }

   return;
}