<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import ItemSheetCheckSettings from "./ItemSheetCheckSettings.svelte";

   // Setup context variables
   const application = getContext("external").application;
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

   // Initialize expanded state
   $document.system.check.forEach((entry, idx) => {
      $appState.isExpanded.checks[idx] = $appState.isExpanded.checks[idx] ?? true;
   });

   // Initialize filter
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      $document.system.check.forEach((entry, idx) => {
         if (entry.label.toLowerCase().indexOf($appState.filter.checks.toLowerCase()) !== -1) {
            filteredEntries.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if $document.system.check.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter={$appState.filter.checks} />
      </div>
   {/if}

   <!--Scroling Content-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.checks}>
      <div class="scrolling-content">
         <!--checks List-->
         {#if $document.system.check.length > 0}
            <ol transition:slide|local>
               <!--Each check-->
               {#each filteredEntries as idx ($document.system.check[idx].uuid)}
                  <li transition:slide|local>
                     <ItemSheetCheckSettings {idx} />
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add check Button-->
         <div class="add-entry-button">
            <EfxButton
               on:click={() => {
                  application.addCheck();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Label-->
                  <div class="label">
                     {localize("addCheck")}
                  </div>

                  <!--Icon-->
                  <i class="fas fa-circle-plus" />
               </div>
            </EfxButton>
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-2;
         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            @include flex-group-top;
            @include list;
            @include z-index-app;
            width: 100%;

            li {
               @include flex-row;
               @include flex-group-center;
               @include z-index-app;
               width: 100%;
               margin-top: 0.5rem;
            }
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-left: 0.25rem;
               }
            }
         }
      }
   }
</style>
