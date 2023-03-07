import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import CastingCheckDialogShell from '~/check/types/casting-check/CastingCheckDialogShell.svelte';
export default class CastingCheckDialog extends TJSDialog {
   constructor(actor, spell, options) {
      super(
         {
            title: `${localize('castingCheck')} (${actor.name})`,
            content: {
               class: CastingCheckDialogShell,
               props: {
                  actor: actor,
                  spell: spell,
                  options: options,
               },
            },
            zIndex: null,
            id: `casting-check-dialog-${actor._id}`,
         },
         {
            width: 350,
            height: 520,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
