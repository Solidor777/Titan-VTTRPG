<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Readable} The dialog's read-only Check Options view. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.diceMod,
      (value) => setCheckOption('diceMod', value)
   }
   input={IntegerInput}
   label={'diceMod'}
   testId={'check-field-diceMod'}
   tooltip={'check.diceMod.desc'}
/>
