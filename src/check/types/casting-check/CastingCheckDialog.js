import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import CastingCheckDialogShell from '~/check/types/casting-check/CastingCheckDialogShell.svelte';
export default class CastingCheckDialog extends TJSDialog {
   constructor(actor, options) {
      super(
         {
            title: `${localize('castingCheck')} (${actor.name})`,
            content: {
               class: CastingCheckDialogShell,
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
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
