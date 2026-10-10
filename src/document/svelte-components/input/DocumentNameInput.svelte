<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /**
    * @typedef {object} DocumentNameInputProps
    * @property {boolean} [disabled] - Whether editing should be disabled for this component.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentNameInputProps} */
   let {
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} The name the input shows. It follows the document only while the input has no focus. */
   let value = $state(document.data.name);

   /** @type {boolean} Whether the input has focus. */
   let focused = $state(false);

   // Constraint: a focused input is never rewritten from the document. A rename from another client or sheet would
   // otherwise replace the name being typed; without this follow, a stale name is written back by the next key press.
   $effect(() => {
      const stored = document.data.name;
      if (!focused) {
         value = stored;
      }
   });

   /**
    * Updates the document name when the input changes.
    * @returns {void}
    */
   function updateDocument() {
      if (value.length > 0) {
         document.data.update({
            name: value,
         });
      }
   }
</script>

<div class="document-name">
   <TextInput
      bind:value={value}
      disabled={disabled || !document.data?.isOwner}
      onchange={updateDocument}
      onfocus={() => {
         focused = true;
      }}
      onblur={() => {
         focused = false;
      }}
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
