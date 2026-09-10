<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import ResistanceSelect from '~/helpers/svelte-components/input/select/ResistanceSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.resistance}
   input={ResistanceSelect}
   label={'resistance'}
   testId={'check-field-resistance'}
/>
