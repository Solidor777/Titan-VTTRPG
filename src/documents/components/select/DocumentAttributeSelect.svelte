<script>
   import AttributeSelect from "~/helpers/svelte-components/select/AttributeSelect.svelte";
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   // Whether to allow none
   export let allowNone = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<AttributeSelect
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
