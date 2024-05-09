<script>
   import { getContext } from 'svelte';
   import { TJSProseMirror } from '@typhonjs-fvtt/svelte-standard/component';

   const document = getContext('document');
   export let value = void 0;

   // Updates the document data when the input changes
   async function updateDocument() {
      if ($document?.isOwner) {
         await $document.update({
            system: $document.system,
            flags: $document.flags,
         });
      }
   }
</script>

<div class="editor">
   <TJSProseMirror
      bind:content={value}
      on:editor:save={()=> updateDocument()}
      />
</div>

<style lang="scss">
   .editor {
      @include flex-row;
      @include flex-group-left;
      width: 100%;
      height: 100%;
   }
</style>
