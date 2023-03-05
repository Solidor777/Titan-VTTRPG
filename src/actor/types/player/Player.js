import TitanCharacterComponent from '~/actor/types/character/Character.js';

export default class TitanPlayerComponent extends TitanCharacterComponent {

   setInitialData(initialData) {
      super.setInitialData(initialData);
      const prototypeToken = initialData.prototypeToken;
      prototypeToken.vision = true;
      prototypeToken.actorLink = true;
      prototypeToken.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;

      return;
   }

   // Prepare Player type specific data
   prepareDerivedData() {
      super.prepareDerivedData();
      const xp = this.parent.system.xp;
      xp.available = xp.earned - this._getSpentXP();

      return;
   }

   _getAttributeXPCost(value) {
      // Attribute Cost starts at 2 for rank 2, and increases by consecutive odd integers, starting with 5
      let retVal = 0;
      let intervalCost = 2;
      let oddNumber = 5;
      for (let idx = 1; idx < value; idx++) {
         retVal += intervalCost;
         intervalCost = oddNumber;
         oddNumber += 2;
      }

      return retVal;
   }

   _getSkillXPCost(value) {
      // Skill Cost starts at 1 for rank 1, and increases by consecutive even integers, starting with 2
      let retVal = 0;
      let intervalCost = 1;
      let evenNumber = 2;
      for (let idx = 0; idx < value; idx++) {
         retVal += intervalCost;
         intervalCost = evenNumber;
         evenNumber += 2;
      }

      return retVal;
   }
}