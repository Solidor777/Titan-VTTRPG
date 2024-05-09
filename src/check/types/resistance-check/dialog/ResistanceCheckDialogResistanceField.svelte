<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import ResistanceSelect from '~/helpers/svelte-components/select/ResistanceSelect.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {ResistanceCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={ResistanceSelect}
   label="{localize('resistance')}"
   bind:value={$checkOptions.resistance}
   on:change
/>
