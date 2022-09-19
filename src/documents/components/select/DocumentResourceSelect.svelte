<script>
   import { getContext } from "svelte";
   import ResourceSelect from "~/helpers/svelte-components/select/ResourceSelect.svelte";

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<ResourceSelect
   {allowNone}
   bind:value
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
