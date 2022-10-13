import { localize } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from 'uuid';
import TitanTypeComponent from '~/helpers/TypeComponent';
import SpellAspects from './SpellAspects';


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
      const aspects = this.parent.system.aspect;
      const aspectOptions = foundry.utils.deepClone(SpellAspects);

      aspects.forEach((aspect) => {
         // Determine whether the aspect is enabled
         const settings = aspectOptions[aspect.label].settings;
         const template = aspectOptions[aspect.label].template;
         if (settings?.requireOptions && aspect.option.length === 0) {
            aspect.enabled = false;
            aspect.cost = 0;
         }
         else {
            aspect.enabled = true;

            // Calculate the cost
            let cost = template.cost;

            // Initia value cost
            if (settings?.initialValueCosts) {
               cost = settings.initialValueCosts[aspect.initialValue];
            }

            // Unit Cost
            if (settings?.unitCosts) {
               cost = settings.unitCosts[aspect.unit];
            }

            // Add option cost
            if (settings?.optionCost) {
               cost += settings.optionCost * aspect.option.length;
            }
            else if (settings?.optionCosts) {
               aspect.option.forEach((option) => {
                  cost += settings.optionCosts[option];
               });
            }

            // Halve the cost if the aspect has a resistance check
            if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
               cost = Math.ceil(cost / 2);
            }

            aspect.cost = cost;
         }
      });


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