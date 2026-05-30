<script>
   import { getContext } from 'svelte';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /**
    * @typedef {object} ItemSheetXPCostInputProps
    * @property {boolean} [disabled] Whether the input should currently be disabled.
    * @property {string | object} [tooltip] The Tooltip to display for this element, if any.
    */

   /** @type {ItemSheetXPCostInputProps} */
   const { disabled = false, tooltip = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<LabeledElement
   label={'xp'}
   {tooltip}
>
   <IntegerInput
      bind:value={$document.system.xpCost}
      disabled={disabled || !$document?.isOwner}
      onchange={() => $document.update({system: {xpCost: $document.system.xpCost}})}
   />
</LabeledElement>
