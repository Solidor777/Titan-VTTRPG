<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import TextInput from "~/helpers/svelte-components/TextInput.svelte";

   // Actor reference
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Initialize expanded object
   $document.items
      .filter((item) => item.type === "spell")
      .forEach((item) => {
         application.isExpanded.spells[item._id] = application.isExpanded.spells[item._id] ?? false;
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

   // Filter spells
   let filter = "";
   $: spells = $document.items
      .filter((item) => item.type === "spell" && item.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1)
      .sort((a, b) => {
         if (a.sort < b.sort) {
            return -1;
         }
         if (a.sort > b.sort) {
            return 1;
         }
         return 0;
      });
</script>

<div class="spell-tab">
   <!--Filter-->
   <div class="spell-filter">
      <div class="spell-filter-label">{localize("LOCAL.filter.label")}</div>
      <div class="spell-filter-input"><TextInput bind:value={filter} /></div>
   </div>

   <!--Scrolling Container-->
   <div class="scrolling-content">
      <ScrollingContainer>
         <!--Spell List-->
         <ol>
            <!--Each Spell-->
            {#each spells as spell}
               <li
                  class="spell{dragHovered === spell._id ? ' drag-hovered' : ''}"
                  data-item-id={spell._id}
                  draggable={true}
                  on:dragstart={(event) => {
                     dragHovered = spell._id;
                     dragHovering = "spell";
                     dragItemStart(event, spell._id);
                  }}
                  on:dragenter={() => {
                     if (dragHovering === "spell") {
                        dragHovered = spell._id;
                     }
                  }}
                  on:dragend={() => {
                     dragHovered = "";
                     dragHovering = "";
                  }}
                  transition:slide|local
               />
            {/each}
         </ol>
         <div class="add-entry-button">
            <EfxButton on:click={application.addItem.bind(application, "spell")}
               ><i class="fas fa-circle-plus" />
            </EfxButton>
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .spell-tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .spell-filter {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         width: 100%;
         font-size: 1rem;
         font-weight: bold;
         padding: 0.25rem;

         .spell-filter-input {
            font-size: 1rem;
            margin-left: 0.5rem;
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

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
</style>
