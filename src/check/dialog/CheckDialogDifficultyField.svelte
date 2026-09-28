<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/input/select/CheckDifficultySelect.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.difficulty,
      (value) => setCheckOption('difficulty', value)
   }
   input={CheckDifficultySelect}
   label={'difficulty'}
   testId={'check-field-difficulty'}
   tooltip={'check.difficulty.desc'}
/>
