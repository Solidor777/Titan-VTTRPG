import { localize } from '~/helpers/Utility.js';
import SvelteDocumentSheet from '~/documents/DocumentSheet';
export default class TitanItemSheet extends SvelteDocumentSheet {

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      buttons.unshift({
         class: 'send-to-chat',
         icon: 'fas fa-comment',
         label: localize('sendToChat'),
         onclick: (ev) => this.reactive.document.sendToChat(),
      });

      return buttons;
   }

   async addCheck() {
      this.reactive.state.addCheck();
      return await this.reactive.document.addCheck();
   }

   async removeCheck(idx) {
      this.reactive.state.removeCheck(idx);
      return await this.reactive.document.removeCheck(idx);
   }

}