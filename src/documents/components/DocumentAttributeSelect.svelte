<script>
   import AttributeSelect from "~/helpers/svelte-components/AttributeSelect.svelte";
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Select options
   export let options = void 0;

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

<AttributeSelect
   bind:value
   {options}
   on:change={async () => {
      $document.update(data);
   }}
/>
