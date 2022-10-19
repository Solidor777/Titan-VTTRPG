import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import EditAttackTraitsDialogShell from './ArmorEditTraitsDialogShell.svelte';
export default class ArmorEditTraitsDialog extends TJSDialog {
   constructor(document, options) {
      super(
         {
            title: `${localize('editTraits')} (${document.name})`,
            content: {
               class: EditAttackTraitsDialogShell,
               props: {
                  document: document,
               },
            },
            zIndex: null,
            id: `dialog-${document.name}`,
         },
         {
            width: 320,
            height: 180,
            classes: game.settings.get('titan', 'darkModeSheets') === true ? ['titan', 'dark-mode'] : ['titan']
         },
      );
   }
}
