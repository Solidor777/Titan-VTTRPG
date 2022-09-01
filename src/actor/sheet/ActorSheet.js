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

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      if (game.user.isGM || (this.reactive.document.isOwner && game.user.can("TOKEN_CONFIGURE"))) {
         buttons.splice(1, 0, {
            label: this.token ? "Token" : "TOKEN.TitlePrototype",
            class: "configure-token",
            icon: "fas fa-user-circle",
            onclick: (ev) => this._onConfigureToken(ev),
         });
      }

      return buttons;
   }

   // Is Expanded data
   isExpanded = {
      inventory: {},
      actions: {
         items: {}
      },
      spells: {},
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

      if (this.isExpanded.inventory[id]) {
         delete this.isExpanded.inventory[id];
      }

      if (this.isExpanded.actions.items[id]) {
         delete this.isExpanded.actions.items[id];
      }

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
         case "armor": {
            itemName = game.i18n.localize(CONFIG.TITAN.local.newArmor);
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
   async toggleEquipped(itemId) {
      const item = this.reactive.document.items.get(itemId);
      // If the item is valid
      if (item) {
         // If the item is armor
         if (item.type === "armor") {
            // If the armor is equipped, un-equip it
            if (this.reactive.document.system.equipped.armor === itemId) {
               this.reactive.document.unEquipArmor();
            }

            // Else, equip it
            else {
               this.reactive.document.equipArmor(itemId);
            }
         }

         // Otherwise, update the equipped value on the item
         else {
            const updateData = {
               system: {
                  equipped: !item.system.equipped,
               },
            };

            item.update(updateData);
         }
      }
      return;

   }

   // Toggle multi attack
   async toggleMultiAttack(id) {
      const item = this.reactive.document.items.get(id);
      const updateData = {
         system: {
            multiAttack: !item.system.multiAttack,
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

   // Function for rolling an attack check
   async rollAttackCheck(itemId, attackIdx) {
      const getOptions = game.settings.get("titan", "getCheckOptions") === true || event.shiftKey;

      await this.reactive.document.rollAttackCheck({
         itemId: itemId,
         attackIdx: attackIdx,
         getOptions: getOptions,
      });

      return;
   }
}