<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import { touchCheckOptionField } from '~/check/dialog/ReinitializeCheckOptions.js';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {Set<string>} The actor-derived fields the user has edited in this dialog. */
   const touchedFields = getContext('touchedCheckOptionFields');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.automaticFailure,
      (value) => {
         $checkOptions.automaticFailure = value;
         touchCheckOptionField(touchedFields, 'automaticFailure');
      }
   }
   input={CheckboxInput}
   label={'automaticFailure'}
   testId={'check-field-automaticFailure'}
   tooltip={'check.automaticFailure.desc'}
/>
