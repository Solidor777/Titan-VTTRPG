<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import AttributeSelect from '~/helpers/svelte-components/select/AttributeSelect.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {AttributeCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   input={AttributeSelect}
   label="{localize('attribute')}"
   fieldTooltip="{localize('check.attribute.desc')}"
   bind:value={$checkOptions.attribute}
   on:change
/>
