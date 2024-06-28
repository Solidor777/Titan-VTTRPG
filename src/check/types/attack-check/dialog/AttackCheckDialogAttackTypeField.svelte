<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import AttackTypeSelect from '~/helpers/svelte-components/input/select/AttackTypeSelect.svelte';
   import {getContext} from 'svelte';

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.type}
   fieldTooltip="{localize('check.attackType.desc')}"
   input={AttackTypeSelect}
   label="{localize('type')}"
   on:change
/>
