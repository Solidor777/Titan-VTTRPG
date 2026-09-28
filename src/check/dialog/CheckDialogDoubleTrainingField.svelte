<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.doubleTraining,
      (value) => setCheckOption('doubleTraining', value)
   }
   input={CheckboxInput}
   label={'doubleTraining'}
   testId={'check-field-doubleTraining'}
   tooltip={'check.doubleTraining.desc'}
/>
