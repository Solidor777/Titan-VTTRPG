import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import DocumentAddCustomTraitDialogShell from '~/document/dialogs/DocumentAddCustomTraitDialogShell.svelte';
export default class DocumentAddCustomTraitDialog extends TJSDialog {
   constructor(document) {
      super(
         {
            title: `${document.name}`,
            content: {
               class: DocumentAddCustomTraitDialogShell,
               props: {
                  document: document,
               },
            },
            zIndex: null,
            id: `add-custom-trait-dialog-${document._id}`,
         },
         {
            width: 300,
            height: 300,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
