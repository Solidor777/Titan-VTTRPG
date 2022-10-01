<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import CharacterSheetAttribute from "~/actor/types/character/sheet/header/CharacterSheetAttribute.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<!--Attributes-->
<div class="attributes">
   <div class="label">
      <div class="name">{localize("attribute")}</div>
      <div class="base">{localize("base")}</div>
      <div class="mod">{localize("mod")}</div>
   </div>
   {#each Object.entries($document.system.attribute) as [key]}
      <div class="attribute">
         <CharacterSheetAttribute bind:key />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .attributes {
      @include flex-column;
      height: 100%;

      .label {
         @include font-size-normal;
         @include flex-row;
         font-weight: bold;
         width: 100%;

         .name {
            @include flex-row;
            @include flex-group-center;
            width: 5.5rem;
            margin-left: 0.5rem;
         }
         .base {
            margin-left: 0.25rem;
            width: 2.5rem;
         }

         .mod {
            width: 2.5rem;
            margin-left: 0.75rem;
         }
      }

      .attribute {
         height: 100%;
         &:not(:first-child) {
            margin-top: 0.25rem;
         }

         &:not(:last-child) {
            @include border-bottom;
            padding-bottom: 0.25rem;
         }
      }
   }
</style>
