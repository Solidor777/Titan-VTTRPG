<svelte:options accessors={true} />

<script>
   import { getContext } from 'svelte';

   // The value of the input
   export let value;

   // Document reference
   const document = getContext('DocumentStore');

   export let disabled = false;
</script>

<input
   type="checkbox"
   bind:checked={value}
   disabled={disabled || !$document.isOwner}
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
