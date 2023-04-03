import { localize } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from 'uuid';
import TitanTypeComponent from '~/helpers/TypeComponent';
import SpellAspects from '~/item/types/spell/SpellAspects';


export default class TitanSpell extends TitanTypeComponent {
   setInitialData(initialData) {
      // Image
      initialData.img = 'icons/svg/explosion.svg';

      // System
      if (!initialData.system) {
         initialData.system = {};
      }

      // Tradition
      initialData.system.tradition = localize('any');

      return;
   }

   addStandardAspect(aspect) {
      if (this.parent.isOwner) {
         let aspects = this.parent.system.aspect;
         aspects.push(aspect);
         aspects = aspects.sort((a, b) => SpellAspects[a.label].sortOrder - SpellAspects[b.label].sortOrder);

         this.parent.update({
            system: {
               aspect: aspects
            }
         });
      }

      return;
   }

   prepareDerivedData() {
      const aspects = this.parent.system.aspect;
      let totaAspectCost = 0;

      const aspectsToRemove = new Set();
      for (let idx = 0; idx < aspects.length; idx++) {
         // Determine whether the aspect is enabled
         const aspect = aspects[idx];
         const aspectSettings = SpellAspects[aspect.label];
         if (aspectSettings) {
            const settings = aspectSettings.settings;
            const template = aspectSettings.template;
            if (settings?.requireOption && aspect.option.length === 0) {
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
               totaAspectCost += cost;
            }
         }

         else {
            aspectsToRemove.add(idx);
         }
      }

      // Remove deprecated aspects if appropriate
      if (aspectsToRemove.size > 0) {
         const filteredAspects = aspects.filter((aspect, idx) => {
            return !aspectsToRemove.has(idx);
         });
         this.parent.system.aspect = filteredAspects;
      }

      // Calculate total cost
      this.parent.system.customAspect.forEach((aspect) => {
         totaAspectCost += aspect.cost;
      });
      this.totaAspectCost = totaAspectCost;

      // Calculate suggested complexity and difficulty
      let suggestedDifficulty = totaAspectCost;
      let suggestedComplexity = 1;
      if (suggestedDifficulty > 6) {
         suggestedComplexity = totaAspectCost - 5;
         suggestedDifficulty = 6;
      }
      else {
         suggestedDifficulty = Math.max(suggestedDifficulty, 4);
      }

      // Auto calculate difficulty and complexity if appropriate
      if (this.parent.system.castingCheck.autoCalculateDC) {
         this.parent.system.castingCheck.difficulty = suggestedDifficulty;
         this.parent.system.castingCheck.complexity = suggestedComplexity;
      }

      return;
   }

   async addCustomAspect() {
      if (this.parent.isOwner) {
         const system = this.parent.system;
         system.customAspect.push(getCustomAspectTemplate());
         await this.parent.update({
            system: system
         });

         // Update sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.addCustomAspect();
         }
      }

      return;
   }

   removeCustomAspect(idx) {
      if (this.parent.isOwner) {
         // Update sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.removeCustomAspect(idx);
         }

         const system = this.parent.system;
         system.customAspect.splice(idx, 1);
         this.parent.update({
            system: system
         });
      }

      return;
   }
}

function getCustomAspectTemplate() {
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