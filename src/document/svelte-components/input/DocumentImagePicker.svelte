<script>
   import { getContext } from 'svelte';
   import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {string} - The value that this input should modify. */
   export let value = void 0;

   /** @type {string} Text to display if the value is not a path to valid image. */
   export let alt = 'img';

   /** @type {boolean} - Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string|TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /**@type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ImagePicker
   {alt}
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:editor:save={() => refreshSystemDocument($document, disabled)}
   {tooltip}
/>
