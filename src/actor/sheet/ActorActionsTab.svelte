<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import ActorActionsWeapon from "./items/ActorActionsWeapon.svelte";
   import TextInput from "~/helpers/svelte-components/TextInput.svelte";

   // Actor reference
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Items
   $: items = $document.items;

   // Filter
   let inventoryFilter = "";

   // Weapons
   $: weapons = items
      .filter(
         (item) =>
            item.type === "weapon" &&
            item.name.toLowerCase().indexOf(inventoryFilter.toLowerCase()) !== -1 &&
            item.system.equipped === true
      )
      .sort((a, b) => {
         if (a.sort < b.sort) {
            return -1;
         }
         if (a.sort > b.sort) {
            return 1;
         }
         return 0;
      });

   // Initialize expanded object
   // Weapons
   $document.items
      .filter((item) => item.type === "weapon")
      .forEach((item) => {
         application.isExpanded.actions.items[item._id] = application.isExpanded.actions.items[item._id] ?? true;
      });

   // Drag hover state
   let dragHovered = "";
   let dragHovering = "";

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
   <!--Filter-->
   <div class="inventory-filter">
      <div class="inventory-filter-label">{localize("LOCAL.filter.label")}</div>
      <div class="inventory-filter-input"><TextInput bind:value={inventoryFilter} /></div>
   </div>
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
                  <li
                     class="weapon{dragHovered === weapon._id ? ' drag-hovered' : ''}"
                     data-item-id={weapon._id}
                     draggable={true}
                     on:dragstart={(event) => {
                        dragHovered = weapon._id;
                        dragHovering = "weapon";
                        dragItemStart(event, weapon._id);
                     }}
                     on:dragenter={() => {
                        if (dragHovering === "weapon") {
                           dragHovered = weapon._id;
                        }
                     }}
                     on:dragend={() => {
                        dragHovered = "";
                        dragHovering = "";
                     }}
                     transition:slide|local
                  >
                     <ActorActionsWeapon
                        bind:id={weapon._id}
                        bind:isExpanded={application.isExpanded.actions.items[weapon._id]}
                     />
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

      .inventory-filter {
         @include flex-row;
         @include flex-group-center;
         font-size: 1rem;
         font-weight: bold;
         margin-top: 0.5rem;

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
         margin-top: 0.5rem;

         .category {
            @include flex-column;
            @include flex-group-top;
            @include border;
            width: 100%;
            padding: 0.26rem;

            .category-header {
               @include flex-row;
               @include flex-group-center;
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
         }
      }
   }
</style>
