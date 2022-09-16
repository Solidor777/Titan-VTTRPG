<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ItemSheetAddRulesElementButton from "./ItemSheetAddRulesElementButton.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
   console.log($document.system.rulesElement);

   // Setup tabs
</script>

<div class="tab">
   <!--Rules Element List-->
   {#if $document.system.rulesElement.length > 0}
      <ol class="elements">
         <!--Each Element-->
         {#each $document.system.rulesElement as element, idx}
            <li class="element">
               <!--Element Operation-->
               {localize(element.operation)}
            </li>
         {/each}
      </ol>
   {/if}

   <div class="add-element-button">
      <ItemSheetAddRulesElementButton />
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .elements {
         @include flex-column;
         @include flex-group-top;
         @include list;
         width: 100%;

         .element {
            @include flex-column;
            @include flex-group-top;
            @include border;
            width: 100%;
            padding: 0.5rem;
            background-color: var(--label-background-color);

            &:not(:first-child) {
               margin-top: 0.5rem;
            }
         }
      }

      .add-element-button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
