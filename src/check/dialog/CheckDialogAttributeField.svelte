<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import AttributeSelect from '~/helpers/svelte-components/input/select/AttributeSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.attribute,
      (value) => setCheckOption('attribute', value)
   }
   input={AttributeSelect}
   label={'attribute'}
   testId={'check-field-attribute'}
   tooltip={'check.attribute.desc'}
/>
