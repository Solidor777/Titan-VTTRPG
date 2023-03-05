import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';
import ArmorEditTraitsDialog from '~/item/types/armor/ArmorEditTraitsDialog';

export default class TitanArmor extends TitanTypeComponent {
   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   setInitialData(initialData) {
      initialData.img = 'icons/svg/statue.svg';
      return;
   }

   editArmorTraits() {
      if (this.parent.isOwner) {
         const dialog = new ArmorEditTraitsDialog(this.parent);
         dialog.render(true);
      }
      return;
   }
}