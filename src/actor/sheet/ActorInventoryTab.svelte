<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";

   // Actor reference
   const document = getContext("DocumentSheetObject");

   // Items
   const items = $document.items;

   // Weapons
   const weapons = items.filter((item) => item.type === "weapon");
</script>

<div class="inventory-tab">
   <!--Scrolling Containers-->
   <ScrollingContainer>
      <div class="scrolling-content">
         <!--Weapons-->
         <div class="category">
            <!--List Header-->
            <div class="category-header">
               {localize("LOCAL.weapons.label")}
            </div>
            <!--Weapon List-->
            <ol>
               <!--Each Weapon-->
               {#each weapons as weapon}
                  <li class="weapon">
                     <div class="item-header">
                        {weapon.name}
                     </div>
                  </li>
               {/each}
            </ol>
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
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
            width: 100%;

            .category-header {
               @include flex-row;
               margin-left: 1rem;
               width: 100%;
               font-weight: bold;
               font-size: 1rem;
            }

            ol {
               @include flex-column;
               @include flex-group-top;
               width: 100%;
               margin: 0, 0, 0, 0.5rem;
               padding: 0;
               list-style: none;

               li {
                  @include flex-row;
                  @include flex-space-between;
                  @include border;
                  width: 100%;
                  padding: 0.5rem;

                  :not(:first-child) {
                     margin-top: 0.5rem;
                  }

                  .item-header {
                     @include flex-row;
                     font-size: 1rem;
                     font-weight: bold;
                  }
               }
            }
         }
      }
   }
</style>
