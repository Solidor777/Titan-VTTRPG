<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import AttackTypeSelect from '~/helpers/svelte-components/select/AttackTypeSelect.svelte';
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.type}
   input={AttackTypeSelect}
   label={localize('type')}
   on:change
   tooltip={'check.attackType.desc'}
/>
