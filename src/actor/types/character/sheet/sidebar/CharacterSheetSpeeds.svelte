<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import CharacterSheetSpeed from "~/actor/types/character/sheet/sidebar/CharacterSheetSpeed.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<!--Speeds-->
<div class="speeds">
   <div class="label">
      <div class="name">{localize("speed")}</div>
      <div class="base">{localize("base")}</div>
      <div class="mod">{localize("mod")}</div>
   </div>
   {#each Object.entries($document.system.speed) as [key]}
      <div class="speed">
         <CharacterSheetSpeed bind:key />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .speeds {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      margin-top: 0.5rem;

      .label {
         @include flex-row;
         @include flex-group-left;
         @include font-size-normal;
         font-weight: bold;
         width: 100%;

         .name {
            @include flex-row;
            text-align: left;
            width: 5rem;
         }
         .base {
            margin-left: 0.325rem;
            width: 2.5rem;
         }

         .mod {
            width: 2.5rem;
            margin-left: 0.875rem;
         }
      }

      .speed {
         width: 100%;
         margin-top: 0.25rem;

         &:not(:last-child) {
            @include border-bottom;
            padding-bottom: 0.25rem;
         }
      }
   }
</style>
