import TitanActorSheet from "~/actor/sheet/ActorSheet";

export default class TitanCharacterSheet extends TitanActorSheet {
   // Toggle equipped
   async toggleEquipped(itemId) {
      const item = this.reactive.document.items.get(itemId);
      // If the item is valid
      if (item) {
         // If the item is armor
         if (item.type === 'armor') {
            // If the armor is equipped, un-equip it
            if (this.reactive.document.system.equipped.armor === itemId) {
               this.reactive.document.typeComponent.unEquipArmor();
            }

            // Else, equip it
            else {
               this.reactive.document.typeComponent.equipArmor(itemId);
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
      const getOptions = game.settings.get('titan', 'getCheckOptions') === true || event.shiftKey;

      await this.reactive.document.typeComponent.rollResistanceCheck({
         resistance: resistance,
         getOptions: getOptions,
      });

      return;
   }

   // Function for rolling a skill check
   async rollSkillCheck(skill) {
      const getOptions = game.settings.get('titan', 'getCheckOptions') === true || event.shiftKey;

      await this.reactive.document.typeComponent.rollAttributeCheck({
         attribute: this.reactive.document.system.skill[skill].defaultAttribute,
         skill: skill,
         getOptions: getOptions,
      });

      return;
   }

   // Function for rolling a straight attribute check
   async rollAttributeCheck(attribute) {
      const getOptions = game.settings.get('titan', 'getCheckOptions') === true || event.shiftKey;

      await this.reactive.document.typeComponent.rollAttributeCheck({
         attribute: attribute,
         getOptions: getOptions,
         skill: 'none',
      });

      return;
   }

   // Function for rolling an attack check
   async rollAttackCheck(itemId, attackIdx) {
      const getOptions = game.settings.get('titan', 'getCheckOptions') === true || event.shiftKey;

      await this.reactive.document.typeComponent.rollAttackCheck({
         itemId: itemId,
         attackIdx: attackIdx,
         getOptions: getOptions,
      });

      return;
   }

   // Function for rolling an casting check
   async rollCastingCheck(itemId) {
      const getOptions = game.settings.get('titan', 'getCheckOptions') === true || event.shiftKey;

      await this.reactive.document.typeComponent.rollCastingCheck({
         itemId: itemId,
         getOptions: getOptions,
      });

      return;
   }

   // Function for rolling an casting check
   async rollItemCheck(itemId, checkIdx) {
      const getOptions = game.settings.get('titan', 'getCheckOptions') === true || event.shiftKey;

      await this.reactive.document.typeComponent.rollItemCheck({
         itemId: itemId,
         checkIdx: checkIdx,
         getOptions: getOptions,
      });

      return;
   }

   // Embedded item edit
   async editItem(id) {
      const item = this.reactive.document.items.get(id);
      item.sheet.render(true);
      return;
   }

   // Delete Item
   async deleteItem(id) {
      this.reactive.state.deleteItem(id);
      this.reactive.document.deleteItem(id);
      return;
   }

   // Add item
   async addItem(type) {
      this.reactive.document.addItem(type);
      return;
   }

   _clearTempEffectsFromState() {
      // Delete all Temp Effects and Mods
      let temporaryEffects = this.reactive.document.items.filter((item) => {
         return item.type === 'effect' && item.system.duration === 'temporary';
      });
      temporaryEffects.forEach((item) => {
         return this.reactive.state.deleteItem(item._id);
      });
   }

   async clearTemporaryEffects() {
      this._clearTempEffectsFromState();
      await this.reactive.document.typeComponent.clearTemporaryEffects();
      return;
   }

   async takeABreather() {
      this._clearTempEffectsFromState();
      await this.reactive.document.typeComponent.takeABreather();
      return;
   }

   async rest() {
      this._clearTempEffectsFromState();
      await this.reactive.document.typeComponent.rest();
      return;
   }
}