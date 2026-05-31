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

   /**
    * The effect's active state, read THROUGH `document.data` so the toggle re-renders reactively when
    * the effect is toggled (reading `effect.system.isActive` off the prop directly is not tracked).
    * @type {boolean}
    */
   const isActive = $derived(document.data.effects.get(effect.id)?.system.isActive ?? false);
</script>

<ToggleButton
   active={isActive}
   disabled={!document.data.isOwner}
   label={localize('active')}
   onclick={() => document.data.system.toggleEffectActive(effect.id)}
/>
