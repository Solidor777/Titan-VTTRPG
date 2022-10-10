import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import ItemCheckDialogShell from './ItemCheckDialogShell.svelte';
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
            classes: ['titan'],
         },
         {
            width: 350,
            height: 520,
         },
      );
   }
}
