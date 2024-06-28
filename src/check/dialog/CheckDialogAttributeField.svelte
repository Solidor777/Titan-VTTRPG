<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import AttributeSelect from '~/helpers/svelte-components/input/select/AttributeSelect.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.attribute}
   fieldTooltip="{localize('check.attribute.desc')}"
   input={AttributeSelect}
   label="{localize('attribute')}"
   on:change
/>
