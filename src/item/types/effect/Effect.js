import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEffect extends TitanTypeComponent {
   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   setInitialData(initialData) {
      initialData.img = 'icons/svg/daze.svg';
      return;
   }

   isExpired() {
      return this.parent.system.duration.type !== 'permanent' && this.parent.system.duration.remaining <= 0;
   }

   isActive() {
      return this.parent.system.active || this.parent.system.duration.type !== 'permanent';
   }
}
