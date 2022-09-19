<script>
   import RaritySelect from "~/helpers/svelte-components/select/RaritySelect.svelte";
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<RaritySelect
   bind:value
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
