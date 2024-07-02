<script>
   import {TJSProseMirror} from '@typhonjs-fvtt/svelte-standard/component';
   import {getContext} from 'svelte';

   /** @type string Path to the value that this input should modify. */
   export let path = void 0;

   /** @type boolean Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="editor">
   <TJSProseMirror options={{
      document: $document,
      fieldName: path,
      editable: $document.isOwner && !disabled
   }}/>
</div>

<style lang="scss">
   .editor {
      @include flex-row;
      @include flex-group-left;

      width: 100%;
      height: 100%;
   }
</style>
