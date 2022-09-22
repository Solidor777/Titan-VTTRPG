<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ItemSheetAddRulesElementButton from "./ItemSheetAddRulesElementButton.svelte";
   import ItemSheetFlatModifierSettings from "./ItemSheetFlatModifierSettings.svelte";
   import ItemSheetSenseSettings from "./ItemSheetSenseSettings.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");

   const operationOptions = [
      {
         label: localize("flatModifier"),
         value: "flatModifier",
      },
      {
         label: localize("sense"),
         value: "sense",
      },
   ];

   function selectComponent(operation) {
      const elementComponents = {
         flatModifier: ItemSheetFlatModifierSettings,
         sense: ItemSheetSenseSettings,
      };

      return elementComponents[operation];
   }

   // Setup tabs
</script>

<div class="tab">
   <!--Rules Element List-->
   {#if $document.system.rulesElement.length > 0}
      <ol>
         <!--Each Element-->
         {#each $document.system.rulesElement as element, idx}
            <li>
               <svelte:component
                  this={selectComponent($document.system.rulesElement[idx].operation)}
                  {idx}
                  {operationOptions}
               />
            </li>
         {/each}
      </ol>
   {/if}

   <div class="add-element-button">
      <ItemSheetAddRulesElementButton />
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";
   .tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      ol {
         @include flex-column;
         @include flex-group-top;
         @include list;
         width: 100%;

         li {
            @include flex-column;
            @include flex-group-top;
            width: 100%;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }
         }
      }

      .add-element-button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
