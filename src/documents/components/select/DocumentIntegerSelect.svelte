<script>
   import { getContext } from 'svelte';
   import IntegerSelect from '~/helpers/svelte-components/select/IntegerSelect.svelte';

   // The value of the input
   export let value = void 0;

   // The options for the select
   export let options = void 0;

   export let disabled = false;

   // Document reference
   const document = getContext('DocumentStore');
</script>

<IntegerSelect
   bind:value
   {options}
   disabled={disabled || !$document.isOwner}
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
