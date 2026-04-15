<script>
   import { getContext } from 'svelte';
   import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';

   /**
    * @type {string} Text to display if the value is not a path to valid image.
    */
   export let alt = 'icon';

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** Updates the document in response to changes. */
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
   on:editor:save={() => updateDocument()}
   {tooltip}
/>
