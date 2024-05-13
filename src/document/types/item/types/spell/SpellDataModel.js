import ItemDataModel from '~/document/types/item/ItemDataModel.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createCustomAspectTemplate from '~/document/types/item/types/spell/SpellCustomAspect.js';
import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';
import { SPELL_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Data model with extra functionality for Spells.
 * @augments TitanDataModel
 */
export default class SpellDataModel extends ItemDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Rarity
      schema.rarity = createStringField('common');

      // XP Cost
      schema.xpCost = createIntegerField(getSetting('defaultXpCost.spell'));

      // Tradition
      schema.tradition = createStringField('');

      // Casting Check
      schema.castingCheck = createSchemaField({
         attribute: createStringField('mind'),
         skill: createStringField('arcana'),
         difficulty: createIntegerField(4),
         complexity: createIntegerField(1),
         autoCalculateDC: createBooleanField(true),
      });

      // Quantity
      schema.quantity = createIntegerField(1);

      // Aspects
      schema.aspect = createArrayField(createObjectField());

      // Custom Aspects
      schema.customAspect = createArrayField(
         createObjectField(() => createCustomAspectTemplate()),
      );

      return schema;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.xpCost = this.xpCost;
      retVal.tradition = this.tradition;
      retVal.castingCheck = foundry.utils.deepClone(this.castingCheck);
      retVal.quantity = this.quantity;
      retVal.aspect = foundry.utils.deepClone(this.aspect);
      retVal.customAspect = foundry.utils.deepClone(this.customAspect);

      return retVal;
   }

   _getDefaultImage() {
      return SPELL_IMAGE;
   }

   _getDefaultName() {
      return localize('newSpell');
   }


   prepareDerivedData() {
      let totalAspectCost = 0;

      const aspectsToRemove = new Set();
      for (let idx = 0; idx < this.aspect.length; idx++) {
         // Determine whether the aspect is enabled
         const aspect = this.aspect[idx];
         const aspectSettings = SpellAspects[aspect.label];
         if (aspectSettings) {
            const settings = aspectSettings.settings;
            const template = aspectSettings.template;
            if (settings?.requireOption && aspect.option.length === 0 && !aspect.allOptions) {
               aspect.enabled = false;
               aspect.cost = 0;
            }
            else {
               aspect.enabled = true;

               // Calculate the cost
               let cost = template.cost;

               if (settings) {
                  // Initial value cost
                  if (settings.initialValueCosts) {
                     cost = settings.initialValueCosts[aspect.initialValue];
                  }

                  // Unit Cost
                  if (settings.unitCosts) {
                     cost = settings.unitCosts[aspect.unit];
                  }

                  // Add option cost
                  // All options
                  if (aspect.allOptions && settings.allOptionsCost) {
                     cost += settings.allOptionsCost;
                  }

                  // Individual option cost
                  else if (settings.optionCost) {
                     cost += settings.optionCost * aspect.option.length;
                  }
                  else if (settings.optionCosts) {
                     aspect.option.forEach((option) => {
                        cost += settings.optionCosts[option];
                     });
                  }

                  // Scaling aspect cost
                  if (settings.scalingCost) {
                     aspect.scalingLost = settings.scalingCost;
                  }
               }

               // Halve the cost if the aspect has a Resistance Check
               if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
                  cost = Math.max(Math.floor(cost / 2), 1);
               }

               aspect.cost = cost;
               totalAspectCost += cost;
            }
         }
         else {
            aspectsToRemove.add(idx);
         }
      }

      // Remove deprecated aspects if appropriate
      if (aspectsToRemove.size > 0) {
         this.aspect = this.aspect.filter((aspect, idx) => {
            return !aspectsToRemove.has(idx);
         });
      }

      // Calculate total cost
      this.customAspect.forEach((aspect) => {
         totalAspectCost += aspect.cost;
      });
      this.totaAspectCost = totalAspectCost;

      // Calculate suggested complexity and difficulty
      let suggestedDifficulty = totalAspectCost;
      let suggestedComplexity = 1;
      if (suggestedDifficulty > 5) {
         suggestedComplexity = totalAspectCost - 4;
         suggestedDifficulty = 5;
      }
      else {
         suggestedDifficulty = Math.max(suggestedDifficulty, 4);
      }

      // Auto calculate difficulty and complexity if appropriate
      if (this.castingCheck.autoCalculateDC) {
         this.castingCheck.difficulty = suggestedDifficulty;
         this.castingCheck.complexity = suggestedComplexity;
      }
   }

   /**
    * Adds a Standard Aspect to the Spell.
    * @param {object} aspect The aspect to add.
    */
   addStandardAspect(aspect) {
      if (this.parent.isOwner) {
         let aspects = this.aspect;
         aspects.push(aspect);
         aspects = aspects.sort((a, b) => SpellAspects[a.label].sortOrder - SpellAspects[b.label].sortOrder);

         this.parent.update({
            system: {
               aspect: aspects,
            },
         });
      }
   }

   /**
    * Adds a new Custom Aspect to the Spell.
    * @returns {Promise<void>}
    */
   async addCustomAspect() {
      if (this.parent.isOwner) {
         this.customAspect.push(createCustomAspectTemplate());
         this.parent.update({
            system: {
               customAspect: this.customAspect,
            },
         });

         // Update sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.addCustomAspect();
         }
      }
   }

   /**
    * Removes a Custom Aspect from the Spell.
    * @param {number} idx  The index of the Custom Aspect to remove.
    */
   removeCustomAspect(idx) {
      if (this.parent.isOwner) {

         // Update sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.removeCustomAspect(idx);
         }

         this.customAspect.splice(idx, 1);
         this.parent.update({
            system: {
               customAspect: this.customAspect,
            },
         });
      }
   }
}
