<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentEditorInput from "~/documents/components/input/DocumentEditorInput.svelte";

   // Setup context variables
   const appState = getContext("ApplicationStateStore");
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <!--Description-->
      <div class="description">
         <!--Header-->
         <h3>
            {localize("description")}
         </h3>

         <!--Body-->
         <div class="body">
            <DocumentEditorInput fieldName={"system.description"} />
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
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
         padding: 0.5rem;
         width: 100%;
         height: 100%;

         h3 {
            @include flex-row;
            @include flex-group-left;
            width: 100%;
            margin-bottom: 0;
         }

         .body {
            @include flex-row;
            @include flex-group-left;
            flex-wrap: wrap;
            width: 100%;
            height: 100%;
         }
      }
   }
</style>
