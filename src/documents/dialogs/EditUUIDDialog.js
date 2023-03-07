import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import EditUUIDDialogShell from '~/documents/dialogs/EditUUIDDialogShell.svelte';
export default class EditUUIDDialog extends TJSDialog {
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
