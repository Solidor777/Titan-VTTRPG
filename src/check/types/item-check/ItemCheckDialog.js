import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import ItemCheckDialogShell from '~/check/types/item-check/ItemCheckDialogShell.svelte';
export default class ItemCheckDialog extends TJSDialog {
   constructor(actor, options) {
      super(
         {
            title: `${localize('itemCheck')} (${actor.name})`,
            content: {
               class: ItemCheckDialogShell,
               props: {
                  options: options,
                  actor: actor,
               },
            },
            zIndex: null,
            id: `dialog-${actor.name}`,
         },
         {
            width: 350,
            height: 510,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
