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

<!--A user edit here is touched like any other field: targetDefense is actor-derived only through its no-target
   self-fallback (ReinitializeCheckOptions.js), and without touch tracking a later re-derivation pass (triggered by
   any check-option change, e.g. this very edit) would immediately overwrite it back to that fallback.-->
<CheckDialogField
   bind:value={
      () => $checkOptions.targetDefense,
      (value) => {
         $checkOptions.targetDefense = value;
         touchCheckOptionField(touchedFields, 'targetDefense');
      }
   }
   input={IntegerInput}
   {inputProps}
   label={'targetDefense'}
   testId={'check-field-targetDefense'}
   tooltip={'check.targetDefense.desc'}
/>
