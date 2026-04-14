<script>
   import { getContext } from 'svelte';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string|TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;
</script>

<LabeledElement
   label={'xp'}
   {tooltip}
>
   <IntegerInput
      bind:value={$document.system.xpCost}
      disabled={disabled || !$document?.isOwner}
      on:change={()=> $document.update({system: {xpCost: $document.system.xpCost}})}
   />
</LabeledElement>

