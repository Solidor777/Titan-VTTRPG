<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import ResistanceSelect from '~/helpers/svelte-components/input/select/ResistanceSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Readable} The dialog's read-only Check Options view. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.resistance,
      (value) => setCheckOption('resistance', value)
   }
   input={ResistanceSelect}
   label={'resistance'}
   testId={'check-field-resistance'}
/>
