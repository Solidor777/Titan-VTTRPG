import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
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
         },
         {
            width: 350,
            height: 520,
         }
      );
   }
}
