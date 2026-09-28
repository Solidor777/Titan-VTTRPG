<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import AttackTypeSelect from '~/helpers/svelte-components/input/select/AttackTypeSelect.svelte';
   import { getContext } from 'svelte';
   import { touchCheckOptionField } from '~/check/dialog/ReinitializeCheckOptions.js';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {Set<string>} The actor-derived fields the user has edited in this dialog. */
   const touchedFields = getContext('touchedCheckOptionFields');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.type,
      (value) => {
         $checkOptions.type = value;
         touchCheckOptionField(touchedFields, 'type');
      }
   }
   input={AttackTypeSelect}
   label={'type'}
   testId={'check-field-type'}
   tooltip={'check.attackType.desc'}
/>
