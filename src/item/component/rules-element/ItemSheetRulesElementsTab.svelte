<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import ItemSheetFlatModifierSettings from "./ItemSheetFlatModifierSettings.svelte";
   import ItemSheetDoubleStatSettings from "./ItemSheetDoubleStatSettings.svelte";

   // Setup context variables
   const application = getContext("external").application;
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

   const operationOptions = [
      {
         label: localize("flatModifier"),
         value: "flatModifier",
      },
      {
         label: localize("doubleStat"),
         value: "doubleStat",
      },
   ];

   function selectComponent(operation) {
      const elementComponents = {
         flatModifier: ItemSheetFlatModifierSettings,
         doubleStat: ItemSheetDoubleStatSettings,
      };

      return elementComponents[operation];
   }
</script>

<div class="tab">
   {#if $document.system.rulesElement.length > 0}
      <!--Filter-->
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter={$appState.filter.rulesElements} />
      </div>
   {/if}

   <!--Scrolling Content-->
   <ScrollingContainer>
      <!--Rules Element List-->
      {#if $document.system.rulesElement.length > 0}
         <ol transition:slide|local>
            <!--Each Element-->
            {#each $document.system.rulesElement as element, idx (element.uuid)}
               <li transition:slide|local>
                  <svelte:component
                     this={selectComponent($document.system.rulesElement[idx].operation)}
                     {idx}
                     {operationOptions}
                  />
               </li>
            {/each}
         </ol>
      {/if}

      <!--Add Element Button-->
      <div class="add-entry-button">
         <EfxButton
            on:click={() => {
               application.addRulesElement();
            }}
         >
            <!--Button Content-->
            <div class="button-content">
               <!--Icon-->
               <i class="fas fa-circle-plus" />

               <!--Label-->
               <div class="label">
                  {localize("addRulesElement")}
               </div>
            </div>
         </EfxButton>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }

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
               margin-right: 0.25rem;
            }
         }
      }
   }
</style>
