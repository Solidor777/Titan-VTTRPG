<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /** @type {import('svelte/store').Readable} The dialog's read-only Check Options view. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');

   // Set the floor for the rating at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.attackerAccuracy,
      (value) => setCheckOption('attackerAccuracy', value)
   }
   input={IntegerInput}
   {inputProps}
   label={'attackerAccuracy'}
   testId={'check-field-attackerAccuracy'}
   tooltip={'check.attackerAccuracy.desc'}
/>
