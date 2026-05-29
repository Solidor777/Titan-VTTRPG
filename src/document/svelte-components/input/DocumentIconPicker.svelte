<script>
   import { getContext } from 'svelte';
   import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';

   /**
    * @typedef {object} DocumentIconPickerProps
    * @property {string} [alt] - Text to display if the value is not a path to a valid image.
    * @property {boolean} [disabled] - Whether editing this input should be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentIconPickerProps} */
   let {
      alt = 'icon',
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** Updates the document icon in response to image picker changes. */
   async function updateDocument() {
      if (!disabled && $document?.isOwner) {
         $document.update({
            img: $document.img,
         });
      }
   }
</script>

<ImagePicker
   {alt}
   bind:value={$document.img}
   disabled={disabled || !$document?.isOwner}
   onchange={updateDocument}
   {tooltip}
/>
