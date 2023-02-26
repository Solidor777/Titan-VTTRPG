<script>
   import { TJSProseMirror } from '@typhonjs-fvtt/svelte-standard/component';
   import { getContext } from 'svelte';
   //import TestProseMirror from '~/documents/components/input/TestProseMirrorEdit.svelte';

   const document = getContext('DocumentStore');
   export let fieldName = void 0;
</script>

<div class="editor">
   <TJSProseMirror options={{ document: $document, fieldName: fieldName }} />
</div>

<style lang="scss">
   @import '../../../Styles/Mixins.scss';
   .editor {
      @include flex-row;
      @include flex-group-left;
      width: 100%;
      height: 100%;
   }
</style>
