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
               range.cost = 2;
               break;
            }
            case "30m": {
               range.cost = 3;
               break;
            }
            case "50m": {
               range.cost = 4;
               break;
            }
            default: {
               console.error(`TITAN | Invalid Range Case for Spell (${this.parent.name})`);
               break;
            }
         }
      }
      else {
         range.cost = 0;
      }

      // Target
      const target = standardAspects.target;
      if (target.enabled) {
         switch (standardAspects.target.value) {
            case "target": {
               target.cost = 1;
               break;
            }
            case "5mRadius": {
               target.cost = 3;
               break;
            }
            case "10mRadius": {
               target.cost = 6;
               break;
            }
            default: {
               console.error(`TITAN | Invalid Target Case for Spell (${this.parent.name})`);
               break;
            }
         }
      }
      else {
         target.cost = 0;
      }

      // Damage
      const damage = standardAspects.damage;
      if (damage.enabled) {
         if (damage.ignoreArmor === false || damage.resistance !== "none") {
            damage.cost = 1;
         }
         else {
            damage.cost = 2;
         }
      }
      else {
         damage.cost = 0;
      }

      // Healing
      const healing = standardAspects.healing;
      if (healing.enabled) {
         healing.cost = 1;
      }
      else {
         healing.cost = 0;
      }

      // Rounds
      const rounds = standardAspects.rounds;
      if (rounds.enabled) {
         rounds.cost = 1;
      }
      else {
         rounds.cost = 0;
      }

      // Decrease Mod
      const decreaseMod = standardAspects.decreaseMod;
      decreaseMod.cost = 0;
      if (decreaseMod.enabled) {
         for (const [key, value] of Object.entries(decreaseMod.mod)) {
            if (value === true) {
               decreaseMod.cost += 2;
            }
         }
         if (decreaseMod.resistance !== "none") {
            decreaseMod.cost = Math.ceil(decreaseMod.cost / 2);
         }
      }

      // Increase Mod
      const increaseMod = standardAspects.increaseMod;
      increaseMod.cost = 0;
      if (increaseMod.enabled) {
         for (const [key, value] of Object.entries(increaseMod.mod)) {
            if (value === true) {
               increaseMod.cost += 2;
            }
         }
      }

      // Decrease Rating
      const decreaseRating = standardAspects.decreaseRating;
      decreaseRating.cost = 0;
      if (decreaseRating.enabled) {
         for (const [key, value] of Object.entries(decreaseRating.rating)) {
            if (value === true) {
               decreaseRating.cost += 1;
            }
         }
         if (decreaseRating.resistance !== "none") {
            decreaseRating.cost = Math.ceil(decreaseRating.cost / 2);
         }
      }

      // Increase Rating
      const increaseRating = standardAspects.increaseRating;
      increaseRating.cost = 0;
      if (increaseRating.enabled) {
         for (const [key, value] of Object.entries(increaseRating.rating)) {
            if (value === true) {
               increaseRating.cost += 1;
            }
         }
      }

      // Inflict Condition
      const inflictCondition = standardAspects.inflictCondition;
      inflictCondition.cost = 0;
      if (inflictCondition.enabled) {
         const condition = inflictCondition.condition;

         if (condition.blinded) {
            inflictCondition.cost += 4;
         }

         if (condition.charmed) {
            inflictCondition.cost += 2;
         }

         if (condition.deafened) {
            inflictCondition.cost += 1;
         }

         if (condition.frightened) {
            inflictCondition.cost += 3;
         }

         if (condition.incapacitated) {
            inflictCondition.cost += 6;
         }

         if (condition.poisoned) {
            inflictCondition.cost += 4;
         }

         if (condition.prone) {
            inflictCondition.cost += 2;
         }

         if (condition.restrained) {
            inflictCondition.cost += 5;
         }

         if (condition.stunned) {
            inflictCondition.cost += 4;
         }

         if (condition.unconscious) {
            inflictCondition.cost += 7;
         }

         if (inflictCondition.resistance !== "none") {
            inflictCondition.cost = Math.ceil(inflictCondition.cost / 2);
         }
      }

      // Remove Condition
      const removeCondition = standardAspects.removeCondition;
      removeCondition.cost = 0;
      if (removeCondition.enabled) {
         if (removeCondition.all) {
            removeCondition.cost = 5;
         }
         else {
            for (const [key, value] of Object.entries(removeCondition.condition)) {
               if (value === true & removeCondition.cost < 5) {
                  removeCondition.cost = Math.min(removeCondition.cost + 2, 5);
               }
            }
         }
      }
   }
}