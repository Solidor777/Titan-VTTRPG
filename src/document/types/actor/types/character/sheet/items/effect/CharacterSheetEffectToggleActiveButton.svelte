<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   /**
    * @typedef {object} CharacterSheetEffectToggleActiveButtonProps
    * @property {TitanActiveEffect} [effect] - The effect Active Effect this button is for.
    */

   /** @type {CharacterSheetEffectToggleActiveButtonProps} */
   const { effect = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ToggleButton
   active={effect.system.isActive}
   disabled={!document.data.isOwner}
   label={localize('active')}
   onclick={() => document.data.system.toggleEffectActive(effect.id)}
/>
