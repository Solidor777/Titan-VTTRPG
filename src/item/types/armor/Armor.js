import { addCheck, removeCheck } from '~/item/component/check/CheckComponent';
import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanArmor extends TitanTypeComponent {

   // Import functions for adding and removing checks
   addCheck = addCheck.bind(this);
   removeCheck = removeCheck.bind(this);

   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);
}