<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {boolean} Whether editing should be disabled for this component. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {string} The name of the document. */
   let value = $document.name;

   /**
    * Updates the document name when the input changes.
    * @returns {void}
    */
   function updateDocument() {
      if (value.length > 0) {
         $document.update({
            name: value,
         });
      }
   }
</script>

<div class="document-name">
   <TextInput
      bind:value={value}
      disabled={disabled || !$document?.isOwner}
      onchange={updateDocument}
      onkeyup={updateDocument}
      {tooltip}
   />
</div>

<style lang="scss">
   .document-name {
      width: 100%;
      height: 100%;

      --titan-input-height: 32px;
      --titan-input-padding: var(--titan-spacing-standard);
      --font-size: var(--titan-font-size-extra-large);
   }
</style>
