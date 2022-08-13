import { SvelteDocumentSheet } from '~/documents/DocumentSheet';

export default class TitanActorSheet extends SvelteDocumentSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 750,
         height: 800,
      });
   }

   // Is Expanded data
   isExpanded = {
      inventory: {}
   };

   // Embedded item edit
   async editItem(id) {
      const item = this.reactive.document.items.get(id);
      item.sheet.render(true);
      return;
   }

   // Delete Item
   async deleteItem(id) {
      this.reactive.document.deleteItem(id);
      return;
   }

   // Add item
   async addItem(type) {


      let itemName = "";
      switch (type) {
         case "weapon": {
            itemName = game.i18n.localize(CONFIG.TITAN.local.newWeapon);
            break;
         }
         default: {
            itemName = "New Item";
            break;
         }
      }

      let itemData = {
         name: itemName,
         type: type,
      };

      this.reactive.document.createEmbeddedDocuments("Item", [itemData]);

      return;
   }

   // Toggle equipped
   async toggleEquipped(id) {
      const item = this.reactive.document.items.get(id);
      const updateData = {
         system: {
            equipped: !item.system.equipped,
         },
      };

      item.update(updateData);

      return;
   }

   // Check rolls
   async rollResistanceCheck(resistance) {
      const getOptions = game.settings.get("titan", "getCheckOptions") === true || event.shiftKey;

      await this.reactive.document.rollResistanceCheck({
         resistance: resistance,
         getOptions: getOptions,
      });

      return;
   }

   // Function for rolling a skill check
   async rollSkillCheck(skill) {
      const getOptions = game.settings.get("titan", "getCheckOptions") === true || event.shiftKey;

      await this.reactive.document.rollAttributeCheck({
         attribute: this.reactive.document.system.skill[skill].defaultAttribute,
         skill: skill,
         getOptions: getOptions,
      });

      return;
   }

   // Function for rolling a straight attribute check
   async rollAttributeCheck(attribute) {
      const getOptions = game.settings.get("titan", "getCheckOptions") === true || event.shiftKey;

      await this.reactive.document.rollAttributeCheck({
         attribute: attribute,
         getOptions: getOptions,
         skill: "none",
      });

      return;
   }
}