<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import CharacterSheetItemList from "~/actor/types/character/sheet/items/CharacterSheetItemList.svelte";
   import CharacterSheetWeaponActions from "~/actor/types/character/sheet/items/weapon/CharacterSheetWeaponActions.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="inventory-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.actions} />

   <!--Scrolling Containers-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.actions}>
      <div class="scrolling-content">
         <!--Weapons-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("weapons")}
            </div>

            <!--Weapon List-->
            <CharacterSheetItemList
               itemComponent={CharacterSheetWeaponActions}
               filterFunction={(item) => {
                  return item.type === "weapon" && item.system.equipped === true;
               }}
               filter={$appState.filter.actions}
               isExpandedMap={$appState.isExpanded.actions}
               isExpandedDefault={true}
            />
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";
   .inventory-tab {
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
            margin-top: 0.5rem;

            .category-header {
               @include flex-row;
               @include flex-group-center;
               font-weight: bold;
               @include font-size-normal;
               margin-bottom: 0.25rem;
            }
         }
      }
   }
</style>
