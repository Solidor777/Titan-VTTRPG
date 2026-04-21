<script>
   import { slide } from 'svelte/transition';
   import CharacterSheetItemImage
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemImage.svelte';
   import CharacterSheetItemExpandButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte';

   /** @type {TitanItem} Reference to the Item document. */
   export let item = void 0;

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;
</script>

<div class="item">
   <!--Header-->
   <div class="header">
      <div class="label">
         <!--Image-->
         <div class="image">
            <CharacterSheetItemImage {item}/>
         </div>

         <!--Expand button-->
         <div class="button">
            <CharacterSheetItemExpandButton bind:isExpanded {item}/>
         </div>
      </div>

      <!--Controls-->
      <div class="controls">
         <slot name="controls"/>
      </div>
   </div>

   <!--Expandable content-->
   {#if isExpanded === true}
      <div class="expandable-content" transition:slide|local>
         <slot/>
      </div>
   {/if}
</div>

<style lang="scss">
   .item {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-space-between;
         @include border-top-bottom-right;
         @include panel-1;
         @include padding-large;

         width: 100%;
         font-weight: bold;

         .label {
            @include flex-row;
            @include flex-group-center;

            .button {
               margin-left: var(--titan-spacing-standard);
            }
         }

         .controls {
            @include flex-row;
            @include flex-group-right;

            height: 100%;

            :global(.button:not(:first-child)) {
               margin-left: var(--titan-spacing-standard);
            }
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;
         @include border-bottom-sides;

         width: calc(100% - 16px);
         padding: 0 var(--titan-spacing-standard);

         :global(.section) {
            width: 100%;
         }

         :global(.section:not(.rich-text)) {
            padding-bottom: var(--titan-spacing-large);
         }

         :global(.section:not(.rich-text):not(.tags)) {
            padding-top: var(--titan-spacing-large);
         }

         :global(.section:not(:first-child)) {
            @include border-top;
         }

         :global(.section.tags) {
            @include flex-row;
            @include flex-group-center;

            flex-wrap: wrap;
         }

         :global(.section.tags .tag) {
            @include tag-container-child-margin;
         }

         :global(.section:not(.tags):not(.buttons)) {
            @include flex-column;
            @include flex-group-top;
         }

         :global(.section.buttons) {
            @include flex-row;
            @include flex-group-center;
         }

         :global(.section.buttons .button:not(:first-child)) {
            margin-left: var(--titan-spacing-standard);
         }

         :global(.section.small-text) {
            @include font-size-small;
         }
      }
   }
</style>
