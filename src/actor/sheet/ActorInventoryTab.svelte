<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import EfxButton from "../../helpers/svelte-components/EfxButton.svelte";

   // Actor reference
   const document = getContext("DocumentSheetObject");

   // Items
   $: items = $document.items;

   // Weapons
   $: weapons = items.filter((item) => item.type === "weapon");

   function editItem(id) {
      const item = items.get(id);
      item.sheet.render(true);
      return;
   }

   function deleteItem(id) {
      $document.deleteItem(id);
      return;
   }

   function addItem(type) {
      let itemData = {
         name: localize(`LOCAL.new.${type}.label`),
         type: type,
      };

      $document.createEmbeddedDocuments("Item", [itemData]);

      return;
   }
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
                     <!--Header-->
                     <div class="item-header">
                        <!--Name-->
                        <div class="item-name">
                           <EfxButton efx={ripple}>
                              {weapon.name}
                              <i class="fas fa-angle-double-down" />
                           </EfxButton>
                        </div>
                        <!--Controls-->
                        <div class="item-controls">
                           <!--Edit Button-->
                           <div class="button">
                              <IconButton
                                 icon={"fas fa-pen-to-square"}
                                 on:click={() => {
                                    editItem(weapon._id);
                                 }}
                              />
                           </div>

                           <!--Delete Button-->
                           <div class="button">
                              <IconButton
                                 icon={"fas fa-trash"}
                                 on:click={() => {
                                    deleteItem(weapon._id);
                                 }}
                              />
                           </div>
                        </div>
                     </div>
                  </li>
               {/each}
            </ol>
            <div class="add-entry-button">
               <EfxButton
                  on:click={() => {
                     addItem("weapon");
                  }}><i class="fas fa-plus" /></EfxButton
               >
            </div>
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
            @include border;
            width: 100%;
            padding: 0.26rem;

            .category-header {
               @include flex-row;
               @include flex-group-center;
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

                  &:not(:first-child) {
                     margin-top: 0.5rem;
                  }

                  .item-header {
                     @include flex-row;
                     @include flex-space-between;
                     width: 100%;
                     font-size: 1rem;
                     font-weight: bold;

                     .item-name {
                        @include flex-row;
                        @include flex-group-left;
                        width: 15rem;

                        .fas {
                           margin-left: 0.5rem;
                        }
                     }

                     .item-controls {
                        @include flex-row;
                        @include flex-group-right;
                        height: 100%;

                        .button {
                           &:not(:first-child) {
                              margin-left: 0.5rem;
                           }
                        }
                     }
                  }
               }
            }

            .add-entry-button {
               width: 100%;
            }
         }
      }
   }
</style>
