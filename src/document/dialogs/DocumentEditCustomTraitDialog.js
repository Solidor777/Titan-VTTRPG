import {TJSDialog} from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import DocumentEditCustomTraitDialogShell from '~/document/dialogs/DocumentEditCustomTraitDialogShell.svelte';

/**
 * Base dialog for editing custom trait to a document.
 * @param {Document} document - The Document to edit trait of.
 * @param {number} traitIdx - The idx of the trait in the traits array.
 * @augments TJSDialog
 */
export default class DocumentEditCustomTraitDialog extends TJSDialog {

   /**
    * Base dialog for editing custom trait to a document.
    * @param {Document} document - The Document to edit trait of.
    * @param {number} traitIdx - The idx of the trait in the traits array.
    * @augments TJSDialog
    */
   constructor(document, traitIdx) {
      super(
         {
            title: `${document.name}`,
            content: {
               class: DocumentEditCustomTraitDialogShell,
               props: {
                  document: document,
                  traitIdx: traitIdx
               },
            },
            zIndex: null,
            id: `edit-custom-trait-dialog-${document._id}`,
         },
         {
            width: 300,
            height: 300,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
