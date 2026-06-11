<script>
   import { slide } from 'svelte/transition';
   import CharacterSheetItemImage
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemImage.svelte';
   import CharacterSheetItemExpandButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte';

   /**
    * @typedef {object} CharacterSheetItemProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    * @property {import('svelte').Snippet} [controls] Controls content rendered in the header controls area.
    * @property {import('svelte').Snippet} [children] Expandable content rendered when the item is expanded.
    */

   /** @type {CharacterSheetItemProps} */
   let { isExpanded = $bindable(undefined), controls, children } = $props();
</script>

<div class="item">
   <!--Header-->
   <div class="header">
      <div class="label">
         <!--Image-->
         <div class="image">
            <CharacterSheetItemImage/>
         </div>

         <!--Expand button-->
         <div class="button">
            <CharacterSheetItemExpandButton bind:isExpanded/>
         </div>
      </div>

      <!--Controls-->
      <div class="controls">
         {@render controls?.()}
      </div>
   </div>

   <!--Expandable content-->
   {#if isExpanded === true}
      <div class="expandable-content" transition:slide|local>
         {@render children?.()}
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
         @include panel-1;
         @include padding-large;

         border-radius: var(--titan-border-radius);
         width: 100%;
         font-weight: bold;

         .label {
            @include flex-row;
            @include flex-group-center;

            .button {
               @include margin-left-standard;
            }
         }

         .controls {
            @include flex-row;
            @include flex-group-right;

            height: 100%;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;

         border-radius: 0 0 var(--titan-border-radius) var(--titan-border-radius);
         width: calc(100% - 2 * var(--titan-spacing-standard));
         padding: 0 var(--titan-spacing-standard) var(--titan-spacing-standard);
      }
   }
</style>
