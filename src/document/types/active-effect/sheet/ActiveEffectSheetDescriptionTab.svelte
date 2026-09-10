<script>
   import { getContext } from 'svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import DocumentEditorInput from '~/document/svelte-components/input/DocumentEditorInput.svelte';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

<!--Edits the native ActiveEffect description field; the bound input enriches the inactive view and persists edits.-->
<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.tabs.description.scrollTop}>
      <DocumentEditorInput path={'description'}/>
   </ScrollingContainer>
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
