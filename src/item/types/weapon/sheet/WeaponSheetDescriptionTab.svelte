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
            {#if $appState.isExpanded.description.description}
               <div class="body">
                  <DocumentEditorInput fieldName={"system.description"} />
               </div>
            {/if}
         </div>

         <!--Description-->
         <div class="description">
            <!--Header-->
            <h3 class="header">
               {localize("attackDescription")}
            </h3>

            <!--Body-->
            {#if $appState.isExpanded.description.attackDescription}
               <div class="body">
                  <DocumentEditorInput fieldName={"system.attackDescription"} />
               </div>
            {/if}
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
      font-size: 1rem;

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

            .header {
               @include flex-row;
               @include flex-group-left;
               width: 100%;
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
