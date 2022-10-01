<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import CharacterSheetResistance from "~/actor/types/character/sheet/header/CharacterSheetResistance.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="resistances">
   <div class="label">
      <div class="name">{localize("resistance")}</div>
      <div class="base">{localize("base")}</div>
      <div class="mod">{localize("mod")}</div>
   </div>
   {#each Object.entries($document.system.resistance) as [key]}
      <div class="resistance">
         <CharacterSheetResistance bind:key />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .resistances {
      @include flex-column;
      @include flex-group-top;

      .label {
         @include flex-row;
         @include font-size-normal;
         font-weight: bold;
         width: 100%;

         .name {
            @include flex-row;
            @include flex-group-center;
            width: 5.5rem;
            margin-left: 0.325rem;
         }

         .base {
            margin-left: 0.25rem;
            width: 2.5rem;
         }

         .mod {
            width: 2.5rem;
            margin-left: 0.325rem;
         }
      }

      .resistance {
         width: 100%;
         margin-top: 0.25rem;

         &:not(:last-child) {
            @include border-bottom;
            padding-bottom: 0.25rem;
         }
      }
   }
</style>
