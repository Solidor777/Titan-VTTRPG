<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.damageMod,
      (value) => setCheckOption('damageMod', value)
   }
   input={IntegerInput}
   label={'damageMod'}
   testId={'check-field-damageMod'}
   tooltip={'check.damageMod.desc'}
/>
