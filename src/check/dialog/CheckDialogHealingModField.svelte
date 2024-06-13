<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type {CastingCheckOptions} Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.healingMod}
   fieldTooltip="{localize('check.healingMod.desc')}"
   input={IntegerInput}
   label="{localize('healingMod')}"
   on:change
/>
