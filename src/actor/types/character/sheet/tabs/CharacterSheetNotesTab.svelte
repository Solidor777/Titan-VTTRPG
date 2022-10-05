<script>
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentEditorInput from "../../../../../documents/components/input/DocumentEditorInput.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <DocumentEditorInput fieldName={"system.description"} />
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;
   }
</style>
