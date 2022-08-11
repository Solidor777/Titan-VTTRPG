<script>
   import { getContext } from "svelte";
   import ToggleIconButton from "~/helpers/svelte-components/ToggleIconButton.svelte";

   export let trueIcon = void 0;
   export let falseIcon = void 0;
   export let efx = void 0;
   export let value = void 0;

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Copy of the document data
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

<ToggleIconButton
   bind:trueIcon
   bind:falseIcon
   bind:efx
   bind:value
   on:change={async () => {
      $document.update(data);
   }}
/>>
