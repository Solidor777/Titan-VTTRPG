<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.diceMod}
   input={IntegerInput}
   label={'diceMod'}
   on:change
   tooltip={'check.diceMod.desc'}
/>
