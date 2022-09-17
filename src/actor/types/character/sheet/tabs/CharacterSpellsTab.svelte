<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSpell from "../items/spell/CharacterSpell.svelte";
   import CharacterItemList from "../items/CharacterItemList.svelte";
   import CharacterItemAddEntryButton from "../items/CharacterItemAddEntryButton.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="spells-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.spells} />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.spells}>
         <!--Spells-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("spells")}
            </div>

            <!--Spell List-->
            <CharacterItemList
               itemComponent={CharacterSpell}
               filterFunction={(item) => {
                  return item.type === "spell";
               }}
               filter={$appState.filter.spells}
               isExpandedMap={$appState.isExpanded.spells}
            />

            <!--Add Spell Button-->
            <CharacterItemAddEntryButton itemType={"spell"} />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .spells-tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         .category {
            @include flex-column;
            @include flex-group-top;
            @include border;
            width: 100%;
            padding: 0.26rem;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }

            .category-header {
               @include flex-row;
               @include flex-group-center;
               font-weight: bold;
               font-size: 1rem;
            }
         }
      }
   }
</style>
