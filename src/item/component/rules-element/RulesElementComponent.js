import { getFlatModifierTemplate } from "~/rules-element/FlatModifier.js";

export async function addRulesElement() {
   if (this.parent.isOwner) {
      // Get a new element
      const newElement = getFlatModifierTemplate();

      // Set the element type to this item
      switch (this.parent.type) {
         case 'ability': {
            newElement.type = 'ability';
            break;
         }
         case 'effect': {
            newElement.type = 'effect';
            break;
         }
         default: {
            newElement.type = 'equipment';
            break;
         }
      }

      // Add the item to the rules element container
      this.parent.system.rulesElement.push(newElement);
      await this.parent.update({
         system: this.parent.system
      });
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
   }

   return;
}