<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {CheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

   // Set the floor for check complexity at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   input={IntegerInput}
   label="{localize('complexity')}"
   fieldTooltip="{localize('check.complexity.desc')}"
   bind:value={$checkOptions.complexity}
   on:change
   {inputProps}
/>
