<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/select/CheckDifficultySelect.svelte';
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.difficulty}
   fieldTooltip={'check.difficulty.desc'}
   input={CheckDifficultySelect}
   label={localize('difficulty')}
   on:change
/>
