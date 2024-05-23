<script>
   import { getContext } from 'svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication';

   // Property path of the document to change
   export let path = void 0;

   // Alt text for if the path is not a valid image
   export let alt = 'img';

   // Get the aplication
   const application = getApplication();

   // Get the contained document
   const document = getContext('document');

   // Get the image path from the property
   let src = getProperty($document, path);

   /**
    *
    */
   function onEditImage() {
      // If the current user owns this actor
      if ($document?.isOwner) {
         // Create a file picker pointing to the source
         const current = src;
         const filePicker = new FilePicker({
            type: 'image',
            current: current,
            callback: async (newPath) => {
               if ($document?.isOwner) {
                  src = newPath;
                  let updateData = {};
                  updateData[path] = src;
                  await $document.update(updateData);
               }
            },
            top: application.position.top + 40,
            left: application.position.left + 10,
         });
         return filePicker.browse();
      }
   }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<img
   class={$document?.isOwner ? 'active' : ''}
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
