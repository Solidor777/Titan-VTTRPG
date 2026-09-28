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
      () => $checkOptions.attackerAccuracy,
      (value) => {
         $checkOptions.attackerAccuracy = value;
         touchCheckOptionField(touchedFields, 'attackerAccuracy');
      }
   }
   input={IntegerInput}
   {inputProps}
   label={'attackerAccuracy'}
   testId={'check-field-attackerAccuracy'}
   tooltip={'check.attackerAccuracy.desc'}
/>
