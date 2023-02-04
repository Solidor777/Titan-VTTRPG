import { isFirstOwner } from '~/helpers/Utility';
import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEquipment extends TitanTypeComponent {

   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   getInitialData() {
      // Image
      if (this.parent.img === 'icons/svg/item-bag.svg') {
         return {
            img: 'icons/svg/combat.svg'
         }
      }

      return false;
   }
}