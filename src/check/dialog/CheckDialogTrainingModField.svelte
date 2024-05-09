<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {AttributeCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={IntegerInput}
   label="{localize('trainingMod')}"
   fieldTooltip="{localize('check.trainingMod.desc')}"
   bind:value={$checkOptions.trainingMod}
   on:change
/>
