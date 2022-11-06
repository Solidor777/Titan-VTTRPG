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
         },
         {
            width: 350,
            height: 520,
            classes: game.settings.get('titan', 'darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
