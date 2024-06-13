<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   // Set the floor for check complexity at 0.
   const inputProps = {min: 0};
</script>

<CheckDialogField
   bind:value={$checkOptions.complexity}
   fieldTooltip="{localize('check.complexity.desc')}"
   input={IntegerInput}
   {inputProps}
   label="{localize('complexity')}"
   on:change
/>
