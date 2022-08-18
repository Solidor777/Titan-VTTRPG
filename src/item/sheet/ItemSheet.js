import { SvelteDocumentSheet } from '~/documents/DocumentSheet';

export default class TitanItemSheet extends SvelteDocumentSheet {

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      buttons.unshift({
         class: "send-to-chat",
         icon: "fas fa-comment",
         label: game.i18n.localize(CONFIG.TITAN.local.sendToChat),
         onclick: (ev) => this.reactive.document.sendToChat(),
      });

      return buttons;
   }
}