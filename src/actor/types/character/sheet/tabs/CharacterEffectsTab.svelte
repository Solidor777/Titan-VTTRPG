<script>
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSheetItemList from "../items/CharacterSheetItemList.svelte";
   import CharacterSheetItemAddEntryButton from "../items/CharacterSheetItemAddEntryButton.svelte";
   import CharacterEffect from "../items/effect/CharacterEffect.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="effects-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.abilities} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities List-->
         <div class="effects">
            <CharacterSheetItemList
               itemComponent={CharacterEffect}
               filterFunction={(item) => {
                  return item.type === "effect";
               }}
               filter={$appState.filter.abilities}
               isExpandedMap={$appState.isExpanded.abilities}
            />
         </div>

         <!--Add Spell Button-->
         <div class="add-entry-button">
            <CharacterSheetItemAddEntryButton itemType={"effect"} />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .effects-tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;
         padding-left: 0.25rem;

         .effects {
            margin-top: 0.5rem;
         }

         .add-entry-button {
            margin-top: 0.5rem;
         }
      }
   }
</style>
