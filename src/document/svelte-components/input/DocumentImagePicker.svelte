<script>
   import { getContext } from 'svelte';
   import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';

   /**
    * @typedef {object} DocumentImagePickerProps
    * @property {string} [value] - The image path value to bind to.
    * @property {string} [alt] - Text to display if the value is not a path to a valid image.
    * @property {boolean} [disabled] - Whether editing this input should be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentImagePickerProps} */
   let {
      value = $bindable(void 0),
      alt = 'img',
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Persists the picked image path. The bound value is only assigned on the in-memory document, so it must be
    * sent in an update to reach the stored source.
    * @returns {Promise<void>} Resolves once the document update completes, or immediately if skipped.
    */
   async function updateDocument() {
      if (!disabled && document.data?.isOwner) {
         await document.data.update({ img: value });
      }
   }
</script>

<ImagePicker
   {alt}
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={updateDocument}
   {tooltip}
/>
