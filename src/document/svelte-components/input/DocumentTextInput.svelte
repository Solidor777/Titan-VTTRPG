<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentTextInputProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether editing this input should be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string} [testId] - Optional stable selector forwarded to the inner input as `data-testid`.
    */

   /** @type {DocumentTextInputProps} */
   let {
      value = $bindable(),
      disabled = false,
      tooltip = void 0,
      testId = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Updates the document data when the input changes.
    * @returns {void}
    */
   function updateDocument() {
      refreshSystemDocument(document.data, disabled);
   }

   /**
    * Sends the text as it is entered, whether or not a key produced it (a paste with the mouse, autofill), so another
    * update that rebuilds the document before the `change` event cannot discard it. Constraint: nothing is sent while
    * an input method composition runs, because a send on every composition update ends the composition early and the
    * committed text is then entered twice (inferred cause: the echo of the update rewrites the input's value). The text
    * is sent when the composition ends.
    * @param {InputEvent} event - The native input event.
    * @returns {void}
    */
   function handleInput(event) {
      if (!event.isComposing) {
         updateDocument();
      }
   }
</script>

<TextInput
   bind:value
   disabled={disabled || !document.data?.isOwner}
   oncompositionend={updateDocument}
   onchange={updateDocument}
   oninput={handleInput}
   {testId}
   {tooltip}
/>
