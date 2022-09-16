<script>
   import RaritySelect from "~/helpers/svelte-components/RaritySelect.svelte";
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   // Document reference
   const document = getContext("DocumentStore");

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

<RaritySelect
   bind:value
   on:change={async () => {
      await $document.update(data);
   }}
/>
