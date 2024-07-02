<script>
   import {getContext} from 'svelte';
   import {TJSProseMirror} from '@typhonjs-fvtt/svelte-standard/component';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type boolean Whether editing should be disabled for this svelte-components. */
   export let disabled = false;

   /**
    * Update the document data when the input changes.
    */
   function updateDocument() {
      if ($document?.isOwner && !disabled) {
         $document.update({
            system: $document.system,
            flags: $document.flags,
         });
      }
   }
</script>

<div class="editor">
   <TJSProseMirror
      bind:content={value}
      on:editor:save={updateDocument}
      options={{editable: $document.isOwner && !disabled}}
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
