<script>
   import RaritySelect from '~/helpers/svelte-components/select/RaritySelect.svelte';
   import { getContext } from 'svelte';
   import LabeledInput from '~/helpers/svelte-components/LabeledInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<LabeledInput tooltip={localize('rarity.desc')}>
   <svelte:fragment slot="label">{localize('rarity')}</svelte:fragment>
   <svelte:fragment slot="input">
      <RaritySelect
         bind:value={$document.system.rarity}
         disabled={disabled || !$document?.isOwner}
         on:change={()=> $document.update({system: {rarity: $document.system.rarity}})}
      />
   </svelte:fragment>
</LabeledInput>

