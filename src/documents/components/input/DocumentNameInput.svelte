<script>
   import { getContext } from 'svelte';
   import DocumentTextInput from '~/documents/components/input/DocumentTextInput.svelte';
   const document = getContext('DocumentStore');
</script>

<div class="document-name">
   <DocumentTextInput bind:value={$document.name} />
</div>

<style lang="scss">
   .document-name {
      width: 100%;
      height: 100%;
      --input-height: 2rem;
      --input-padding: 0.25rem;
      --font-size: var(--font-size-extra-large);
   }
</style>
