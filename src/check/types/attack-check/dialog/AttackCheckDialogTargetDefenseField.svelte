<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   // Set the floor for the rating at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   bind:value={$checkOptions.targetDefense}
   input={IntegerInput}
   {inputProps}
   label={localize('targetDefense')}
   on:change
   tooltip={'check.targetDefense.desc'}
/>
