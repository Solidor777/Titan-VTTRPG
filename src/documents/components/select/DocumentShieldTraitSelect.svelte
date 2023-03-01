<script>
   import { getContext } from 'svelte';
   import ShieldTraitSelect from '~/helpers/svelte-components/select/ShieldTraitSelect.svelte';

   // The value of the input
   export let value;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Document reference
   const document = getContext('DocumentStore');
</script>

<ShieldTraitSelect
   {allowNone}
   disabled={disabled || !$document.isOwner}
   bind:value
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
