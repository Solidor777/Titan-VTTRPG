<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import AttributeSelect from '~/helpers/svelte-components/input/select/AttributeSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

</script>

<CheckDialogField
   bind:value={$checkOptions.attribute}
   input={AttributeSelect}
   label={'attribute'}
   testId={'check-field-attribute'}
   tooltip={'check.attribute.desc'}
/>
