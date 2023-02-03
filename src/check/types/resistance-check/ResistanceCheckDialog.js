import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import ResistanceCheckDialogShell from '~/check/types/resistance-check/ResistanceCheckDialogShell.svelte';
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
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
