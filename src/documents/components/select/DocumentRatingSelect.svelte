<script>
   import { getContext } from "svelte";
   import RatingSelect from "~/helpers/svelte-components/select/RatingSelect.svelte";

   // The value of the input
   export let value;

   // Whether to allow none
   export let allowNone = false;

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

<RatingSelect
   {allowNone}
   bind:value
   on:change
   on:change={async () => {
      $document.update(data);
   }}
/>
