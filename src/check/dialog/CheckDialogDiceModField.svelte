<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { touchCheckOptionField } from '~/check/dialog/ReinitializeCheckOptions.js';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {Set<string>} The actor-derived fields the user has edited in this dialog. */
   const touchedFields = getContext('touchedCheckOptionFields');

</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.diceMod,
      (value) => {
         $checkOptions.diceMod = value;
         touchCheckOptionField(touchedFields, 'diceMod');
      }
   }
   input={IntegerInput}
   label={'diceMod'}
   testId={'check-field-diceMod'}
   tooltip={'check.diceMod.desc'}
/>
