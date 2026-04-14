<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @type {boolean} Whether editing should be disabled for this component.
    */
   export let disabled = false;

   /**
    * @type {string|TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** The name of the document. */
   let value = $document.name;

   /** Update the name when the input changes. */
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
      on:change={updateDocument}
      on:keyup={updateDocument}
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
