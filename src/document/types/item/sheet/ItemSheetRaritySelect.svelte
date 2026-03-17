<script>
   import RaritySelect from '~/helpers/svelte-components/select/RaritySelect.svelte';
   import { getContext } from 'svelte';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<LabeledElement
   label={localize('rarity')}
   tooltip={localize('rarity.desc')}
>
   <RaritySelect
      bind:value={$document.system.rarity}
      disabled={disabled || !$document?.isOwner}
      on:change={()=> $document.update({system: {rarity: $document.system.rarity}})}
   />
</LabeledElement>

