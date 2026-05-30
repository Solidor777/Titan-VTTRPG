<script>
   import RaritySelect from '~/helpers/svelte-components/input/select/RaritySelect.svelte';
   import { getContext } from 'svelte';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';

   /**
    * @typedef {object} ItemSheetRaritySelectProps
    * @property {boolean} [disabled] Whether the input should currently be disabled.
    */

   /** @type {ItemSheetRaritySelectProps} */
   const { disabled = false } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<LabeledElement
   label={'rarity'}
   tooltip={'rarity.desc'}
>
   <RaritySelect
      bind:value={document.data.system.rarity}
      disabled={disabled || !document.data?.isOwner}
      onchange={() => document.data.update({system: {rarity: document.data.system.rarity}})}
   />
</LabeledElement>
