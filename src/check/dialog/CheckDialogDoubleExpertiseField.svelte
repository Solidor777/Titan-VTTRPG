<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Readable} The dialog's read-only Check Options view. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.doubleExpertise,
      (value) => setCheckOption('doubleExpertise', value)
   }
   input={CheckboxInput}
   label={'doubleExpertise'}
   testId={'check-field-doubleExpertise'}
   tooltip={'check.doubleExpertise.desc'}
/>
