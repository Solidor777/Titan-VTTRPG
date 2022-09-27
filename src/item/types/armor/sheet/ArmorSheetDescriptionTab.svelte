<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentEditorInput from "~/documents/components/input/DocumentEditorInput.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Setup context variables
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <!--Description-->
      <div class="description">
         <DocumentEditorInput fieldName={"system.description"} />
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   .tab {
      @include flex-row;
      @include flex-group-center;
      @include panel-2;
      height: 100%;
      width: 100%;
      font-size: 1rem;

      .description {
         @include flex-column;
         @include flex-group-top;
         flex-wrap: wrap;
         padding: 0.5rem;
         width: 100%;
         height: 100%;
      }
   }
</style>
