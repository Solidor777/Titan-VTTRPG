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
import {SPELL_IMAGE} from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';

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
      retVal.rarity = this.rarity;

      return retVal;
   }

   _getDefaultImage() {
      return SPELL_IMAGE;
   }

   _getDefaultName() {
      return localize('newSpell');
   }

   prepareDerivedData() {

      // Update the spell's aspects
      let totalAspectCost = 0;

      // For each standard aspect
      for (const aspect of this.aspect) {

         // Determine whether the aspect is enabled
         const aspectSettings = SpellAspects[aspect.label];
         const settings = aspectSettings.settings;
         const template = aspectSettings.template;

         // The aspect is disabled if it requires an option and has no options set
         if (settings?.requireOption && aspect.option.length === 0 && !aspect.allOptions) {
            aspect.enabled = false;
            aspect.cost = 0;
         }

         // Otherwise, the aspect is enabled
         else {
            aspect.enabled = true;

            // Calculate the cost of the aspect
            let aspectCost = template.cost;
            if (settings) {

               // Initial value cost
               if (settings.initialValueCosts) {
                  aspectCost = settings.initialValueCosts[aspect.initialValue];
               }

               // Unit Cost
               if (settings.unitCosts) {
                  aspectCost = settings.unitCosts[aspect.unit];
               }

               // Add option costs
               // All options
               if (aspect.allOptions && settings.allOptionsCost) {
                  aspectCost += settings.allOptionsCost;
               }

               // Add the cost for each option when the cost of each option is the same
               else if (settings.optionCost) {
                  aspectCost += settings.optionCost * aspect.option.length;
               }

               // Add the cost for each option when the cost of each option is different
               else if (settings.optionCosts) {
                  for (const option of aspect.option) {
                     aspect.option.forEach((option) => {
                        aspectCost += settings.optionCosts[option];
                     });
                  }
               }

               // Add scaling aspect cost
               if (settings.scalingCost) {
                  aspect.scalingLost = settings.scalingCost;
               }
            }

            // Halve the cost if the aspect has a Resistance Check
            if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
               aspectCost = Math.max(Math.floor(aspectCost / 2), 1);
            }

            aspect.cost = aspectCost;
            totalAspectCost += aspectCost;
         }
      }

      // Add the cost of each custom aspect
      for (const aspect of this.customAspect) {
         totalAspectCost += aspect.cost;
      }
      this.totalAspectCost = totalAspectCost;

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
    * @param {object} aspect - The aspect to add.
    */
   async addStandardAspect(aspect) {
      // If the current user owns this item
      if (this.parent.isOwner) {

         // Add the aspect
         this.aspect.push(aspect);

         // Sort the aspects
         this.aspect = this.aspect.sort((a, b) =>
            sortAscending(SpellAspects[a.label].sortOrder, SpellAspects[b.label].sortOrder));

         // Update the document
         await this.parent.update({
            system: {
               aspect: this.aspect
            },
         });
      }
   }

   /**
    * Removes a Standard Aspect from the Spell.
    * @param {number} idx - The index of the Standard Aspect to remove.
    */
   async removeStandardAspect(idx) {
      // If the current user owns this item
      if (this.parent.isOwner) {

         // Remove the aspect
         this.aspect.splice(idx, 1);

         // Update the document
         await this.parent.update({
            system: {
               aspect: this.aspect,
            },
         });
      }
   }

   /**
    * Adds a Custom Aspect to the Spell.
    * @returns {Promise<void>}
    */
   async addCustomAspect() {
      // If the current user owns this item
      if (this.parent.isOwner) {

         // Add the aspect
         this.customAspect.push(createCustomAspectTemplate());

         // Update the document
         await this.parent.update({
            system: {
               customAspect: this.customAspect,
            },
         });

         // Update the sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.addCustomAspect();
         }
      }
   }

   /**
    * Removes a Custom Aspect from the Spell.
    * @param {number} idx - The index of the Custom Aspect to remove.
    */
   async removeCustomAspect(idx) {
      // If the current user owns this item
      if (this.parent.isOwner) {

         // Update the sheet
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.removeCustomAspect(idx);
         }

         // Remove the aspect
         this.customAspect.splice(idx, 1);
         await this.parent.update({
            system: {
               customAspect: this.customAspect,
            },
         });
      }
   }
}
