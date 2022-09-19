<script>
   import { getContext } from "svelte";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // The value of the input
   export let value = void 0;

   // The options for the select
   export let options = void 0;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<Select
   bind:value
   {options}
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
