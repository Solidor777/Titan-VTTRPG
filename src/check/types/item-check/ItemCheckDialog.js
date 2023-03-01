import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import ItemCheckDialogShell from '~/check/types/item-check/ItemCheckDialogShell.svelte';
export default class ItemCheckDialog extends TJSDialog {
   constructor(actor, item, check, options) {
      super(
         {
            title: `${localize('itemCheck')} (${actor.name})`,
            content: {
               class: ItemCheckDialogShell,
               props: {
                  actor: actor,
                  item: item,
                  check: check,
                  options: options,
               },
            },
            zIndex: null,
            id: `dialog-${actor.name}`,
         },
         {
            width: 350,
            height: 520,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
