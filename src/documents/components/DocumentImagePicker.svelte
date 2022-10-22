<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";

   // Path to the image
   export let path;
   export let alt;
   let img;

   // Get the sheett
   const { application } = getContext("external");

   // Get the contained document
   const document = getContext("DocumentStore");

   let src = getProperty($document, path);
   function onEditImage(event) {
      const current = src;
      const filePicker = new FilePicker({
         type: "image",
         current: current,
         callback: async (newVal) => {
            src = newVal;
            let updateData = {};
            updateData[path] = src;
            await $document.update(updateData);
         },
         top: application.position.top + 40,
         left: application.position.left + 10,
      });
      return filePicker.browse();
   }
</script>

<img bind:this={img} {alt} {src} on:keypress={(event) => onEditImage(event)} on:click={(event) => onEditImage(event)} />

<style>
   img {
      border-style: var(--border-style);
      cursor: pointer;
   }
</style>
