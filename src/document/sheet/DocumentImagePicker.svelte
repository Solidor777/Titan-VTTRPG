<script>
   import {getContext} from 'svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication';

   /** @type string Path to the document property this svelte-components should modify. */
   export let path = void 0;

   /** @type string Alt text to display if the image path is invalid. */
   export let alt = 'img';

   /** @type boolean Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type Application The Svelte Component's Application. */
   const application = getApplication();

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string The value of the image property within the Document. */
   let src = foundry.utils.getProperty($document, path);

   // Update the image in response to changes
   $: {
      if (document) {
         src = foundry.utils.getProperty($document, path);
      }
   }

   /**
    * Creates a File Picker for setting the value of the image.
    * @returns {FilePicker.browse|void} The newly created File Picker if any was created.
    */
   function onOpenFilePicker() {
      // If the current user owns this document
      if ($document?.isOwner && !disabled) {

         // Create a file picker pointing at the current source
         const filePicker = new FilePicker({
            type: 'image',
            current: src,
            callback: (newPath) => {
               if ($document?.isOwner) {
                  src = newPath;
                  const updateData = {};
                  updateData[path] = src;
                  $document.update(updateData);
               }
            },
            top: application.position.top + 40,
            left: application.position.left + 10,
         });

         filePicker.browse();
      }
   }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<img
   {alt}
   class={$document?.isOwner && !disabled ? 'active' : ''}
   on:click={() => onOpenFilePicker()}
   on:keypress={() => onOpenFilePicker()}
   {src}
/>

<style>
   img {
      border-style: var(--titan-border-style);

      &.active {
         cursor: pointer;
      }
   }
</style>
