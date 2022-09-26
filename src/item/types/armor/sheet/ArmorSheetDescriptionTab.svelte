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
      <div class="scrolling-content">
         <!--Description-->
         {#if $document.system.description !== "" && $document.system.description !== "<p></p>"}
            <div class={"description"}>
               <!--Header-->
               <h3 class="header">
                  {localize("description")}
               </h3>

               <!--Body-->
               <div class="body">
                  <DocumentEditorInput fieldName={"system.description"} />
               </div>
            </div>
         {:else}
            <!--Add description button-->
            <div class="add-description-button">
               <EfxButton
                  on:click={() => {
                     $document.system.description = localize("description");
                     $document.update({
                        system: $document.system,
                     });
                  }}
               >
                  <div class="button-content">
                     <div class="label">
                        {localize("addDescription")}
                     </div>
                     <i class="fas fa-circle-plus" />
                  </div>
               </EfxButton>
            </div>
         {/if}
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

         .add-description-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }

            .button-content {
               @include flex-row;
               @include flex-group-center;
               width: 100%;

               .label {
                  @include flex-row;
                  @include flex-group-center;
               }

               i {
                  @include flex-row;
                  @include flex-group-center;
                  margin-left: 0.5rem;
               }
            }
         }

         .description {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            height: 100%;

            .header {
               @include flex-row;
               @include flex-group-left;
               width: 100%;

               .label {
                  @include flex-row;
                  @include flex-group-left;
                  width: 100%;
               }
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
