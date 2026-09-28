<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');

   // Set the floor for the rating at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.attackerMelee,
      (value) => setCheckOption('attackerMelee', value)
   }
   input={IntegerInput}
   {inputProps}
   label={'attackerMelee'}
   testId={'check-field-attackerMelee'}
   tooltip={'check.attackerMelee.desc'}
/>
