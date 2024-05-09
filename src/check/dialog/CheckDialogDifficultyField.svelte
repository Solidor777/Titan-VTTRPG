<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/select/CheckDifficultySelect.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {CheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={CheckDifficultySelect}
   label="{localize('difficulty')}"
   fieldTooltip="{localize('check.difficulty.desc')}"
   bind:value={$checkOptions.difficulty}
   on:change
/>
