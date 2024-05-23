<script>
   import {getContext} from 'svelte';
   import DocumentTextInput from '~/document/components/input/DocumentTextInput.svelte';

   /** @type Document Reference to the Document this Application is for. */
   const document = getContext('document');
</script>

<div class="document-name">
   <DocumentTextInput bind:value={$document.name}/>
</div>

<style lang="scss">
   .document-name {
      width: 100%;
      height: 100%;

      --input-height: 32px;
      --input-padding: var(--padding-standard);
      --font-size: var(--font-size-extra-large);
   }
</style>
