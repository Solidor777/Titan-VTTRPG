<script>
   import { getContext } from 'svelte';
   import DamageReducedBySelect from '~/helpers/svelte-components/select/DamageReducedBySelect.svelte';

   // Value
   export let value = void 0;
   export let disabled = false;

   // Document reference
   const document = getContext('DocumentStore');
</script>

<DamageReducedBySelect
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
