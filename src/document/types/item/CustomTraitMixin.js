import AddCustomTraitDialog from '~/document/types/item/dialog/AddCustomTraitDialog.js';
import EditCustomTraitDialog from '~/document/types/item/dialog/EditCustomTraitDialog.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Mixin that adds the mutators of a document's `system.customTrait` array to a document class. Items and Active
 * Effects share the custom-trait sidebar controls, which call these three methods on their document, so both document
 * classes take them from here. The Add and Edit dialogs receive the document itself and update `system.customTrait`.
 * @param {typeof foundry.abstract.Document} BaseClass - The document class to extend.
 * @returns {typeof foundry.abstract.Document} The extended class with custom-trait mutators.
 */
export default function CustomTraitMixin(BaseClass) {
   return class CustomTraitDocument extends BaseClass {

      /**
       * Creates a dialog for adding a new Custom Trait to this document.
       * @returns {void}
       */
      addCustomTrait() {
         if (assert(
            this.isOwner,
            'Cannot modify document %s if not owner.',
            this.name,
         )) {
            /** @type {AddCustomTraitDialog} The dialog used to add a new Custom Trait to this document. */
            const dialog = new AddCustomTraitDialog(this);
            dialog.render(true);
         }
      }

      /**
       * Creates a dialog for editing an existing Custom Trait belonging to this document.
       * @param {number} traitIdx - The index of the Custom Trait in this document's Custom Traits array.
       * @returns {void}
       */
      editCustomTrait(traitIdx) {
         if (assert(
            this.isOwner,
            'Cannot modify document %s if not owner.',
            this.name,
         )) {
            /** @type {EditCustomTraitDialog} The dialog used to edit an existing Custom Trait on this document. */
            const dialog = new EditCustomTraitDialog(
               this,
               traitIdx,
            );
            dialog.render(true);
         }
      }

      /**
       * Removes a Custom Trait from this document.
       * @param {number} traitIdx - The index of the Custom Trait in this document's Custom Traits array.
       * @returns {Promise<void>}
       */
      async deleteCustomTrait(traitIdx) {
         if (assert(
            this.isOwner,
            'Cannot modify document %s if not owner.',
            this.name,
         )) {
            /** @type {object[]} A fresh array with the targeted Custom Trait removed. */
            const next = this.system.customTrait.filter((trait, idx) => idx !== traitIdx);

            await this.update({
               system: {
                  customTrait: next,
               },
            });
         }
      }
   };
}
