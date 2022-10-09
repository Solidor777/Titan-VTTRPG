import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { localize } from '~/helpers/Utility.js';
import AttributeCheckDialogShell from './AttributeCheckDialogShell.svelte';
export default class SkillCheckDialog extends TJSDialog {
  constructor(actor, options) {
    super(
      {
        title: `${localize('skillCheck')} (${actor.name})`,
        content: {
          class: AttributeCheckDialogShell,
          props: {
            options: options,
            actor: actor,
          },
        },
      },
      {
        width: 350,
        height: 490,
      }
    );
  }
}
