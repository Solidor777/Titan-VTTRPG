import { localize } from '~/helpers/Utility.js';
import SvelteDocumentSheet from '~/documents/DocumentSheet';
export default class TitanItemSheet extends SvelteDocumentSheet {

   item = this.reactive.document;

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      buttons.unshift({
         class: 'send-to-chat',
         icon: 'fas fa-comment',
         label: localize('sendToChat'),
         onclick: () => this.reactive.document.sendToChat(),
      });

      return buttons;
   }

   addCheck() {
      this.reactive.state.addCheck();

      return;
   }

   async removeCheck(idx) {
      this.reactive.state.removeCheck(idx);

      return;
   }
}