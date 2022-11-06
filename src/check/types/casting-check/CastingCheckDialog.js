import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import CastingCheckDialogShell from './CastingCheckDialogShell.svelte';
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
            classes: game.settings.get('titan', 'darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
