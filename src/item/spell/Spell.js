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

      // Inflict Condition
      const inflictCondition = standardAspects.inflictCondition;
      inflictCondition.cost = 0;
      if (inflictCondition.enabled) {

         const conditions = inflictCondition.conditions;

         if (conditions.blinded) {
            inflictCondition.cost += 4;
         }

         if (conditions.charmed) {
            inflictCondition.cost += 2;
         }

         if (conditions.deafened) {
            inflictCondition.cost += 1;
         }

         if (conditions.frightened) {
            inflictCondition.cost += 3;
         }

         if (conditions.incapacitated) {
            inflictCondition.cost += 6;
         }

         if (conditions.poisoned) {
            inflictCondition.cost += 4;
         }

         if (conditions.prone) {
            inflictCondition.cost += 2;
         }

         if (conditions.restrained) {
            inflictCondition.cost += 5;
         }

         if (conditions.stunned) {
            inflictCondition.cost += 4;
         }

         if (conditions.unconscious) {
            inflictCondition.cost += 7;
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
            for (const [key, value] of Object.entries(removeCondition.conditions)) {
               if (value === true & removeCondition.cost < 5) {
                  removeCondition.cost = Math.min(removeCondition.cost + 2, 5);
               }
            }
         }
      }
   }
}