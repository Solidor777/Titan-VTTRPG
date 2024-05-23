<script>
   import getApplication from '~/helpers/utility-functions/GetApplication';

   // Path to the image location
   export let src = void 0;

   // Alt text for if the path is not a valid image
   export let alt = 'img';

   // Get the aplication
   const application = getApplication();

   // Create an image picker ponting to the path
   /**
    *
    */
   function onEditImage() {
      const current = src;
      const filePicker = new FilePicker({
         type: 'image',
         current: current,
         callback: async (newPath) => {
            src = newPath;
         },
         top: application.position.top + 40,
         left: application.position.left + 10,
      });
      return filePicker.browse();
   }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<img
   class={$document.isOwner ? 'active' : ''}
   {alt}
   {src}
   on:keypress={onEditImage}
   on:click={onEditImage}
/>

<style>
   img {
      border-style: var(--border-style);
      &.active {
         cursor: pointer;
      }
   }
</style>
