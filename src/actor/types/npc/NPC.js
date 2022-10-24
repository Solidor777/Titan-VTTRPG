import TitanCharacterComponent from '../character/Character';

export default class TitanNPCComponent extends TitanCharacterComponent {
   // Prepare NPC type specific data
   prepareDerivedData() {
      super.prepareDerivedData();
      this.parent.system.xp = this._getSpentXP();

      return;
   }
}