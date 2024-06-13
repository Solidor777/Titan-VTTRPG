<script>
   import {getContext} from 'svelte';
   import DocumentTextInput from '~/document/sheet/input/DocumentTextInput.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="document-name">
   <DocumentTextInput bind:value={$document.name}/>
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
