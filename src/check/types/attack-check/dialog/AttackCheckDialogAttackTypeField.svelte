<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import AttackTypeSelect from '~/helpers/svelte-components/select/AttackTypeSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {AttackCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={AttackTypeSelect}
   label="{localize('type')}"
   fieldTooltip="{localize('check.attackType.desc')}"
   bind:value={$checkOptions.type}
   on:change
/>
