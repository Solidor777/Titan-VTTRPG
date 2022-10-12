import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import DocumentAddCustomTraitDialogShell from './DocumentAddCustomTraitDialogShell.svelte';
export default class DocumentAddCustomTraitDialog extends TJSDialog {
   constructor(document, attackIdx) {
      super(
         {
            title: `${document.name}`,
            content: {
               class: DocumentAddCustomTraitDialogShell,
               props: {
                  attackIdx: attackIdx,
                  document: document,

               },
            },
            zIndex: null,
            id: `dialog-${document.name}`,
            classes: ['titan'],
         },
         {
            width: 300,
            height: 300,
         },
      );
   }
}
