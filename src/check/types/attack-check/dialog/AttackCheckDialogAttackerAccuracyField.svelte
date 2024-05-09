<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /** @type {AttackCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

   // Set the floor for the rating at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   input={IntegerInput}
   label="{localize('attackerAccuracy')}"
   fieldTooltip="{localize('check.attackerAccuracy.desc')}"
   bind:value={$checkOptions.attackerAccuracy}
   on:change
   {inputProps}
/>
