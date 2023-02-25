<script>
   import { getContext } from 'svelte';
   import { TJSProseMirror } from '@typhonjs-fvtt/svelte-standard/component';
   const document = getContext('DocumentStore');
   export let value = void 0;
</script>

<div class="editor">
   <TJSProseMirror
      bind:content={value}
      on:editor:save={() => {
         $document.update({
            system: $document.system,
            flags: $document.flags,
         });
      }}
   />
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
