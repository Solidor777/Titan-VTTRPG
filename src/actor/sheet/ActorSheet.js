import { localize } from '~/helpers/Utility';
import SvelteDocumentSheet from '~/documents/DocumentSheet';
import createActorSheetState from './ActorSheetState';

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

   constructor(object) {
      super(object);
      this.reactive.state = createActorSheetState();
   }

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      if (game.user.isGM || (this.reactive.document.isOwner && game.user.can('TOKEN_CONFIGURE'))) {
         buttons.splice(1, 0, {
            label: this.token ? 'Token' : 'TOKEN.TitlePrototype',
            class: 'configure-token',
            icon: 'fas fa-user-circle',
            onclick: (ev) => this._onConfigureToken(ev),
         });
      }

      return buttons;
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
         case 'weapon': {
            itemName = localize('newWeapon');
            break;
         }
         case 'spell': {
            itemName = localize('newSpell');
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

      this.reactive.document.createEmbeddedDocuments('Item', [itemData]);

      return;
   }
}