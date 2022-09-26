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
            <div class={`description${$appState.isExpanded.description.description ? " expanded" : ""}`}>
               <!--Header-->
               <div class="header">
                  <!--Label-->
                  <h3 class="label">
                     {localize("description")}
                  </h3>

                  <!--Add Attack Button-->
                  <div class="toggle-expanded-button">
                     {#if $appState.isExpanded.description.description}
                        <!--Collapse button-->
                        <IconButton
                           icon="fas fa-angle-double-down"
                           on:click={() => {
                              $appState.isExpanded.description.description = false;
                           }}
                        />
                     {:else}
                        <!--Expand button-->
                        <IconButton
                           icon="fas fa-angle-double-left"
                           on:click={() => {
                              $appState.isExpanded.description.description = true;
                           }}
                        />
                     {/if}
                  </div>
               </div>

               <!--Body-->
               {#if $appState.isExpanded.description.description}
                  <div class="body">
                     <DocumentEditorInput fieldName={"system.description"} />
                  </div>
               {/if}
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

         <!--Attack Description-->
         {#if $document.system.attackDescription !== "" && $document.system.attackDescription !== "<p></p>"}
            <div class={`description${$appState.isExpanded.description.attackDescription ? " expanded" : ""}`}>
               <!--Header-->
               <div class="header">
                  <!--Label-->
                  <h3 class="label">
                     {localize("attackDescription")}
                  </h3>

                  <!--Add Attack Button-->
                  <div class="toggle-expanded-button">
                     {#if $appState.isExpanded.description.attackDescription}
                        <!--Collapse button-->
                        <IconButton
                           icon="fas fa-angle-double-down"
                           on:click={() => {
                              $appState.isExpanded.description.attackDescription = false;
                           }}
                        />
                     {:else}
                        <!--Expand button-->
                        <IconButton
                           icon="fas fa-angle-double-left"
                           on:click={() => {
                              $appState.isExpanded.description.attackDescription = true;
                           }}
                        />
                     {/if}
                  </div>
               </div>

               <!--Body-->
               {#if $appState.isExpanded.description.attackDescription}
                  <div class="body">
                     <DocumentEditorInput fieldName={"system.attackDescription"} />
                  </div>
               {/if}
            </div>
         {:else}
            <!--Add description button-->
            <div class="add-description-button">
               <EfxButton
                  on:click={() => {
                     $document.system.attackDescription = localize("attackDescription");
                     $document.update({
                        system: $document.system,
                     });
                  }}
               >
                  <div class="button-content">
                     <div class="label">
                        {localize("addAttackDescription")}
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
            &:not(:first-child) {
               margin-top: 0.5rem;
            }

            &.expanded {
               height: 100%;
            }

            .header {
               @include flex-row;
               @include flex-group-left;
               width: 100%;

               .label {
                  @include flex-row;
                  @include flex-group-left;
                  width: 100%;
               }

               .toggle-expanded-button {
                  @include flex-row;
                  @include flex-group-center;
                  margin-left: 0.5rem;
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
