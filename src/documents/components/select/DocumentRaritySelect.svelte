<script>
   import RaritySelect from "~/helpers/svelte-components/select/RaritySelect.svelte";
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   export let disabled = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<RaritySelect
   bind:value
   disabled={disabled || !$document.isOwner}
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
