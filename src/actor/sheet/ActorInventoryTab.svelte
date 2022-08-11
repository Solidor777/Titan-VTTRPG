<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import ActorWeaponSheet from "./ActorWeaponSheet.svelte";

   // Actor reference
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Items
   $: items = $document.items;

   // Weapons
   $: weapons = items
      .filter((item) => item.type === "weapon")
      .sort((a, b) => {
         if (a.sort < b.sort) {
            return -1;
         }
         if (a.sort > b.sort) {
            return 1;
         }
         return 0;
      });

   // Drag hover state
   let dragHovered = "none";
   let dragHovering = "none";

   // Drag start item
   function dragItemStart(event, id) {
      const item = $document.items.get(id);
      const dragData = item.toDragData();

      if (!dragData) {
         return;
      }

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

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
               {#each weapons as weapon, key}
                  <li
                     class="weapon{dragHovered === weapon._id ? ' drag-hovered' : ''}"
                     data-item-id={weapon._id}
                     draggable={true}
                     on:dragstart={() => {
                        dragHovered = weapon._id;
                        dragHovering = "weapon";
                        dragItemStart(event, weapon._id);
                     }}
                     on:dragenter={(event) => {
                        if (dragHovering === "weapon") {
                           dragHovered = weapon._id;
                        }
                     }}
                     on:dragend={() => {
                        dragHovered = "none";
                        dragHovering = "none";
                     }}
                  >
                     <ActorWeaponSheet bind:id={weapon._id} />
                  </li>
               {/each}
            </ol>
            <div class="add-entry-button">
               <EfxButton on:click={application.addItem.bind(application, "weapon")}
                  ><i class="fas fa-circle-plus" />
               </EfxButton>
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

                  &.drag-hovered {
                     background: var(--highlight-background-color);
                  }

                  &:not(:first-child) {
                     margin-top: 0.5rem;
                  }
               }
            }

            .add-entry-button {
               @include flex-row;

               width: 100%;

               .fas {
                  padding: 0.25rem;
               }
            }
         }
      }
   }
</style>
