<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import ResistanceSelect from '~/helpers/svelte-components/select/ResistanceSelect.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.resistance}
   input={ResistanceSelect}
   label="{localize('resistance')}"
   on:change
/>
