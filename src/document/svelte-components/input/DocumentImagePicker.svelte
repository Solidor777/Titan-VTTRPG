<script>
   import { getContext } from 'svelte';
   import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

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
</script>

<ImagePicker
   {alt}
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {tooltip}
/>
