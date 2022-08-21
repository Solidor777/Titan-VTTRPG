import { TitanTypeComponent } from "~/helpers/TypeComponent.js";

export class TitanSpell extends TitanTypeComponent {
   prepareDerivedData() {
      // Auto calculate aspect cost
      const standardAspects = this.parent.system.standardAspects;
      // Range
      const range = standardAspects.range;
      if (range.enabled) {
         switch (standardAspects.range.value) {
            case "self": {
               range.cost = 0;
               break;
            }
            case "touch": {
               range.cost = 1;
               break;
            }
            case "10m": {
               range.cost = 3;
               break;
            }
            case "30m": {
               range.cost = 4;
               break;
            }
            case "50m": {
               range.cost = 5;
               break;
            }
         }
      }
   }
}