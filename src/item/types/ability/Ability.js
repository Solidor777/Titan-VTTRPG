import TitanTypeComponent from '~/helpers/TypeComponent';
import { addCheck, removeCheck } from '~/item/component/check/CheckComponent';

export default class TitanAbility extends TitanTypeComponent {

   async addCheck() {
      return await addCheck();
   }

   async removeCheck(idx) {
      return await removeCheck(idx);
   }
}