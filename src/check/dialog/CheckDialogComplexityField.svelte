<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   // Set the floor for check complexity at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   bind:value={$checkOptions.complexity}
   input={IntegerInput}
   {inputProps}
   label={'complexity'}
   on:change
   tooltip={'check.complexity.desc'}
/>
