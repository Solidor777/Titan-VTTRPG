import { localize } from '~/helpers/Utility.js';
import SvelteDocumentSheet from '~/documents/DocumentSheet';
import { addRuleElement } from '~/rules-elements/RuleElement';
import { removeRuleElement } from '../../rules-elements/RuleElement';
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

   async addRulesElement() {
      return await addRuleElement(this.reactive.document);
   }

   async removeRulesElement(idx) {
      return await removeRuleElement(this.reactive.document, idx);
   }
}