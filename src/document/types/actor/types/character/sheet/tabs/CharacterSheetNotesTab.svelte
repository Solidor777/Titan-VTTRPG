<script>
   import {getContext} from 'svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import DocumentBoundEditorInput from "~/document/components/input/DocumentBoundEditorInput.svelte";

   /** @type Document Reference to the Character document. */
   const document = getContext('document');

   /** @type object Reference to the object containing the application state. */
   const appState = getContext('applicationState');
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <DocumentBoundEditorInput bind:value={$document.system.description}/>
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
