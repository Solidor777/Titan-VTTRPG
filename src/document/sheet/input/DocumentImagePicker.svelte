<script>
   import {getContext} from 'svelte';
   import ImagePicker from '~/helpers/svelte-components/ImagePicker.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type string Text to display if the value is not a path to valid image. */
   export let alt = 'img';

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /**
    * Update the document data when the input changes.
    */
   function updateDocument() {
      if ($document?.isOwner && !disabled) {
         $document.update({
            system: $document.system,
            flags: $document.flags,
         });
      }
   }
</script>

<ImagePicker
   {alt}
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={updateDocument}
   {value}
/>