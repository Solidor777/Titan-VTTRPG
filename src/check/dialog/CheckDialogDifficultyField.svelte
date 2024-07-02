<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/select/CheckDifficultySelect.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.difficulty}
   fieldTooltip="{localize('check.difficulty.desc')}"
   input={CheckDifficultySelect}
   label="{localize('difficulty')}"
   on:change
/>
