import { TitanWeapon } from "./weapon/Weapon";
export class TitanItem extends Item {
   prepareDerivedData() {
      // Prepare universal character data
      this._prepareCharacterData();

      // Create type component if necessary
      if (!this.system.typeComponent) {
         switch (this.type) {
            // Weapon
            case "player": {
               this.typeComponent = new TitanWeapon(this);
               this.weapon = this.typeComponent;
               break;
            }

            // Default is an error
            default: {
               console.error("TITAN: Invalid item type when preparing derived data.");
               break;
            }
         }
      }

      // Prepare type specific data
      this.typeComponent.prepareDerivedData();

      return;
   }
}
