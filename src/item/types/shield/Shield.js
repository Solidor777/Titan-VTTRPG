import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';
import ShieldEditTraitsDialog from '~/item/types/shield/ShieldEditTraitsDialog';

export default class TitanShield extends TitanTypeComponent {

   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   setInitialData(initialData) {
      initialData.img = 'icons/svg/shield.svg';
      return;
   }

   editShieldTraits() {
      if (this.parent.isOwner) {
         const dialog = new ShieldEditTraitsDialog(this.parent);
         dialog.render(true);
      }

      return;
   }
}