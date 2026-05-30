<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/input/select/CheckDifficultySelect.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.difficulty}
   input={CheckDifficultySelect}
   label={'difficulty'}
   tooltip={'check.difficulty.desc'}
/>
