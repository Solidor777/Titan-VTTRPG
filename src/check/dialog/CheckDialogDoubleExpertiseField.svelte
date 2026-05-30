<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.doubleExpertise}
   input={CheckboxInput}
   label={'doubleExpertise'}
   tooltip={'check.doubleExpertise.desc'}
/>
