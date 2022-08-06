<script>
   import { getContext } from "svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   const document = getContext("DocumentSheetObject");
</script>

<div class="document-name">
   <DocumentTextInput bind:value={$document.name} />
</div>

<style lang="scss">
   .document-name {
      font-family: var(--font-family);
      font-size: 1.6rem;
      width: 100%;
      height: 100%;
      --input-height: 2.5rem;
      --input-border-radius: 10px;
      --font-size: 1.5rem;
   }
</style>
