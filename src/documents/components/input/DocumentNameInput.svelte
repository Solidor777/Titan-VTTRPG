<script>
   import { getContext } from "svelte";
   import DocumentTextInput from "~/documents/components/input/DocumentTextInput.svelte";
   const document = getContext("DocumentStore");
</script>

{#if $document.name !== undefined}
   <div class="document-name">
      <DocumentTextInput bind:value={$document.name} />
   </div>
{/if}

<style lang="scss">
   .document-name {
      width: 100%;
      height: 100%;
      --input-height: 2.5rem;
      --input-border-radius: 10px;
      --font-size: var(--font-size-extra-large);
   }
</style>
