<script>
   import { getContext } from 'svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import DocumentBoundEditorInput from '~/document/svelte-components/input/DocumentBoundEditorInput.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.tabs.description.scrollTop}>
      <DocumentBoundEditorInput bind:value={document.data.system.description}/>
   </ScrollingContainer>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;

      height: 100%;
      width: 100%;
   }
</style>
