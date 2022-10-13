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