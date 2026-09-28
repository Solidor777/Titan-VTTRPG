<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.trainingMod,
      (value) => setCheckOption('trainingMod', value)
   }
   input={IntegerInput}
   label={'trainingMod'}
   testId={'check-field-trainingMod'}
   tooltip={'check.trainingMod.desc'}
/>
