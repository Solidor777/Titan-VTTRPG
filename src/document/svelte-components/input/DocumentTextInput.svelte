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

   /** @type {string} The text the input shows. It follows the model only while the input has no focus. */
   let text = $state(value ?? '');

   /** @type {boolean} Whether the input has focus. */
   let focused = $state(false);

   // Constraint: a focused input is never rewritten from the model. An update from another client rebuilds the document
   // and would otherwise replace the text being entered and end a running input method composition.
   $effect(() => {
      const stored = value;
      if (!focused) {
         text = stored ?? '';
      }
   });

   /**
    * Writes the entered text into the model and sends the document. The model may have been rebuilt since the text
    * was entered, so the text is written again before the send.
    * @returns {void}
    */
   function updateDocument() {
      value = text;
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
   bind:value={text}
   disabled={disabled || !document.data?.isOwner}
   oncompositionend={updateDocument}
   onchange={updateDocument}
   onblur={() => (focused = false)}
   onfocus={() => (focused = true)}
   oninput={handleInput}
   {testId}
   {tooltip}
/>
