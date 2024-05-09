<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {CheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={CheckboxInput}
   label="{localize('doubleExpertise')}"
   bind:value={$checkOptions.doubleExpertise}
   on:change
/>
