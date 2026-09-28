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
      () => $checkOptions.healingMod,
      (value) => {
         $checkOptions.healingMod = value;
         touchCheckOptionField(touchedFields, 'healingMod');
      }
   }
   input={IntegerInput}
   label={'healingMod'}
   testId={'check-field-healingMod'}
   tooltip={'check.healingMod.desc'}
/>
