<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {AttributeCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={CheckboxInput}
   label="{localize('doubleTraining')}"
   bind:value={$checkOptions.doubleTraining}
   on:change
/>
