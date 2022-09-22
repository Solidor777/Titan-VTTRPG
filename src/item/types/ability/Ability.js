import TitanTypeComponent from '~/helpers/TypeComponent';
import { addCheck, removeCheck } from '~/item/check-component/CheckComponent';

export default class TitanAbility extends TitanTypeComponent {

   async addCheck() {
      return await addCheck();
   }

   async removeCheck(idx) {
      return await removeCheck(idx);
   }
}