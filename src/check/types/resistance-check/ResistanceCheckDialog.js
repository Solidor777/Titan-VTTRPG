import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import ResistanceCheckDialogShell from './ResistanceCheckDialogShell.svelte';
export default class ResistanceCheckDialog extends TJSDialog {
   constructor(actor, options) {
      super(
         {
            title: `${localize('resistanceCheck')} (${actor.name})`,
            content: {
               class: ResistanceCheckDialogShell,
               props: {
                  options: options,
                  actor: actor,
               },
            },
            zIndex: null,
            id: `dialog-${actor.name}`,
         },
         {
            width: 320,
            height: 295,
            classes: game.settings.get('titan', 'darkModeSheets') === true ? ['titan', 'dark-mode'] : ['titan']
         },
      );
   }
}
