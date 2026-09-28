<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { touchCheckOptionField } from '~/check/dialog/ReinitializeCheckOptions.js';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {Set<string>} The actor-derived fields the user has edited in this dialog. */
   const touchedFields = getContext('touchedCheckOptionFields');

   // Set the floor for the rating at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.attackerMelee,
      (value) => {
         $checkOptions.attackerMelee = value;
         touchCheckOptionField(touchedFields, 'attackerMelee');
      }
   }
   input={IntegerInput}
   {inputProps}
   label={'attackerMelee'}
   testId={'check-field-attackerMelee'}
   tooltip={'check.attackerMelee.desc'}
/>
