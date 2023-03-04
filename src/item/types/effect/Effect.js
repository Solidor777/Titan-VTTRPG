import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEffect extends TitanTypeComponent {
   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   getInitialData() {
      // Image
      if (this.parent.img === 'icons/svg/item-bag.svg') {
         return {
            img: 'icons/svg/daze.svg'
         };
      }

      return false;
   }

   isExpired() {
      return this.parent.system.duration.type !== 'permanent' && this.parent.system.duration.remaining <= 0;
   }

   isActive() {
      return this.parent.system.active || this.parent.system.duration.type !== 'permanent';
   }
}
