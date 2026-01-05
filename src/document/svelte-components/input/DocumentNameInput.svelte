<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type boolean Whether editing should be disabled for this component. */
   export let disabled = false;

   /** Update the name when the input changes. */
   function updateDocument () {
      if (!disabled && $document?.isOwner) {
         $document.update({
            name: $document.name,
         });
      }
   }
</script>

<div class="document-name">
   <TextInput
      bind:value={$document.name}
      on:change={updateDocument}
      on:keyup={updateDocument}
   />
</div>

<style lang="scss">
   .document-name {
      width: 100%;
      height: 100%;

      --titan-input-height: 32px;
      --titan-input-padding: var(--titan-padding-standard);
      --font-size: var(--titan-font-size-extra-large);
   }
</style>
