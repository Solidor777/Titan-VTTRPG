import {TJSDialog} from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import localize from '~/helpers/utility-functions/Localize.js';
import EditUUIDDialogShell from '~/document/dialogs/EditUUIDDialogShell.svelte';

/**
 * A dialog for editing the UUID used by Titan Macros for identifying a Document.
 * @param {TitanItem|TitanActor} document - The document to regenerate the UUID for.
 * @augments ConfirmationDialog
 */
export default class EditUUIDDialog extends TJSDialog {

   /**
    * A dialog for editing the UUID used by Titan Macros for identifying a Document.
    * @param {TitanItem|TitanActor} document - The document to regenerate the UUID for.
    * @augments ConfirmationDialog
    */
   constructor(document) {
      super(
         {
            title: `${localize('editUUID')} (${document.name})`,
            content: {
               class: EditUUIDDialogShell,
               props: {
                  document: document
               },
            },
            zIndex: null,
            id: `edit-uuid-dialog-${document._id}`,
         },
         {
            width: 400,
            height: 475,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
