<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import SpellSheetAddCustomAspectButton from "./SpellSheetAddCustomAspectButton.svelte";
   import SpellSheetCustomAspectSettings from "./SpellSheetCustomAspectSettings.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

   // Filter for the aspects to display
   let filter = "";
   let filteredAspects = [];
   $: {
      filteredAspects = [];
      $document.system.customAspect.forEach((aspect, idx) => {
         if (aspect.label.toLowerCase().indexOf(filter.toLowerCase()) !== -1) {
            filteredAspects.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if $document.system.customAspect && $document.system.customAspect.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter />
      </div>
   {/if}

   <!--Scrolling Aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.customAspect}>
         <ol>
            <!--Each Aspect-->
            {#each filteredAspects as idx ($document.system.customAspect[idx].uuid)}
               <li transition:slide|local>
                  <SpellSheetCustomAspectSettings {idx} />
               </li>
            {/each}
         </ol>

         <div class="add-custom-aspect-button">
            <SpellSheetAddCustomAspectButton />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            @include flex-group-top;
            @include z-index-app;
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

            li {
               width: 100%;
               margin-top: 0.5rem;
            }
         }

         .add-custom-aspect-button {
            margin-top: 0.5rem;
         }
      }
   }
</style>
