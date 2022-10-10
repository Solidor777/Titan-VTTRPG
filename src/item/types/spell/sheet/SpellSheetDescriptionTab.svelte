<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentEditorInput from "~/documents/components/input/DocumentEditorInput.svelte";

   // Setup context variables
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <div class="scrolling-content">
         <!--Description-->
         <div class="description">
            <!--Header-->
            <h3 class="header">
               {localize("description")}
            </h3>

            <!--Body-->
            <div class="body">
               <DocumentEditorInput fieldName={"system.description"} />
            </div>
         </div>

         <!--Description-->
         <div class="description">
            <!--Header-->
            <h3>
               {localize("castingNotes")}
            </h3>

            <!--Body-->
            <div class="body">
               <DocumentEditorInput fieldName={"system.castingNotes"} />
            </div>
         </div>
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
      @include font-size-normal;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         width: 100%;
         padding: 0.5rem;

         .description {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            min-height: 13rem;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }

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
   }
</style>
