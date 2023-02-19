import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import AttackCheckDialogShell from '~/check/types/attack-check/AttackCheckDialogShell.svelte';
export default class AttackCheckDialog extends TJSDialog {
   constructor(actor, options) {
      super(
         {
            title: `${localize('attackCheck')} (${actor.name})`,
            content: {
               class: AttackCheckDialogShell,
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
            height: 580,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
