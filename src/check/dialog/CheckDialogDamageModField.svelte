<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {CastingCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={IntegerInput}
   label="{localize('damageMod')}"
   fieldTooltip="{localize('check.damageMod.desc')}"
   bind:value={$checkOptions.damageMod}
   on:change
/>
