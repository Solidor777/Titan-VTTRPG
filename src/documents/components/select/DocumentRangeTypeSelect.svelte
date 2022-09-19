<script>
   import { getContext } from "svelte";
   import RangeTypeSelect from "~/helpers/svelte-components/select/RangeTypeSelect.svelte";

   // The value of the input
   export let value;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<RangeTypeSelect
   bind:value
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
