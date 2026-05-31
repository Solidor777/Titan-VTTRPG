<script>
   import { getContext } from 'svelte';
   import DocumentBoundEditorInput from '~/document/svelte-components/input/DocumentBoundEditorInput.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="tab">
   <DocumentBoundEditorInput bind:value={document.data.system.description}/>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include panel-2;
      @include padding-standard;

      align-items: stretch;
      justify-content: flex-start;
      flex: 1;
      min-height: 0;
      width: 100%;
   }
</style>
