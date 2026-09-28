<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');

   // Set the floor for check complexity at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.complexity,
      (value) => setCheckOption('complexity', value)
   }
   input={IntegerInput}
   {inputProps}
   label={'complexity'}
   testId={'check-field-complexity'}
   tooltip={'check.complexity.desc'}
/>
