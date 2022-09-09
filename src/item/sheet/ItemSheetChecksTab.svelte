<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetCheckSettings from "~/item/sheet/ItemSheetCheckSettings.svelte";
   import ItemSheetAddCheckButton from "~/item/sheet/ItemSheetAddCheckButton.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application staore reference
   const appState = getContext("ApplicationStateStore");

   // Initialize expanded object
   for (const idx of $document.system.check.keys()) {
      $appState.isExpanded.checks[idx] = $appState.isExpanded.checks[idx] ?? true;
   }

   // Filter for the Checks to display
   let filter = "";
   let filteredChecks = [];
   $: {
      filteredChecks = [];
      $document.system.check.forEach((aspect, idx) => {
         if (aspect.label.toLowerCase().indexOf(filter.toLowerCase()) !== -1) {
            filteredChecks.push(idx);
         }
      });
   }
</script>

<div class="checks-tab">
   <!--Filter-->
   <TopFilter bind:filter />
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.checks}>
         <div class="checks-tab">
            <!--Checks List-->
            <ol>
               <!--Each Check-->
               {#each $document.system.check as check, idx}
                  <li in:slide|local>
                     <ItemSheetCheckSettings {idx} />
                  </li>
               {/each}
            </ol>
            <div class="add-check-button">
               <ItemSheetAddCheckButton />
            </div>
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .checks-tab {
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
            width: 100%;
            list-style: none;
            padding: 0;
            margin: 0;

            li {
               width: 100%;

               &:not(:first-child) {
                  margin-top: 0.5rem;
               }
            }
         }

         .add-check-button {
            margin-top: 0.5rem;
            width: 100%;
         }
      }
   }
</style>
