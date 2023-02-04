import { isFirstOwner } from '~/helpers/Utility';
import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';
import ShieldEditTraitsDialog from '~/item/types/shield/ShieldEditTraitsDialog';

export default class TitanShield extends TitanTypeComponent {

   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   onCreate() {
      if (isFirstOwner(this.parent) && this.parent.img === 'icons/svg/item-bag.svg') {
         this.initializeImg();
      }
   }

   async initializeImg() {
      this.parent.img = 'icons/svg/shield.svg';
      return await this.parent.update({
         img: 'icons/svg/shield.svg'
      });
   }

   editShieldTraits() {
      if (this.parent.isOwner) {
         const dialog = new ShieldEditTraitsDialog(this.parent);
         dialog.render(true);
      }

      return;
   }
}