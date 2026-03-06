<script>
   import { getContext } from 'svelte';
   import LabeledInput from '~/helpers/svelte-components/LabeledInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<LabeledInput
   label={localize('xp')}
   {tooltip}
>
   <IntegerInput
      bind:value={$document.system.xpCost}
      disabled={disabled || !$document?.isOwner}
      on:change={()=> $document.update({system: {xpCost: $document.system.xpCost}})}
   />
</LabeledInput>

