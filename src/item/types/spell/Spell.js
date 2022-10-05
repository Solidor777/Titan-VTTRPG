import { localize } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from 'uuid';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanSpell extends TitanTypeComponent {
   getCustomAspectTemplate() {
      return {
         label: localize('customAspect'),
         scaling: true,
         initialValue: 1,
         cost: 1,
         resistanceCheck: 'none',
         isDamage: false,
         isHealing: false,
         uuid: uuidv4()
      };
   }

   prepareDerivedData() {
      // Reset aspects array
      this.parent.aspect = [];

      // Reference to standard aspects
      const standardAspects = this.parent.system.standardAspect;

      // Range
      const rangeCosts = {
         self: 0,
         touch: 1,
         m10: 2,
         m30: 3,
         m50: 4
      };
      this._calculateStandardAspectCost(standardAspects.range, rangeCosts, 0);
      this._prepareStandardAspectData(standardAspects.range, localize('range'), false, false, false);

      // Target
      const targetCosts = {
         m5: 3,
         m10: 6,
      };
      this._calculateStandardAspectCost(standardAspects.radius, targetCosts, 0);
      this._prepareStandardAspectData(standardAspects.radius, localize('radius'), false, false, false);

      // Damage
      this._calculateStandardAspectCost(standardAspects.damage, 1, 1);
      this._prepareStandardAspectData(standardAspects.damage, localize('damage'), true, false, 1, true, false);

      // Healing
      this._calculateStandardAspectCost(standardAspects.healing, 1);
      this._prepareStandardAspectData(standardAspects.healing, localize('healing'), true, false, 1, false, true);

      // Duration
      const durationCosts = {
         rounds: 1,
         minutes: 4
      };
      this._calculateStandardAspectCost(standardAspects.duration, durationCosts);
      this._prepareStandardAspectData(standardAspects.duration, localize('duration'), true, false, 1);

      // Decrease Mod
      this._calculateStandardAspectCost(standardAspects.decreaseMod, 0, 2);
      this._prepareStandardAspectData(standardAspects.decreaseMod, localize('decreaseMod'), true, true, 1);

      // Increase Mod
      this._calculateStandardAspectCost(standardAspects.increaseMod, 0, 2);
      this._prepareStandardAspectData(standardAspects.increaseMod, localize('increaseMod'), true, true, 1);

      // Decrease Rating
      this._calculateStandardAspectCost(standardAspects.decreaseRating, 0, 1);
      this._prepareStandardAspectData(standardAspects.decreaseRating, localize('decreaseRating'), true, true, 1);

      // Increase Rating
      this._calculateStandardAspectCost(standardAspects.increaseRating, 0, 1);
      this._prepareStandardAspectData(standardAspects.increaseRating, localize('increaseRating'), true, true, 1);

      // Decrease Resistance
      this._calculateStandardAspectCost(standardAspects.decreaseResistance, 0, 1);
      this._prepareStandardAspectData(standardAspects.decreaseResistance, localize('decreaseResistance'), true, true, 1);

      // Increase Resistance
      this._calculateStandardAspectCost(standardAspects.increaseResistance, 0, 1);
      this._prepareStandardAspectData(standardAspects.increaseResistance, localize('increaseResistance'), true, true, 1);

      // Decrease Attribute
      this._calculateStandardAspectCost(standardAspects.decreaseAttribute, 0, 4);
      this._prepareStandardAspectData(standardAspects.decreaseAttribute, localize('decreaseAttribute'), true, true, 1);

      // Increase Attribute
      this._calculateStandardAspectCost(standardAspects.increaseAttribute, 0, 4);
      this._prepareStandardAspectData(standardAspects.increaseAttribute, localize('increaseAttribute'), true, true, 1);

      // Decrease Skill
      this._calculateStandardAspectCost(standardAspects.decreaseSkill, 0, 1);
      this._prepareStandardAspectData(standardAspects.decreaseSkill, localize('decreaseSkill'), true, true, 1);

      // Increase Skill
      this._calculateStandardAspectCost(standardAspects.increaseSkill, 0, 1);
      this._prepareStandardAspectData(standardAspects.increaseSkill, localize('increaseSkill'), true, true, 1);

      // Inflict Condition
      const inflictConditionCosts = {
         blinded: 4,
         charmed: 2,
         deafened: 1,
         frightened: 3,
         incapacitated: 6,
         poisoned: 4,
         prone: 2,
         restrained: 5,
         stunned: 4,
         unconscious: 7
      };
      this._calculateStandardAspectCost(standardAspects.inflictCondition, 0, inflictConditionCosts, false, true);
      this._prepareStandardAspectData(standardAspects.inflictCondition, localize('inflictCondition'), false, true, false);

      // Remove Condition
      this._calculateStandardAspectCost(standardAspects.removeCondition, 0, 2, 5);
      this._prepareStandardAspectData(standardAspects.removeCondition, localize('removeCondition'), false, true, false);

      // Decrease Speed
      const speedCosts = {
         m5: 1,
         m10: 3
      };
      this._calculateStandardAspectCost(standardAspects.decreaseSpeed, 0, speedCosts);
      this._prepareStandardAspectData(standardAspects.decreaseSpeed, localize('decreaseSpeed'), false, true);

      // Increase Speed
      this._calculateStandardAspectCost(standardAspects.increaseSpeed, 0, speedCosts);
      this._prepareStandardAspectData(standardAspects.increaseSpeed, localize('increaseSpeed'), false, true);

      // Process custom aspects
      this.parent.system.customAspect.forEach((element) => {
         this._prepareCustomAspectData(element);
      });

      // Calculate total cost
      let totalAspectCost = 1;
      this.parent.aspect.forEach((element) => {
         totalAspectCost += element.cost;
      });
      this.parent.totalAspectCost = totalAspectCost;

      // Calculate suggested complexity and difficulty
      let suggestedDifficulty = totalAspectCost;
      let suggestedComplexity = 1;
      if (suggestedDifficulty > 6) {
         suggestedComplexity = totalAspectCost - 6;
         suggestedDifficulty = 6;
      }
      else {
         suggestedDifficulty = Math.max(suggestedDifficulty, 4);
      }
      this.parent.suggestedDifficulty = suggestedDifficulty;
      this.parent.suggestedComplexity = suggestedComplexity;

      // Auto calculate difficulty and complexity if appropriate
      if (this.parent.system.castingCheck.autoCalculateDC) {
         this.parent.system.castingCheck.difficulty = suggestedDifficulty;
         this.parent.system.castingCheck.complexity = suggestedComplexity;
      }

      return;
   }

   _calculateStandardAspectCost(aspect, enabledCost, optionCost, allOptionCost, uniqueOptionCost) {
      // If enabled
      if (aspect.enabled) {
         // If all options
         if (aspect.allOptions) {
            aspect.cost = allOptionCost;
         }

         // Otherwise
         else {
            // Initialize enabled cost
            aspect.cost = typeof enabledCost === `object` ? enabledCost[aspect.value] : enabledCost;

            // Calculate option cost
            if (aspect.option) {
               for (const [key, value] of Object.entries(aspect.option)) {
                  if (value === true) {
                     if (uniqueOptionCost) {
                        aspect.cost += optionCost[key];
                     }
                     else {
                        aspect.cost += typeof optionCost === 'object' ? optionCost[aspect.value] : optionCost;
                     }
                  }
               }
            }

            // Cap the action cost
            if (allOptionCost) {
               aspect.cost = Math.min(aspect.cost, allOptionCost);
            }
         }

         // Halve cost if a resistance is set
         if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
            aspect.cost = Math.ceil(aspect.cost / 2);
         }
      }
      else {
         aspect.cost = 0;
      }
   }

   _prepareStandardAspectData(aspect, label, scaling, requireOptions, initialValue, isDamage, isHealing) {
      if (aspect.enabled) {
         // Check for options
         const option = [];
         if (aspect.option) {
            for (const [key, value] of Object.entries(aspect.option)) {
               if (value === true) {
                  option.push(key);
               }
            }
         }

         if (!requireOptions || option.length > 0) {
            // Initialize aspect entry
            const aspectEntry = {
               label: label,
               cost: aspect.cost,
            };

            // Scaling
            if (scaling) {
               aspectEntry.scaling = true;
            }

            // Initial value
            if (scaling === true) {
               aspectEntry.initialValue = initialValue;
               if (aspect.value) {
                  aspectEntry.label = localize(`${aspect.value}`);
               }
            }
            else if (aspect.value) {
               aspectEntry.initialValue = aspect.value;
            }

            // Options
            if (option.length > 0) {
               aspectEntry.option = option;
            }

            // Resistance check
            if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
               aspectEntry.resistanceCheck = aspect.resistanceCheck;
            }

            // Damage
            if (isDamage) {
               aspectEntry.isDamage = true;
            }

            // Healing
            if (isHealing) {
               aspectEntry.isHealing = true;
            }

            // Push to the aspects array
            this.parent.aspect.push(aspectEntry);
         }
      }
   }

   addCustomAspect() {
      const system = this.parent.system;
      system.customAspect.push(this.getCustomAspectTemplate());
      this.parent.update({
         system: system
      });

      return;
   }

   removeCustomAspect(idx) {
      const system = this.parent.system;
      system.customAspect.splice(idx, 1);
      this.parent.update({
         system: system
      });

      return;
   }

   _prepareCustomAspectData(aspect) {
      // Initialize aspect entry
      const aspectEntry = {
         label: aspect.label,
         cost: Math.max(1, aspect.cost)
      };

      // Initial value
      if (aspect.scaling && aspect.initialValue) {
         aspectEntry.scaling = true;
         aspectEntry.initialValue = Math.max(0, aspect.initialValue);
      }

      // Resistance check
      if (aspect.resistanceCheck !== 'none') {
         aspectEntry.resistanceCheck = aspect.resistanceCheck;
      }

      // Damage
      if (aspect.isDamage) {
         aspectEntry.isDamage = true;
      }

      // Healing
      if (aspect.isHealing) {
         aspectEntry.isHealing = true;
      }

      this.parent.aspect.push(aspectEntry);

      return;
   }

   getRollData(rollData) {
      rollData.aspect = this.parent.aspect;

      return rollData;
   }

   getChatContext(chatContext) {
      chatContext.aspect = this.parent.aspect;

      return chatContext;
   }

   onCreate() {
      if (this.parent.system.tradition === "any") {
         this.parent.system.tradition = localize("any");
         this.parent.update({
            system: {
               tradition: this.parent.system.tradition
            }
         });
      }

      if (this.parent.img === 'icons/svg/item-bag.svg') {
         this.initializeImg();
      }
   }

   initializeImg() {
      this.parent.img = 'icons/svg/explosion.svg';

      this.parent.update({
         img: this.parent.img
      });
   }
}