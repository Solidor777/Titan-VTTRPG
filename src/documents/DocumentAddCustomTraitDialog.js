import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import DocumentAddCustomTraitDialogShell from './DocumentAddCustomTraitDialogShell.svelte';
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
            id: `dialog-${document.name}`,
         },
         {
            width: 300,
            height: 300,
            classes: game.settings.get('titan', 'darkModeSheets') === true ? ['titan', 'dark-mode'] : ['titan']
         },
      );
   }
}
