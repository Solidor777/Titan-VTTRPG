<script>
   import { getContext } from "svelte";
   import ResistanceSelect from "~/helpers/svelte-components/ResistanceSelect.svelte";

   // The value of the input
   export let value = void 0;

   // The options for the select
   export let options = void 0;

   // Document reference
   const document = getContext("DocumentSheetObject");

   let data;
   $: {
      data = {
         img: $document.img,
         system: $document.system,
         flags: $document.flags,
         name: $document.name,
      };
   }
</script>

<ResistanceSelect
   bind:value
   {options}
   on:change={async () => {
      $document.update(data);
   }}
/>
