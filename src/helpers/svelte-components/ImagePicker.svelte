<svelte:options accessors={true} />

<script>
   import { getContext } from 'svelte';

   // Path to the image
   export let alt;
   export let src = void 0;

   // Get the sheet
   const application = getContext('#external').application;

   function onEditImage() {
      const current = src;
      const filePicker = new FilePicker({
         type: 'image',
         current: current,
         callback: async (newVal) => {
            src = newVal;
         },
         top: application.position.top + 40,
         left: application.position.left + 10,
      });
      return filePicker.browse();
   }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<img {alt} {src} on:keypress={onEditImage} on:click={onEditImage} />

<style>
   img {
      border-style: var(--border-style);
      cursor: pointer;
   }
</style>
