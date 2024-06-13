<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.expertiseMod}
   fieldTooltip="{localize('check.expertiseMod.desc')}"
   input={IntegerInput}
   label="{localize('expertiseMod')}"
   on:change
/>
