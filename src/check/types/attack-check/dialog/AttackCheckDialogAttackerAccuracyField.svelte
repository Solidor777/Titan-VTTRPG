<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   // Set the floor for the rating at 0.
   const inputProps = { min: 0 };
</script>

<CheckDialogField
   bind:value={$checkOptions.attackerAccuracy}
   input={IntegerInput}
   {inputProps}
   label={localize('attackerAccuracy')}
   tooltip={'check.attackerAccuracy.desc'}
/>
