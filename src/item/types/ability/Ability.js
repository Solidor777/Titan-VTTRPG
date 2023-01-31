import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanAbility extends TitanTypeComponent {
   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   onCreate() {
      if (this.isFirstOwner() && this.parent.img === 'icons/svg/item-bag.svg') {
         this.initializeImg();
      }
   }

   async initializeImg() {
      return await this.parent.update({
         img: 'icons/svg/ice-aura.svg'
      });
   }
}