<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TextInput from "~/helpers/svelte-components/input/TextInput.svelte";
   import CharacterSheetItemList from "~/actor/types/character/sheet/items/CharacterSheetItemList.svelte";
   import CharacterSheetItemAddEntryButton from "~/actor/types/character/sheet/items/CharacterSheetItemAddEntryButton.svelte";
   import CharacterSheetEffect from "~/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
   const application = getContext("external").application;
</script>

<div class="tab">
   <!--Header-->
   <div class="header">
      <!--Label-->
      <div class="label">
         {localize("filter")}
      </div>

      <!--Input-->
      <div class="input">
         <TextInput bind:value={$appState.filter.abilities} />
      </div>

      <!--Add Item Button-->
      <div>
         <CharacterSheetItemAddEntryButton
            label={localize("addNewEffect")}
            on:click={() => {
               application.addItem("effect");
            }}
         />
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities List-->
         <div class="list">
            <CharacterSheetItemList
               itemComponent={CharacterSheetEffect}
               filterFunction={(item) => {
                  return item.type === "effect";
               }}
               filter={$appState.filter.abilities}
               isExpandedMap={$appState.isExpanded.abilities}
            />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         @include panel-1;
         width: 100%;

         .label {
            font-weight: bold;
            margin-right: 0.25rem;
         }

         .input {
            @include flex-group-left;
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         .list {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin-top: 0.5rem;
         }
      }
   }
</style>
