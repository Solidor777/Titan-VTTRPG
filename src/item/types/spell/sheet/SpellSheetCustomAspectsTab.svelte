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

<div class="custom-aspects-tab">
   <!--Filter-->
   <TopFilter bind:filter />

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

   .custom-aspects-tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

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

               &:not(:first-child) {
                  margin-top: 0.5rem;
               }
            }
         }

         .add-custom-aspect-button {
            margin-top: 0.5rem;
         }
      }
   }
</style>
