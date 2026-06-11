import TitanItemDataModel from '~/document/types/item/TitanItemDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createSpellSystemTemplate from '~/document/types/item/types/spell/SpellSystemTemplate.js';
import createCustomAspectTemplate from '~/document/types/item/types/spell/SpellCustomAspect.js';
import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';
import { SPELL_IMAGE } from '~/system/DefaultImages.js';
import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';
import assert from '~/helpers/utility-functions/Assert.js';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';

/**
 * Data model with extra functionality for Spells.
 * @extends {TitanItemDataModel}
 */
export default class SpellDataModel extends TitanItemDataModel {
   /**
    * Defines the data schema for Spell documents, built from the shared Spell system shape template
    * (which spreads the base item fragment before the spell-specific fields; spells carry no rules
    * elements), so the item schema and its chat-card schema stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createSpellSystemTemplate()),
      };
   }

   prepareDerivedData() {

      // Update the spell's aspects.
      /** @type {number} */
      let totalAspectCost = 0;

      // For each standard aspect.
      for (const aspect of this.aspect) {

         // Determine whether the aspect is enabled.
         const aspectSettings = SpellAspects[aspect.label];
         const settings = aspectSettings.settings;
         const template = aspectSettings.template;

         // The aspect is disabled if it requires an option and has no options.
         // set.
         if (settings?.requireOption && aspect.option.length === 0 && !aspect.allOptions) {
            aspect.enabled = false;
            aspect.cost = 0;
         }

         // Otherwise, the aspect is enabled.
         else {
            aspect.enabled = true;

            // Calculate the cost of the aspect.
            let aspectCost = template.cost;
            if (settings) {

               // Initial value cost.
               if (settings.initialValueCosts) {
                  aspectCost = settings.initialValueCosts[aspect.initialValue];
               }

               // Unit Cost.
               if (settings.unitCosts) {
                  aspectCost = settings.unitCosts[aspect.unit];
               }

               // Add option costs.
               // All options.
               if (aspect.allOptions && settings.allOptionsCost) {
                  aspectCost += settings.allOptionsCost;
               }

                  // Add the cost for each option when the cost of each option is.
               // the same.
               else if (settings.optionCost) {
                  aspectCost += settings.optionCost * aspect.option.length;
               }

                  // Add the cost for each option when the cost of each option is.
               // different.
               else if (settings.optionCosts) {
                  for (const option of aspect.option) {
                     aspect.option.forEach((option) => {
                        aspectCost += settings.optionCosts[option];
                     });
                  }
               }

               // Add scaling aspect cost.
               if (settings.scalingCost) {
                  aspect.scalingLost = settings.scalingCost;
               }
            }

            // Halve the cost if the aspect has a Resistance Check.
            if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
               aspectCost = Math.max(Math.floor(aspectCost / 2), 1);
            }

            aspect.cost = aspectCost;
            totalAspectCost += aspectCost;
         }
      }

      // Add the cost of each custom aspect.
      for (const aspect of this.customAspect) {
         totalAspectCost += aspect.cost;
      }
      this.totalAspectCost = totalAspectCost;

      // Calculate suggested complexity and difficulty.
      let suggestedDifficulty = totalAspectCost;
      /** @type {number} */
      let suggestedComplexity = 1;
      if (suggestedDifficulty > 5) {
         suggestedComplexity = totalAspectCost - 4;
         suggestedDifficulty = 5;
      }
      else {
         suggestedDifficulty = Math.max(suggestedDifficulty, 4);
      }

      // Auto calculate difficulty and complexity if appropriate.
      if (this.castingCheck.autoCalculateDC) {
         this.castingCheck.difficulty = suggestedDifficulty;
         this.castingCheck.complexity = suggestedComplexity;
      }
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.xpCost = this.xpCost;
      retVal.tradition = this.tradition;
      retVal.castingCheck = structuredClone(this.castingCheck);
      retVal.quantity = this.quantity;
      retVal.aspect = structuredClone(this.aspect);
      retVal.customAspect = structuredClone(this.customAspect);
      retVal.rarity = this.rarity;

      return retVal;
   }

   _getDefaultImage() {
      return SPELL_IMAGE;
   }

   _getDefaultName() {
      return localize('newSpell');
   }

   /**
    * Adds a Standard Aspect to the Spell.
    * @param {object} aspect - The aspect to add.
    */
   async addStandardAspect(aspect) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Add the aspect.
         this.aspect.push(aspect);

         // Sort the aspects.
         this.aspect = this.aspect.sort((a, b) =>
            sortAscending(SpellAspects[a.label].sortOrder, SpellAspects[b.label].sortOrder));

         // Update the document.
         await this.parent.update({
            system: {
               aspect: structuredClone(this.aspect)
            },
         });
      }
   }

   /**
    * Removes a Standard Aspect from the Spell.
    * @param {number} idx - The index of the Standard Aspect to remove.
    */
   async removeStandardAspect(idx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Remove the aspect.
         this.aspect.splice(idx, 1);

         // Update the document.
         await this.parent.update({
            system: {
               aspect: structuredClone(this.aspect),
            },
         });
      }
   }

   /**
    * Adds a Custom Aspect to the Spell.
    * @returns {Promise<void>}
    */
   async addCustomAspect() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Add the aspect.
         this.customAspect.push(createCustomAspectTemplate());

         // Update the document.
         await this.parent.update({
            system: {
               customAspect: structuredClone(this.customAspect),
            },
         });

         // Update the sheet.
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
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {

         // Update the sheet.
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.removeCustomAspect(idx);
         }

         // Remove the aspect.
         this.customAspect.splice(idx, 1);
         await this.parent.update({
            system: {
               customAspect: structuredClone(this.customAspect),
            },
         });
      }
   }

   /**
    * Reorders a Custom Aspect within this Spell, keeping the sheet's per-aspect expansion state aligned.
    * @param {number} fromIdx - The aspect's current index.
    * @param {number} toIdx - The insertion point to move it before.
    * @returns {Promise<void>}
    */
   async moveCustomAspect(fromIdx, toIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         // Keep per-aspect expansion state aligned before the reactive re-render.
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.postMoveCustomAspect(fromIdx, toIdx);
         }

         await this.parent.update({
            system: {
               customAspect: moveArrayEntry(this.customAspect, fromIdx, toIdx),
            },
         });
      }
   }

   /**
    * Inserts a copy of a Custom Aspect (from this or another spell) at a position, with a fresh uuid.
    * @param {object} element - The aspect data to copy in.
    * @param {number} atIdx - The insertion point.
    * @returns {Promise<void>}
    */
   async insertCustomAspect(element, atIdx) {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         /** @type {Array<object>} A fresh array so ReactiveDocument change-detection fires. */
         const next = this.customAspect.slice();
         next.splice(atIdx, 0, cloneElementWithNewUuid(element));

         // Seed expansion state for the inserted row before the reactive re-render.
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.postInsertCustomAspect(atIdx);
         }

         await this.parent.update({
            system: {
               customAspect: next,
            },
         });
      }
   }
}
