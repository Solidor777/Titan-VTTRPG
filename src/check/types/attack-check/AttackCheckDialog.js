import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize, getSetting } from '~/helpers/Utility.js';
import AttackCheckDialogShell from '~/check/types/attack-check/AttackCheckDialogShell.svelte';
export default class AttackCheckDialog extends TJSDialog {
   constructor(actor, weapon, attack, options) {
      super(
         {
            title: `${localize('attackCheck')} (${actor.name})`,
            content: {
               class: AttackCheckDialogShell,
               props: {
                  actor: actor,
                  weapon: weapon,
                  attack: attack,
                  options: options,
               },
            },
            zIndex: null,
            id: `attack-check-dialog-${actor._id}`,
         },
         {
            width: 350,
            height: 590,
            classes: getSetting('darkModeSheets') === true ? ['titan', 'titan-dark-mode'] : ['titan']
         },
      );
   }
}
