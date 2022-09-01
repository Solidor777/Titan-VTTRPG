<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import ActorInventoryWeapon from "./items/ActorInventoryWeapon.svelte";
   import ActorInventoryArmor from "./items/ActorInventoryArmor.svelte";
   import TextInput from "~/helpers/svelte-components/TextInput.svelte";
   import ActorItemList from "./ActorItemList.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import ActorAddItemEntryButton from "./ActorAddItemEntryButton.svelte";

   // Actor reference
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Filter Items
   let filter = "";

   // Initialize expanded object
   $document.items.forEach((item) => {
      application.isExpanded.inventory[item._id] = application.isExpanded.inventory[item._id] ?? false;
   });
</script>

<div class="inventory-tab">
   <!--Filter-->
   <TopFilter bind:filter />

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer>
         <!--Weapons-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("LOCAL.weapons.label")}
            </div>

            <!--Weapon List-->
            <ActorItemList
               itemComponent={ActorInventoryWeapon}
               filterFunction={(item) => {
                  return item.type === "weapon";
               }}
               {filter}
               isExpandedMap={application.isExpanded.inventory}
            />

            <!--Add Weapon Button-->
            <ActorAddItemEntryButton itemType={"weapon"} />
         </div>

         <!--Armor-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("LOCAL.armor.label")}
            </div>

            <!--Armor list-->
            <ActorItemList
               itemComponent={ActorInventoryArmor}
               filterFunction={(item) => {
                  return item.type === "armor";
               }}
               {filter}
               isExpandedMap={application.isExpanded.inventory}
            />

            <!--Add Armor Button-->
            <ActorAddItemEntryButton itemType={"weapon"} />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .inventory-tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .inventory-filter {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         width: 100%;
         font-size: 1rem;
         font-weight: bold;
         padding: 0.25rem;

         .inventory-filter-input {
            font-size: 1rem;
            margin-left: 0.5rem;
         }
      }

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
