<script>
   import { getContext } from "svelte";
   import ResistanceSelectAllowNone from "../../helpers/svelte-components/ResistanceSelectAllowNone.svelte";

   // The value of the input
   export let value;

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

<ResistanceSelectAllowNone
   bind:value
   on:change={async () => {
      $document.update(data);
   }}
/>
